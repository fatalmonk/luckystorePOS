import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const origin = Deno.env.get('CANVA_APP_ORIGIN')
let parsedOrigin: URL | undefined
try {
  if (origin) parsedOrigin = new URL(origin)
} catch { /* fail closed below */ }
if (!origin || !parsedOrigin || parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
  throw new Error('CANVA_APP_ORIGIN must be a configured HTTPS origin')
}
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
}

type CanvaClaims = { aud?: string; userId?: string; brandId?: string }
type ProductRow = { id: string; name: string; price: number; image_url: string | null; sku: string | null }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

async function verifyCanvaToken(token: string): Promise<CanvaClaims> {
  const appId = Deno.env.get('CANVA_APP_ID')
  if (!appId) throw new Error('Canva app is not configured')
  const jwks = createRemoteJWKSet(new URL(`https://api.canva.com/rest/v1/apps/${encodeURIComponent(appId)}/jwks`))
  const { payload } = await jwtVerify(token, jwks, { audience: appId })
  const claims = payload as CanvaClaims
  if (!claims.userId || !claims.brandId) throw new Error('Canva identity is incomplete')
  return claims
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  let markPendingAuditFailed: (() => Promise<void>) | undefined
  let facebookPublished = false
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Canva bearer token required' }, 401)
    const claims = await verifyCanvaToken(authorization.slice(7))

    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) throw new Error('Supabase configuration is missing')
    const admin = createClient(url, key)

    const { data: identity, error: identityError } = await admin
      .from('canva_social_identity_links')
      .select('user_id, tenant_id, store_id, users!inner(role, tenant_id, store_id)')
      .eq('canva_user_id', claims.userId)
      .eq('canva_brand_id', claims.brandId)
      .maybeSingle()
    if (identityError) throw identityError
    const staff = identity?.users as { role: string; tenant_id: string; store_id: string | null } | undefined
    if (!identity || !identity.store_id || !staff ||
      identity.tenant_id !== staff.tenant_id || identity.store_id !== staff.store_id ||
      !['owner', 'manager', 'admin'].includes(staff.role)) {
      return json({ error: 'Connect Canva to an authorized Lucky Store staff account first' }, 403)
    }

    if (req.method === 'GET') {
      const query = new URL(req.url).searchParams.get('query') ?? ''
      const { data, error } = await admin.rpc('canva_search_items', {
        p_tenant_id: identity.tenant_id,
        p_store_id: identity.store_id,
        p_query: query,
        p_limit: 30,
      })
      if (error) throw error
      const products = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id ?? row.item_id ?? ''),
        name: String(row.name ?? ''),
        price: Number(row.price ?? 0),
        image_url: typeof row.image_url === 'string' ? row.image_url : null,
        sku: typeof row.sku === 'string' ? row.sku : null,
      } satisfies ProductRow)).filter((product) => product.id && product.name)
      return json({ products })
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const body = await req.json() as { caption?: unknown; link?: unknown; mediaUrl?: unknown; platform?: unknown }
    if (body.platform !== 'facebook' || typeof body.caption !== 'string' || !body.caption.trim()) {
      return json({ error: 'A non-empty Facebook caption is required' }, 400)
    }
    if (body.caption.trim().length > 5000) return json({ error: 'Caption exceeds 5000 characters' }, 400)
    if (typeof body.mediaUrl !== 'string') return json({ error: 'A secure media URL is required' }, 400)
    let mediaUrl: URL
    try {
      mediaUrl = new URL(body.mediaUrl)
    } catch {
      return json({ error: 'A secure media URL is required' }, 400)
    }
    if (mediaUrl.protocol !== 'https:' || mediaUrl.username || mediaUrl.password || mediaUrl.port ||
      (mediaUrl.hostname !== 'export-download.canva.com' && !mediaUrl.hostname.endsWith('.canva.com'))) {
      return json({ error: 'Media must be a Canva export URL' }, 400)
    }
    if (body.link !== undefined && body.link !== null && (typeof body.link !== 'string' || !/^https?:\/\//.test(body.link))) {
      return json({ error: 'link must be an http(s) URL' }, 400)
    }

    const media = await fetch(mediaUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) })
    if (!media.ok) return json({ error: 'Unable to download Canva media' }, 502)
    const mediaType = media.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
    if (mediaType !== 'image/jpeg') {
      return json({ error: 'Canva export must be a JPG image' }, 400)
    }
    const contentLength = Number(media.headers.get('content-length') ?? 0)
    if (contentLength > 4_500_000) return json({ error: 'Exported image is too large' }, 400)
    const reader = media.body?.getReader()
    if (!reader) return json({ error: 'Canva export is empty' }, 400)
    const chunks: Uint8Array[] = []
    let byteLength = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > 4_500_000) {
        await reader.cancel()
        return json({ error: 'Exported image is too large' }, 400)
      }
      chunks.push(value)
    }
    if (byteLength === 0) return json({ error: 'Canva export is empty' }, 400)
    const bytes = new Uint8Array(byteLength)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN')
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID')
    if (!pageToken || !pageId) return json({ error: 'Facebook integration is not configured' }, 500)

    const { data: audit, error: auditError } = await admin.from('social_posts').insert({
      tenant_id: identity.tenant_id,
      store_id: identity.store_id,
      user_id: identity.user_id,
      platform: 'facebook',
      content: body.caption.trim(),
      link: typeof body.link === 'string' ? body.link : null,
      status: 'pending',
    }).select('id').single()
    if (auditError || !audit) throw auditError ?? new Error('Unable to create audit record')
    markPendingAuditFailed = async (message = 'Facebook publish request encountered an unknown error') => {
      const { error: statusError } = await admin.from('social_posts')
        .update({ status: 'pending', error_message: message })
        .eq('id', audit.id)
        .eq('status', 'pending')
      if (statusError) console.error('Unable to update ambiguous Facebook publish audit row', statusError)
    }

    const form = new FormData()
    form.append('source', new Blob([bytes], { type: media.headers.get('content-type') ?? 'image/jpeg' }), 'lucky-store.jpg')
    form.append('message', body.caption.trim())
    if (typeof body.link === 'string') form.append('link', body.link)
    form.append('access_token', pageToken)
    const facebook = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(pageId)}/photos`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(20000),
    })
    const result = await facebook.json() as { id?: string; post_id?: string; error?: { message?: string } }
    const postId = result.post_id ?? result.id
    if (!facebook.ok || !postId) {
      const { error: statusError } = await admin.from('social_posts')
        .update({ status: 'failed', error_message: result.error?.message ?? 'Facebook did not return a post id' })
        .eq('id', audit.id)
      if (statusError) throw statusError
      markPendingAuditFailed = undefined
      return json({ error: 'Facebook publish failed' }, 502)
    }
    facebookPublished = true
    const { error: publishStatusError } = await admin.from('social_posts')
      .update({ status: 'published', post_id: postId })
      .eq('id', audit.id)
    if (publishStatusError) {
      console.error('Facebook post published but audit status update failed', publishStatusError)
      return json({ error: 'Facebook post was published but could not be recorded. Do not retry; contact an administrator.' }, 503)
    }
    markPendingAuditFailed = undefined
    return json({ postId, externalUrl: `https://www.facebook.com/${postId}` })
  } catch (error) {
    console.error('canva-social error', error)
    if (markPendingAuditFailed && !facebookPublished) {
      try {
        const isTimeout = (error as { name?: string })?.name === 'TimeoutError' || (error as { name?: string })?.name === 'AbortError'
        const msg = isTimeout
          ? 'Facebook request timed out. Status remains pending to prevent duplicate posting.'
          : 'Network or server error communicating with Facebook. Status remains pending to prevent duplicate posting.'
        await markPendingAuditFailed(msg)
      } catch (statusError) {
        console.error('Unable to update ambiguous Facebook publish audit row', statusError)
      }
    }
    if (facebookPublished) {
      return json({ error: 'Facebook post was published but could not be recorded. Do not retry; contact an administrator.' }, 503)
    }
    const isTimeout = (error as { name?: string })?.name === 'TimeoutError' || (error as { name?: string })?.name === 'AbortError'
    if (isTimeout) {
      return json({ error: 'Facebook publish request timed out. Do not retry immediately; check Facebook to verify whether the post was published.' }, 504)
    }
    return json({ error: 'Internal server error' }, 500)
  }
})
