// deno-lint-ignore-file require-await -- async test doubles implement server interfaces without I/O
import {
  Actor, CanvaProvider, CanvaService, capabilityStatus, Connection, createHandler,
  createPKCE, hash, Provider, Repository, SafeError, SCOPES, TokenCipher, Tokens, Transition,
} from './core.ts';

function assert(value: unknown, message = 'assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(operation: () => Promise<unknown>, code: string) {
  try { await operation(); } catch (error) {
    assert(error instanceof SafeError && error.code === code); return;
  }
  throw new Error('expected rejection');
}
const actor: Actor = { id: 'user-a', tenant_id: 'tenant-a', store_id: 'store-a', role: 'manager' };
const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(42)));
const cipher = () => new TokenCipher({ v1: key }, 'v1');
const tokens = (): Tokens => ({ access_token: 'secret-access', refresh_token: 'secret-refresh', expires_in: 3600, scopes: [...SCOPES] });
class MemoryRepository implements Repository {
  actor: Actor | null = actor;
  row: Connection = { id: 'connection-a', user_id: actor.id, tenant_id: actor.tenant_id, store_id: actor.store_id,
    canva_user_id: 'canva-user', canva_team_id: 'canva-team', granted_scopes: [...SCOPES],
    capability_state: { capabilities: ['autofill','brand_template'] }, status: 'revoked', access_token_expires_at: null };
  generation = 0;
  state: Record<string, unknown> | null = null;
  credentials: Transition['credentials'];
  expires = 0;
  refreshing: string | null = null;
  calls: string[] = [];
  async authenticate() { return this.actor; }
  async connection(who: Actor) { return this.owns(who) ? this.row : null; }
  owns(who: Actor) { return who.id === actor.id && who.tenant_id === actor.tenant_id && who.store_id === actor.store_id; }
  async transition(action: string, who: Actor, data: Record<string, unknown>): Promise<Transition> {
    this.calls.push(action);
    if (!this.owns(who)) return { result: 'missing' };
    if (action === 'start') {
      const credentials = this.credentials;
      this.generation++; this.row.status = 'reauthorization_required'; this.credentials = undefined;
      this.state = { ...data, consumed: false, expires: Date.now() + 300_000 };
      return { result: 'started', connection_id: this.row.id, generation: this.generation, credentials };
    }
    if (action === 'consume') {
      if (!this.state || this.state.consumed || Number(this.state.expires) < Date.now() || data.state_hash !== this.state.state_hash) {
        return { result: 'invalid_state' };
      }
      this.state.consumed = true;
      return { result: 'consumed', connection_id: this.row.id, generation: this.generation,
        encrypted_verifier: String(this.state.encrypted_verifier), key_version: String(this.state.key_version) };
    }
    if (action === 'disconnect') {
      const credentials = this.credentials; this.credentials = undefined; this.state = null;
      this.row.status = 'revoked'; this.generation++;
      return { result: 'revoked', connection_id: this.row.id, credentials };
    }
    if (action === 'claim') {
      if (data.connection_id !== this.row.id || this.row.status !== 'connected_ready' || !this.credentials) return { result: 'missing' };
      if (this.refreshing) return { result: 'busy' };
      if (this.expires > Date.now() + 90_000) return { result: 'valid', generation: this.generation, credentials: this.credentials };
      this.refreshing = String(data.refresh_id);
      return { result: 'claimed', generation: this.generation, credentials: this.credentials };
    }
    if (data.generation !== this.generation || (!['complete','invalidate'].includes(action) && data.refresh_id !== this.refreshing)) return { result: 'superseded' };
    if (action === 'fail' || action === 'invalidate') {
      this.credentials = undefined; this.row.status = 'reauthorization_required'; this.generation++;
      return { result: 'reauthorization_required' };
    }
    if (action === 'complete' || action === 'rotate') {
      this.credentials = { encrypted_access_token: String(data.encrypted_access_token),
        encrypted_refresh_token: String(data.encrypted_refresh_token), key_version: String(data.key_version) };
      this.expires = Date.parse(String(data.expires_at)); this.refreshing = null;
      if (action === 'complete') {
        this.row.status = data.status as Connection['status']; this.row.capability_state = data.capability_state;
        this.state = null;
      }
      return { result: 'saved', connection: this.row };
    }
    throw new Error('unexpected transition');
  }
}
class FakeProvider implements Provider {
  capabilitiesValue = ['autofill','brand_template'];
  refreshes = 0; revocations = 0; exchanges = 0;
  exchangeFails = false; refreshFails = false; capabilityFails = false; revokeFails = false;
  async exchange(_code: string, verifier: string) {
    assert(verifier.length >= 43); this.exchanges++;
    if (this.exchangeFails) throw new SafeError('CANVA_PROVIDER_FAILED', 502);
    return tokens();
  }
  async refresh(token: string) {
    assert(token === 'secret-refresh'); this.refreshes++;
    await new Promise(resolve => setTimeout(resolve, 10));
    if (this.refreshFails) throw new SafeError('CANVA_AUTHORIZATION_FAILED', 502);
    return { ...tokens(), access_token: 'rotated-access', refresh_token: 'rotated-refresh' };
  }
  async identity() { return { user_id: 'canva-user', team_id: 'canva-team' }; }
  async capabilities() {
    if (this.capabilityFails) throw new SafeError('CANVA_CAPABILITIES_UNKNOWN', 502);
    return this.capabilitiesValue;
  }
  async revoke() { this.revocations++; if (this.revokeFails) throw new SafeError('CANVA_PROVIDER_FAILED', 502); }
}
function setup() {
  const repo = new MemoryRepository(); const provider = new FakeProvider(); const crypto = cipher();
  const service = new CanvaService(repo, provider, crypto, 'client', 'https://admin.example/canva-connect/callback',
    ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 20))));
  const handler = createHandler(repo, service, 'https://admin.example');
  const req = (path: string, method = 'GET') => new Request(`https://edge.example/canva-connect${path}`, {
    method, headers: { Authorization: 'Bearer retailos-session', Origin: 'https://admin.example' },
  });
  const connect = async () => {
    const { authorizationUrl } = await service.start(actor);
    const state = new URL(authorizationUrl).searchParams.get('state')!;
    return { state, params: new URLSearchParams({ state, code: 'authorization-code' }) };
  };
  return { repo, provider, crypto, service, handler, req, connect };
}

