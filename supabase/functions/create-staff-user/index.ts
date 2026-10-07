import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ROLES = new Set(['admin', 'manager', 'cashier', 'stock'])
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_APP_ORIGIN') ?? 'https://admin.luckystore1947.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

// Tenant admin creates a staff account. Tenant is always taken from the caller's own
// profile, never from the request body.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Only POST is allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authorization required' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return json({ error: 'Not configured' }, 500)

    const admin = createClient(url, key, { auth: { persistSession: false } })
    const { data: auth, error: authError } = await admin.auth.getUser(authorization.slice(7))
    if (authError || !auth.user) return json({ error: 'Invalid authorization' }, 401)

    const { data: caller, error: callerError } = await admin
      .from('users').select('tenant_id, store_id, role').eq('auth_id', auth.user.id).maybeSingle()
    if (callerError) throw callerError
    if (!caller || caller.role !== 'admin') return json({ error: 'Admin role required' }, 403)

    const body = await req.json() as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 120) : null
    const role = typeof body.role === 'string' ? body.role : ''
    const storeId = typeof body.store_id === 'string' ? body.store_id : caller.store_id
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 12 || !ROLES.has(role)) {
      return json({ error: 'Invalid email, password (min 12 chars), or role' }, 400)
    }

    if (storeId) {
      const { data: store, error: storeError } = await admin
        .from('stores').select('id').eq('id', storeId).eq('tenant_id', caller.tenant_id).maybeSingle()
      if (storeError) throw storeError
      if (!store) return json({ error: 'Store not in your tenant' }, 403)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    })
    if (createError || !created.user) return json({ error: createError?.message ?? 'Create failed' }, 400)

    const { data: profile, error: profileError } = await admin.from('users').upsert({
      id: created.user.id, auth_id: created.user.id, email, full_name: fullName, name: fullName,
      role, tenant_id: caller.tenant_id, store_id: storeId,
    }, { onConflict: 'id' }).select('id, email, role, store_id').single()
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id) // avoid orphaned auth account
      throw profileError
    }
    return json({ user: profile }, 201)
  } catch (error) {
    console.error('create-staff-user failed', error)
    return json({ error: 'Internal error' }, 500)
  }
})
