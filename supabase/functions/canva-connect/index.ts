import { createClient } from '@supabase/supabase-js'
import { Actor, CanvaProvider, CanvaService, Connection, createHandler, Repository, TokenCipher, Transition } from './core.ts'
import { Run, WorkflowProvider, WorkflowRepository, WorkflowService } from './workflow.ts'
import { SafeError } from './core.ts'

function required(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error('CANVA_CONFIGURATION')
  return value
}
function requiredHttps(name: string): string {
  const value = required(name)
  try {
    if (new URL(value).protocol !== 'https:') throw new Error()
  } catch { throw new Error('CANVA_CONFIGURATION') }
  return value
}
const admin = createClient(requiredHttps('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
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
if (new URL(origin).protocol !== 'https:' || new URL(redirectUri).protocol !== 'https:' || new URL(redirectUri).origin !== origin || new URL(redirectUri).pathname !== '/canva-connect/callback') {
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
const workflowRepo: WorkflowRepository = {
  async transition(action, actor, data) {
    const r = await admin.rpc('canva_run_transition', {
      p_action: action, p_user_id: actor.id, p_tenant_id: actor.tenant_id,
      p_store_id: actor.store_id, p_data: data,
    })
    if (r.error || !r.data) {
      const codes = ['CANVA_SCOPE_DENIED','CANVA_TEMPLATE_DENIED','CANVA_PRODUCTS_DENIED',
        'CANVA_RUN_DENIED','CANVA_REQUEST_CONFLICT','CANVA_TEMPLATE_DATASET_MISMATCH',
        'CANVA_REAUTHORIZATION_REQUIRED','CANVA_FLOW_SUPERSEDED','CANVA_PRODUCTS_INVALID','CANVA_SOURCE_CHANGED']
      const code = codes.find(code => r.error?.message === code)
      throw new SafeError(code ?? 'CANVA_STORAGE_FAILED', code ? 409 : 503)
    }
    return r.data
  },
  async list(actor) {
    const r = await admin.from('canva_design_runs').select('id,connection_id,template_id,products,assets,status,autofill_job_id,design_id,error_code,created_at')
      .eq('user_id', actor.id).eq('tenant_id', actor.tenant_id).eq('store_id', actor.store_id)
      .order('created_at', { ascending: false }).limit(20)
    if (r.error) throw new SafeError('CANVA_STORAGE_FAILED', 503)
    return r.data as Run[]
  },
  async templates(actor) {
    const r = await admin.from('canva_approved_templates').select('id,name,expected_dataset_schema,expected_width,expected_height,expected_page_count')
      .eq('tenant_id', actor.tenant_id).eq('store_id', actor.store_id).eq('enabled', true)
    if (r.error) throw new SafeError('CANVA_STORAGE_FAILED', 503)
    return r.data
  },
}
const workflow = new WorkflowService(workflowRepo, service, new WorkflowProvider())
Deno.serve(createHandler(repo, service, origin, async (req, actor, path) => {
  if (req.method === 'GET' && path === '/products') {
    const r = await admin.from('stock_levels').select('items!inner(id,name,price,image_url,tenant_id,is_active)')
      .eq('store_id', actor.store_id).eq('items.tenant_id', actor.tenant_id).limit(500)
    if (r.error) throw new SafeError('CANVA_STORAGE_FAILED', 503)
    return { products: r.data.map(row => row.items).filter(Boolean) }
  }
  if (req.method === 'GET' && path === '/templates') return { templates: await workflowRepo.templates(actor) }
  if (req.method === 'GET' && path === '/designs') return { runs: await workflowRepo.list(actor) }
  if (req.method === 'POST' && path === '/designs') {
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new SafeError('CANVA_INPUT_INVALID')
    const body = await req.text()
    if (body.length > 4096) throw new SafeError('CANVA_INPUT_INVALID')
    let input
    try { input = JSON.parse(body) } catch { throw new SafeError('CANVA_INPUT_INVALID') }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SafeError('CANVA_INPUT_INVALID')
    return { run: await workflow.start(actor, input) }
  }
  const match = /^\/designs\/([0-9a-f-]{36})\/advance$/i.exec(path)
  if (req.method === 'POST' && match) return { run: await workflow.advance(actor, match[1]) }
  throw new SafeError('METHOD_OR_ROUTE_NOT_ALLOWED', 405)
}))