Deno.test('PKCE uses fresh high-entropy state and SHA-256 challenge', async () => {
  const a = await createPKCE(); const b = await createPKCE();
  assert(a.state !== b.state && a.verifier !== b.verifier && a.state !== a.verifier);
  assert(a.state.length === 43 && a.verifier.length >= 43 && a.verifier.length <= 128 && a.challenge.length === 43);
  const digest = await hash(a.verifier);
  const bytes = Uint8Array.from(digest.match(/../g)!, x => parseInt(x, 16));
  assert(btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'') === a.challenge);
});
Deno.test('AES-GCM rejects tampering, wrong purpose, wrong row and missing key', async () => {
  const c = cipher(); const encrypted = await c.encrypt('secret','access:row-a');
  assert(!encrypted.includes('secret'));
  assert(await c.decrypt(encrypted,'v1','access:row-a') === 'secret');
  for (const [value,version,aad] of [[encrypted,'v1','refresh:row-a'],[encrypted,'v1','access:row-b'],
    [encrypted,'missing','access:row-a'],[encrypted.slice(0,-3)+'abc','v1','access:row-a']]) {
    await rejects(() => c.decrypt(value,version,aad),'CANVA_CREDENTIALS_INVALID');
  }
});
Deno.test('start returns only authorization URL; verifier stays encrypted on server', async () => {
  const x = setup(); const response = await x.handler(x.req('/oauth/start')); const body = await response.json();
  assert(response.status === 200 && Object.keys(body).join() === 'authorizationUrl');
  const url = new URL(body.authorizationUrl);
  assert(url.searchParams.get('code_challenge_method') === 'S256' && url.searchParams.get('scope') === SCOPES.join(' '));
  assert(!url.searchParams.has('code_verifier'));
  assert(response.headers.get('Cache-Control') === 'no-store');
});
for (const mode of ['mismatch','expired','replayed','wrong-user','cross-tenant','cross-store'] as const) {
  Deno.test(`callback rejects ${mode} before token exchange`, async () => {
    const x = setup(); const { params } = await x.connect(); let who = actor;
    if (mode === 'mismatch') params.set('state', 'b'.repeat(43));
    if (mode === 'expired') x.repo.state!.expires = Date.now() - 1;
    if (mode === 'replayed') x.repo.state!.consumed = true;
    if (mode === 'wrong-user') who = { ...actor, id: 'other-user' };
    if (mode === 'cross-tenant') who = { ...actor, tenant_id: 'other-tenant' };
    if (mode === 'cross-store') who = { ...actor, store_id: 'other-store' };
    await rejects(() => x.service.callback(who,params),'CANVA_STATE_INVALID'); assert(x.provider.exchanges === 0);
  });
}
Deno.test('PKCE/provider failure consumes state and returns no provider detail', async () => {
  const x = setup(); const { params } = await x.connect(); x.provider.exchangeFails = true;
  const response = await x.handler(x.req(`/oauth/callback?${params}`));
  assert(response.status === 502); assert(await response.text() === '{"error":"CANVA_PROVIDER_FAILED"}');
  await rejects(() => x.service.callback(actor,params),'CANVA_STATE_INVALID');
});
Deno.test('denied OAuth consumes state before rejecting authorization', async () => {
  const x = setup(); const { params } = await x.connect(); params.set('error','sensitive-provider-detail');
  await rejects(() => x.service.callback(actor,params),'CANVA_AUTHORIZATION_DENIED');
  await rejects(() => x.service.callback(actor,params),'CANVA_STATE_INVALID');
});
for (const [caps,status] of [
  [['autofill','brand_template'],'connected_ready'],
  [['brand_template'],'connected_missing_autofill'],
  [['autofill'],'connected_missing_brand_template'],
  [[], 'connected_missing_autofill'],
] as const) {
  Deno.test(`capabilities ${caps.join(',') || 'empty'} -> ${status}`, async () => {
    assert(capabilityStatus([...caps]) === status);
    const x = setup(); x.provider.capabilitiesValue = [...caps]; const { params } = await x.connect();
    const result = await x.service.callback(actor, params); assert(result.status === status);
    const output = JSON.stringify(result); assert(!output.includes('secret-') && !output.includes('encrypted_'));
    assert(x.repo.credentials && !JSON.stringify(x.repo.credentials).includes('secret-'));
  });
}
Deno.test('capability provider failure fails closed and revokes newly issued authorization', async () => {
  const x = setup(); x.provider.capabilityFails = true; const { params } = await x.connect();
  await rejects(() => x.service.callback(actor,params),'CANVA_CAPABILITIES_UNKNOWN');
  assert(x.repo.row.status === 'reauthorization_required' && !x.repo.credentials && x.provider.revocations === 1);
});
Deno.test('valid token returns only server-side without refresh', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params);
  assert(await x.service.getValidCanvaAccessToken(actor,'connection-a') === 'secret-access' && x.provider.refreshes === 0);
  const output = await (await x.handler(x.req('/oauth'))).text(); assert(!output.includes('secret-access') && !output.includes('secret-refresh'));
});
Deno.test('expired token rotates both credentials transactionally', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params); x.repo.expires = 0;
  assert(await x.service.getValidCanvaAccessToken(actor,'connection-a') === 'rotated-access');
  assert(await x.crypto.decrypt(x.repo.credentials!.encrypted_refresh_token,'v1','refresh:connection-a') === 'rotated-refresh');
});
Deno.test('concurrent refresh callers use one provider refresh and the winning lineage', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params); x.repo.expires = 0;
  const results = await Promise.all([x.service.getValidCanvaAccessToken(actor,'connection-a'),x.service.getValidCanvaAccessToken(actor,'connection-a')]);
  assert(results.every(token => token === 'rotated-access') && x.provider.refreshes === 1);
});
Deno.test('invalid refresh removes credentials and requires reauthorization', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params);
  x.repo.expires = 0; x.provider.refreshFails = true;
  await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
  assert(x.repo.row.status === 'reauthorization_required' && !x.repo.credentials && x.provider.refreshes === 1);
});
Deno.test('revoked connection denies token use', async () => {
  const x = setup(); await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
});
Deno.test('refresh wait is bounded', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params); x.repo.refreshing = 'other-worker';
  await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REFRESH_BUSY');
  assert(x.repo.calls.filter(x => x === 'claim').length === 5);
});
Deno.test('authorized disconnect locally invalidates even when revocation fails; reconnect uses new state', async () => {
  const x = setup(); const { params, state } = await x.connect(); await x.service.callback(actor,params); x.provider.revokeFails = true;
  const response = await x.handler(x.req('/oauth','DELETE')); const result = await response.json();
  assert(response.status === 200 && result.status === 'revoked' && !result.providerRevoked && !x.repo.credentials);
  const fresh = await x.connect(); assert(fresh.state !== state);
  await rejects(() => x.service.callback(actor,params),'CANVA_STATE_INVALID');
});
for (const role of ['cashier','stock']) Deno.test(`disconnect denies ${role}`, async () => {
  const x = setup(); x.repo.actor = { ...actor, role };
  assert((await x.handler(x.req('/oauth','DELETE'))).status === 403 && !x.repo.calls.includes('disconnect'));
});
Deno.test('unauthenticated disconnect denied', async () => {
  const x = setup(); assert((await x.handler(new Request('https://edge.example/canva-connect/oauth',{ method:'DELETE' }))).status === 401);
});
Deno.test('foreign connection ownership cannot refresh credentials', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params);
  await rejects(() => x.service.getValidCanvaAccessToken({ ...actor, tenant_id:'other' },'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
});
Deno.test('HTTP layer sanitizes unexpected provider and database failures', async () => {
  const x = setup(); x.repo.authenticate = () => Promise.reject(new Error('secret-access secret-refresh authorization-code'));
  const response = await x.handler(x.req('/oauth'));
  assert(await response.text() === '{"error":"CANVA_OPERATION_FAILED"}');
});
Deno.test('provider uses current identity and capability response shapes and rejects missing capabilities', async () => {
  const paths: string[] = [];
  const request: typeof fetch = (input) => {
    paths.push(String(input));
    return Promise.resolve(Response.json(String(input).endsWith('capabilities') ? {} : { team_user:{ user_id:'user',team_id:'team' } }));
  };
  const p = new CanvaProvider('client','client-secret','https://admin.example/callback',request);
  assert((await p.identity('secret-access')).team_id === 'team');
  await rejects(() => p.capabilities('secret-access'),'CANVA_CAPABILITIES_UNKNOWN');
  assert(paths.join(',') === 'https://api.canva.com/rest/v1/users/me,https://api.canva.com/rest/v1/users/me/capabilities');
});

