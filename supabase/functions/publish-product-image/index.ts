import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const allowedRoles = new Set(['owner', 'manager', 'admin', 'stock'])
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_APP_ORIGIN') ?? 'https://admin.luckystore1947.com',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
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
      itemId?: unknown; storeId?: unknown; sourceImageKey?: unknown; sourceImageVersion?: unknown; newImageUrl?: unknown
    }
    const itemId = typeof body.itemId === 'string' ? body.itemId : ''
    const storeId = typeof body.storeId === 'string' ? body.storeId : ''
    const sourceImageKey = body.sourceImageKey === null || typeof body.sourceImageKey === 'string' ? body.sourceImageKey : undefined
    const sourceImageVersion = typeof body.sourceImageVersion === 'number' ? body.sourceImageVersion : NaN
    const newImageUrl = body.newImageUrl === null ? null : typeof body.newImageUrl === 'string' ? body.newImageUrl : ''
    if (!itemId || storeId !== user.store_id || !Number.isSafeInteger(sourceImageVersion) || sourceImageVersion < 0) return json({ error: 'Invalid image publish request' }, 400)

    let newImageKey: string | null = null
    if (newImageUrl !== null) {
      const parsed = new URL(newImageUrl)
      const base = new URL(publicImageUrl)
      if (parsed.origin !== base.origin || !parsed.pathname.startsWith(`/products/${user.tenant_id}/`)) return json({ error: 'Image URL is outside the tenant image namespace' }, 400)
      newImageKey = parsed.pathname.slice(1)
    }

    const { data: published, error: publishError } = await admin.rpc('publish_item_image_if_current', {
      p_item_id: itemId,
      p_tenant_id: user.tenant_id,
      p_store_id: storeId,
      p_source_image_key: sourceImageKey ?? null,
      p_source_image_version: sourceImageVersion,
      p_new_image_key: newImageKey,
      p_new_image_url: newImageUrl,
      p_new_image_checksum: null,
    })
    if (publishError) throw publishError
    if (!published) return json({ error: 'Image changed while upload was in progress', code: 'IMAGE_VERSION_CONFLICT' }, 409)
    return json({ published: true, imageKey: newImageKey })
  } catch (error) {
    console.error('publish-product-image error', error)
    return json({ error: 'Unable to publish product image' }, 500)
  }
})
