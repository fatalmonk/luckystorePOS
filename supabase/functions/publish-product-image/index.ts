import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { validateImagePublishRequest, verifyUploadedWebp } from './image_publish_contract.ts'

const allowedRoles = new Set(['owner', 'manager', 'admin', 'stock'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const allowedOrigins = [
  'https://admin.luckystore1947.com',
  'https://luckystore1947.com',
  'https://www.luckystore1947.com',
  'https://next.luckystore1947.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(Deno.env.get('ADMIN_APP_ORIGIN') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : (Deno.env.get('ADMIN_APP_ORIGIN') ?? 'https://admin.luckystore1947.com'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Only POST is allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authorization required' }, 401)

    const url = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publicImageUrl = Deno.env.get('R2_PUBLIC_BASE_URL') ?? 'https://images.luckystore1947.com'
    if (!url || !serviceRoleKey) return json({ error: 'Image publishing is not configured' }, 500)

    const admin = createClient(url, serviceRoleKey)
    const { data: auth, error: authError } = await admin.auth.getUser(authorization.slice(7))
    if (authError || !auth.user) return json({ error: 'Invalid authorization' }, 401)

    const { data: user, error: userError } = await admin
      .from('users').select('id, tenant_id, store_id, role').eq('auth_id', auth.user.id).maybeSingle()
    if (userError) throw userError
    if (!user || !allowedRoles.has(String(user.role))) return json({ error: 'Image publish not authorized' }, 403)

    const body = await req.json() as {
      itemId?: unknown; storeId?: unknown; sourceImageKey?: unknown; sourceImageVersion?: unknown; newImageUrl?: unknown; newImageChecksum?: unknown
    }
    const itemId = typeof body.itemId === 'string' ? body.itemId : ''
    const storeId = typeof body.storeId === 'string' ? body.storeId : ''
    const sourceImageKey = body.sourceImageKey === null || typeof body.sourceImageKey === 'string' ? body.sourceImageKey : undefined
    const sourceImageVersion = typeof body.sourceImageVersion === 'number' ? body.sourceImageVersion : NaN
    const newImageUrl = body.newImageUrl === null ? null : typeof body.newImageUrl === 'string' ? body.newImageUrl : ''
    const newImageChecksum = typeof body.newImageChecksum === 'string' ? body.newImageChecksum : null
    const requestError = validateImagePublishRequest({
      itemId,
      tenantId: user.tenant_id,
      actorStoreId: user.store_id,
      storeId,
      sourceImageKey: sourceImageKey ?? null,
      sourceImageVersion,
      newImageUrl,
      newImageChecksum,
      publicBaseUrl: publicImageUrl,
    });
    if (sourceImageKey === undefined || requestError) return json({ error: requestError ?? 'Invalid source image key' }, 400)
    const { data: store, error: storeError } = await admin.from('stores').select('id')
      .eq('id', storeId).eq('tenant_id', user.tenant_id).maybeSingle()
    if (storeError) throw storeError
    if (!store) return json({ error: 'Store is outside the authenticated tenant' }, 403)

    let newImageKey: string | null = null
    if (newImageUrl !== null) {
      newImageKey = new URL(newImageUrl).pathname.slice(1)
      const uploaded = await fetch(newImageUrl, { redirect: 'error' })
      if (!uploaded.ok) return json({ error: 'Uploaded image is not available from the configured image host' }, 422)
      const actualUrl = new URL(uploaded.url || newImageUrl)
      if (actualUrl.origin !== new URL(publicImageUrl).origin) return json({ error: 'Uploaded image resolved outside the configured image host' }, 422)
      const declaredLength = Number(uploaded.headers.get('content-length'))
      if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) return json({ error: 'Uploaded image exceeds 10 MiB' }, 422)
      const reader = uploaded.body?.getReader()
      if (!reader) return json({ error: 'Uploaded image response had no body' }, 422)
      const chunks: Uint8Array[] = []
      let totalBytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        totalBytes += value.byteLength
        if (totalBytes > MAX_IMAGE_BYTES) {
          await reader.cancel()
          return json({ error: 'Uploaded image exceeds 10 MiB' }, 422)
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(totalBytes)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      const uploadError = await verifyUploadedWebp(uploaded.headers.get('content-type'), bytes, newImageChecksum ?? '')
      if (uploadError) return json({ error: uploadError }, 422)
    }

    const { data: published, error: publishError } = await admin.rpc('publish_item_image_if_current', {
      p_item_id: itemId,
      p_tenant_id: user.tenant_id,
      p_store_id: storeId,
      p_source_image_key: sourceImageKey ?? null,
      p_source_image_version: sourceImageVersion,
      p_new_image_key: newImageKey,
      p_new_image_url: newImageUrl,
      p_new_image_checksum: newImageChecksum,
    })
    if (publishError) throw publishError
    if (!published) return json({ error: 'Image changed while upload was in progress', code: 'IMAGE_VERSION_CONFLICT' }, 409)
    if (newImageKey !== null) {
      const { data: confirmed, error: confirmError } = await admin.from('items')
        .select('image_key, image_checksum').eq('id', itemId).eq('tenant_id', user.tenant_id).maybeSingle()
      if (confirmError) throw confirmError
      if (confirmed?.image_key !== newImageKey || confirmed?.image_checksum !== body.newImageChecksum) {
        return json({ error: 'Published image metadata did not match the requested tenant object' }, 409)
      }
    }
    return json({ published: true, imageKey: newImageKey })
  } catch (error) {
    console.error('publish-product-image error', error)
    return json({ error: 'Unable to publish product image' }, 500)
  }
})