Deno.test('disconnect during refresh fences completion and revokes the new orphaned token', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params); x.repo.expires = 0;
  x.provider.refresh = async () => {
    await x.service.disconnect(actor);
    return { ...tokens(), access_token:'rotated-access',refresh_token:'rotated-refresh' };
  };
  await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
  assert(!x.repo.credentials && x.repo.row.status === 'revoked' && x.provider.revocations === 2);
});
Deno.test('disconnect during callback fences completion', async () => {
  const x = setup(); const { params } = await x.connect();
  x.provider.identity = async () => { await x.service.disconnect(actor); return { user_id:'canva-user',team_id:'canva-team' }; };
  await rejects(() => x.service.callback(actor,params),'CANVA_FLOW_SUPERSEDED');
  assert(!x.repo.credentials && x.repo.row.status === 'revoked' && x.provider.revocations === 1);
});
Deno.test('corrupt valid ciphertext invalidates credentials', async () => {
  const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params);
  x.repo.credentials!.encrypted_access_token = 'not-ciphertext';
  await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
  assert(!x.repo.credentials && x.repo.row.status === 'reauthorization_required');
});
Deno.test('secrets never reach application logs on OAuth, refresh or disconnect failure', async () => {
  const captured: unknown[][] = []; const originalLog = console.log; const originalError = console.error;
  console.log = (...args) => captured.push(args); console.error = (...args) => captured.push(args);
  try {
    const x = setup(); const { params } = await x.connect(); await x.service.callback(actor,params);
    x.provider.refreshFails = true; x.repo.expires = 0;
    await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
    x.provider.revokeFails = true; await x.service.disconnect(actor);
    assert(captured.length === 0);
  } finally { console.log = originalLog; console.error = originalError; }
});
Deno.test('provider token exchange uses Basic auth and PKCE; refresh is not retried', async () => {
  const calls: Request[] = [];
  const request: typeof fetch = async (input, init) => {
    const req = new Request(input,init); calls.push(req);
    const form = new URLSearchParams(await req.text());
    if (form.get('grant_type') === 'refresh_token') return Response.json({ code:'invalid_grant',message:'private-token-detail' },{ status:400 });
    assert(form.get('code_verifier') === 'test-verifier' && form.get('code') === 'test-code');
    return Response.json({ ...tokens(), scope: SCOPES.join(' '), token_type:'Bearer' });
  };
  const p = new CanvaProvider('client','client-secret','https://admin.example/callback',request);
  assert((await p.exchange('test-code','test-verifier')).refresh_token === 'secret-refresh');
  await rejects(() => p.refresh('secret-refresh'),'CANVA_PROVIDER_FAILED');
  assert(calls.length === 2 && calls[0].headers.get('Authorization') === `Basic ${btoa('client:client-secret')}`);
});

