import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const allowedRoles = new Set(['owner', 'manager', 'admin', 'stock'])
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_APP_ORIGIN') ?? 'https://admin.luckystore1947.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
}

function encode(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))))
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const signingSecret = Deno.env.get('UPLOAD_SIGNING_SECRET')
    if (!supabaseUrl || !serviceRoleKey || !signingSecret) return json({ error: 'Upload signing is not configured' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const token = authorization.slice(7)
    const { data: auth, error: authError } = await admin.auth.getUser(token)
    if (authError || !auth.user) return json({ error: 'Invalid authorization' }, 401)

    const { data: user, error: userError } = await admin
      .from('users').select('id, tenant_id, store_id, role').eq('auth_id', auth.user.id).maybeSingle()
    if (userError) throw userError
    if (!user || !allowedRoles.has(String(user.role))) return json({ error: 'Upload not authorized' }, 403)

    const body = await req.json() as { key?: unknown; itemId?: unknown; contentType?: unknown; maxBytes?: unknown; operation?: unknown }
    const key = typeof body.key === 'string' ? body.key : ''
    const itemId = typeof body.itemId === 'string' ? body.itemId : null
    const contentType = typeof body.contentType === 'string' ? body.contentType : 'image/webp'
    const maxBytes = typeof body.maxBytes === 'number' ? body.maxBytes : 10 * 1024 * 1024
    const operation = body.operation === 'delete' ? 'delete' : 'upload'
    if (!/^[-\w./]{1,512}$/.test(key) || !/^image\/(jpeg|png|webp|gif)$/.test(contentType) || maxBytes <= 0 || maxBytes > 10 * 1024 * 1024) {
      return json({ error: 'Invalid upload capability request' }, 400)
    }

    if (operation === 'delete') {
      if (!itemId) return json({ error: 'Item is required for image deletion' }, 400)
      const { data: item, error } = await admin.from('items').select('id, tenant_id, store_id, image_key').eq('id', itemId).eq('tenant_id', user.tenant_id).eq('store_id', user.store_id).maybeSingle()
      if (error) throw error
      if (!item || item.image_key !== key) return json({ error: 'Image deletion scope mismatch' }, 403)
    } else if (itemId) {
      const { data: item, error } = await admin.from('items').select('id, tenant_id').eq('id', itemId).eq('tenant_id', user.tenant_id).maybeSingle()
      if (error) throw error
      if (!item || !key.startsWith(`products/${user.tenant_id}/`)) return json({ error: 'Product upload scope mismatch' }, 403)
    } else if (!key.startsWith(`products/${user.tenant_id}/`) && !key.startsWith(`categories/${user.store_id}/`) && !key.startsWith(`${user.tenant_id}/receipt_`)) {
      return json({ error: 'Upload scope mismatch' }, 403)
    }

    const payload = JSON.stringify({ v: 1, op: operation, sub: auth.user.id, key, contentType, maxBytes, exp: Math.floor(Date.now() / 1000) + 300, nonce: crypto.randomUUID() })
    const encodedPayload = encode(payload)
    const tokenValue = `${encodedPayload}.${await sign(encodedPayload, signingSecret)}`
    return json({ token: tokenValue, expiresAt: Math.floor(Date.now() / 1000) + 300 })
  } catch (error) {
    console.error('issue-image-upload-ticket error', error)
    return json({ error: 'Unable to issue upload capability' }, 500)
  }
})
