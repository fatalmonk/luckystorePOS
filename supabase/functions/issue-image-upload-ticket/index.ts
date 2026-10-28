import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { validateUploadTicketRequest } from './image_upload_ticket.ts'

const allowedRoles = new Set(['owner', 'manager', 'admin', 'stock'])
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

serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
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
    const requestError = validateUploadTicketRequest({ key, itemId, contentType, maxBytes, operation }, String(user.tenant_id), user.store_id)
    if (requestError) {
      const isScopeError = requestError.includes('scope mismatch')
      return json({ error: requestError }, isScopeError ? 403 : 400)
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