for (const active of [true,false]) Deno.test(`optional token scope is verified by introspection (active=${active})`, async () => {
  const paths: string[] = [];
  const request: typeof fetch = (input) => {
    paths.push(String(input));
    if (String(input).endsWith('introspect')) return Promise.resolve(Response.json({ active,client:'client',scope:SCOPES.join(' ') }));
    if (String(input).endsWith('revoke')) return Promise.resolve(Response.json({}));
    return Promise.resolve(Response.json({ ...tokens(), token_type:'Bearer' }));
  };
  const p = new CanvaProvider('client','client-secret','https://admin.example/callback',request);
  if (active) assert((await p.exchange('code','verifier')).scopes.length === SCOPES.length);
  else await rejects(() => p.exchange('code','verifier'),'CANVA_AUTHORIZATION_FAILED');
  assert(paths.some(path => path.endsWith('/oauth/introspect')));
  if (!active) assert(paths.some(path => path.endsWith('/oauth/revoke')));
});
Deno.test('missing granted scopes fail closed and revoke the issued lineage', async () => {
  let revoked = false;
  const request: typeof fetch = (input) => {
    if (String(input).endsWith('revoke')) { revoked = true; return Promise.resolve(Response.json({})); }
    return Promise.resolve(Response.json({ ...tokens(),token_type:'Bearer',scope:'profile:read' }));
  };
  const p = new CanvaProvider('client','client-secret','https://admin.example/callback',request);
  await rejects(() => p.exchange('code','verifier'),'CANVA_SCOPES_MISSING'); assert(revoked);
});
Deno.test('reconnect disables and revokes the previous local generation', async () => {
  const x = setup(); const { params, state } = await x.connect(); await x.service.callback(actor,params);
  const fresh = await x.connect(); assert(fresh.state !== state && !x.repo.credentials && x.provider.revocations === 1);
  await rejects(() => x.service.getValidCanvaAccessToken(actor,'connection-a'),'CANVA_REAUTHORIZATION_REQUIRED');
});
