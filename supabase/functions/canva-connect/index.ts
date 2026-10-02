import { createClient } from '@supabase/supabase-js'
import { Actor, CanvaProvider, CanvaService, Connection, createHandler, Repository, TokenCipher, Transition } from './core.ts'

function required(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error('CANVA_CONFIGURATION')
  return value
}
const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})
const repo: Repository = {
  async authenticate(bearer) {
    const { data, error } = await admin.auth.getUser(bearer)
    if (error || !data.user) return null
    const result = await admin.from('users').select('id,tenant_id,store_id,role')
      .eq('auth_id', data.user.id).maybeSingle()
    if (result.error) throw new Error('CANVA_AUTHENTICATION_FAILED')
    return result.data as Actor | null
  },
  async transition(action, actor, data) {
    const result = await admin.rpc('canva_connection_transition', {
      p_action: action, p_user_id: actor.id, p_tenant_id: actor.tenant_id,
      p_store_id: actor.store_id, p_data: data,
    })
    if (result.error || !result.data) throw new Error('CANVA_STORAGE_FAILED')
    return result.data as Transition
  },
  async connection(actor) {
    const result = await admin.from('canva_connections')
      .select('id,tenant_id,store_id,user_id,canva_user_id,canva_team_id,granted_scopes,capability_state,status,access_token_expires_at')
      .eq('user_id', actor.id).eq('tenant_id', actor.tenant_id).eq('store_id', actor.store_id).maybeSingle()
    if (result.error) throw new Error('CANVA_STORAGE_FAILED')
    return result.data as Connection | null
  },
}
const origin = required('ADMIN_APP_ORIGIN')
const redirectUri = required('CANVA_OAUTH_REDIRECT_URI')
if (new URL(redirectUri).origin !== origin || new URL(redirectUri).pathname !== '/canva-connect/callback') {
  throw new Error('CANVA_CONFIGURATION')
}
// The Connect client ID must come from the portal; the supplied AAH... app ID
// is not assumed to be an OAuth client ID.
const clientId = required('CANVA_CONNECT_CLIENT_ID')
const provider = new CanvaProvider(clientId, required('CANVA_CONNECT_CLIENT_SECRET'), redirectUri)
function tokenKeys(): Record<string, string> {
  try {
    const keys = JSON.parse(required('CANVA_TOKEN_KEYS'))
    if (!keys || typeof keys !== 'object' || Array.isArray(keys) ||
      !Object.values(keys).every(value => typeof value === 'string')) throw new Error()
    return keys
  } catch { throw new Error('CANVA_CONFIGURATION') }
}
const cipher = new TokenCipher(tokenKeys(), required('CANVA_TOKEN_KEY_VERSION'))
const service = new CanvaService(repo, provider, cipher, clientId, redirectUri)
Deno.serve(createHandler(repo, service, origin))
