// Server-only protocol code. No provider credentials cross the HTTP boundary.
export const SCOPES = [
  'profile:read', 'asset:write', 'design:content:read', 'design:content:write',
  'design:meta:read', 'brandtemplate:meta:read', 'brandtemplate:content:read',
] as const;
export type Actor = { id: string; tenant_id: string; store_id: string; role: string };
export type Status = 'connected_ready' | 'connected_missing_autofill' |
  'connected_missing_brand_template' | 'reauthorization_required' | 'revoked';
export type Connection = {
  id: string; tenant_id: string; store_id: string; user_id: string;
  canva_user_id: string | null; canva_team_id: string | null;
  granted_scopes: string[]; capability_state: unknown; status: Status;
  access_token_expires_at: string | null;
};
type Credentials = {
  encrypted_access_token: string; encrypted_refresh_token: string; key_version: string;
};
export type Transition = {
  result: string; connection_id?: string; generation?: number;
  encrypted_verifier?: string; key_version?: string;
  credentials?: Credentials; connection?: Connection;
};
export interface Repository {
  authenticate(bearer: string): Promise<Actor | null>;
  transition(action: string, actor: Actor, data: Record<string, unknown>): Promise<Transition>;
  connection(actor: Actor): Promise<Connection | null>;
}
export class SafeError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
const encoder = new TextEncoder();
export function base64url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
export async function hash(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    b => b.toString(16).padStart(2, '0')).join('');
}
export async function createPKCE() {
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  return { state, verifier, challenge };
}

// Standard authenticated encryption from the runtime, with unique random IVs.
// AAD binds ciphertext to its row and purpose; keys live only in Edge secrets.
export class TokenCipher {
  constructor(private keys: Record<string, string>, public version: string) {
    if (!keys[version]) throw new SafeError('CANVA_CONFIGURATION', 503);
  }
  private key(version: string) {
    const raw = this.keys[version] ? decode(this.keys[version]) : new Uint8Array();
    if (raw.length !== 32) throw new SafeError('CANVA_CONFIGURATION', 503);
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async encrypt(value: string, aad: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(aad) },
      await this.key(this.version), encoder.encode(value));
    return `${base64url(iv)}.${base64url(new Uint8Array(result))}`;
  }
  async decrypt(value: string, version: string, aad: string): Promise<string> {
    try {
      const [iv, ciphertext, extra] = value.split('.');
      if (!iv || !ciphertext || extra) throw new Error();
      const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv), additionalData: encoder.encode(aad) },
        await this.key(version), decode(ciphertext));
      return new TextDecoder().decode(result);
    } catch { throw new SafeError('CANVA_CREDENTIALS_INVALID', 403); }
  }
}
export type Tokens = { access_token: string; refresh_token: string; expires_in: number; scopes: string[] };
export interface Provider {
  exchange(code: string, verifier: string): Promise<Tokens>;
  refresh(token: string): Promise<Tokens>;
  identity(token: string): Promise<{ user_id: string; team_id: string | null }>;
  capabilities(token: string): Promise<string[]>;
  revoke(token: string): Promise<void>;
}
export class CanvaProvider implements Provider {
  constructor(private clientId: string, private clientSecret: string, private redirectUri: string,
    private request: typeof fetch = fetch) {}
  private async call(path: string, options: RequestInit): Promise<Record<string, unknown>> {
    try {
      const response = await this.request(`https://api.canva.com/rest/v1/${path}`, {
        ...options, signal: AbortSignal.timeout(10_000), redirect: 'error',
      });
      if (!response.ok) throw new SafeError(response.status === 401 || response.status === 403 ?
        'CANVA_AUTHORIZATION_FAILED' : 'CANVA_PROVIDER_FAILED', 502);
      return await response.json();
    } catch (error) {
      if (error instanceof SafeError) throw error;
      throw new SafeError('CANVA_PROVIDER_FAILED', 502);
    }
  }
  private async token(form: URLSearchParams): Promise<Tokens> {
    const result = await this.call('oauth/token', {
      method: 'POST', headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }, body: form,
    });
    if (typeof result.access_token !== 'string' || !result.access_token ||
      typeof result.refresh_token !== 'string' || !result.refresh_token ||
      typeof result.expires_in !== 'number' || !Number.isFinite(result.expires_in) || result.expires_in <= 90 ||
      result.token_type !== 'Bearer') {
      if (typeof result.refresh_token === 'string' && result.refresh_token) {
        await this.revoke(result.refresh_token).catch(() => undefined);
      }
      throw new SafeError('CANVA_TOKEN_RESPONSE_INVALID', 502);
    }
    let scopes: string[];
    try {
      let granted = result.scope;
      // scope is optional in the current token response. Verify it through
      // introspection when omitted, rather than assuming requested = granted.
      if (typeof granted !== 'string') {
        const inspected = await this.call('oauth/introspect', {
          method: 'POST', headers: {
            Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }, body: new URLSearchParams({ token: result.access_token }),
        });
        if (inspected.active !== true || (inspected.client !== undefined && inspected.client !== this.clientId)) {
          throw new SafeError('CANVA_AUTHORIZATION_FAILED', 403);
        }
        granted = inspected.scope;
      }
      if (typeof granted !== 'string') throw new SafeError('CANVA_SCOPES_UNKNOWN', 403);
      scopes = granted.split(' ').filter(Boolean);
      if (SCOPES.some(scope => !scopes.includes(scope))) throw new SafeError('CANVA_SCOPES_MISSING', 403);
    } catch (error) {
      await this.revoke(result.refresh_token).catch(() => undefined);
      throw error;
    }
    return { access_token: result.access_token, refresh_token: result.refresh_token, expires_in: result.expires_in, scopes };
  }
  exchange(code: string, verifier: string) {
    return this.token(new URLSearchParams({ grant_type: 'authorization_code', code,
      code_verifier: verifier, redirect_uri: this.redirectUri }));
  }
  refresh(token: string) {
    // Never retry an ambiguous rotating-token request.
    return this.token(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token }));
  }
  async identity(token: string) {
    const data = await this.call('users/me', { headers: { Authorization: `Bearer ${token}` } });
    const user = data.team_user as Record<string, unknown> | undefined;
    if (!user || typeof user.user_id !== 'string' || !user.user_id ||
      (user.team_id !== undefined && typeof user.team_id !== 'string')) throw new SafeError('CANVA_IDENTITY_INVALID', 502);
    return { user_id: user.user_id, team_id: typeof user.team_id === 'string' ? user.team_id : null };
  }
  async capabilities(token: string) {
    const data = await this.call('users/me/capabilities', { headers: { Authorization: `Bearer ${token}` } });
    if (!Array.isArray(data.capabilities) || !data.capabilities.every(x => typeof x === 'string')) {
      throw new SafeError('CANVA_CAPABILITIES_UNKNOWN', 502);
    }
    return data.capabilities as string[];
  }
  async revoke(token: string) {
    await this.call('oauth/revoke', { method: 'POST', headers: {
      Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }, body: new URLSearchParams({ token }) });
  }
}
export function capabilityStatus(capabilities: string[]): Status {
  if (!capabilities.includes('autofill')) return 'connected_missing_autofill';
  if (!capabilities.includes('brand_template')) return 'connected_missing_brand_template';
  return 'connected_ready';
}
export function publicConnection(connection: Connection) {
  return {
    id: connection.id, canvaUserId: connection.canva_user_id, canvaTeamId: connection.canva_team_id,
    scopes: connection.granted_scopes, capabilities: connection.capability_state,
    status: connection.status, accessTokenExpiresAt: connection.access_token_expires_at,
  };
}
export class CanvaService {
  constructor(private repo: Repository, private provider: Provider, private cipher: TokenCipher,
    private clientId: string, private redirectUri: string,
    private wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {}
  async start(actor: Actor) {
    const { state, verifier, challenge } = await createPKCE();
    const stateHash = await hash(state);
    const result = await this.repo.transition('start', actor, {
      state_hash: stateHash, encrypted_verifier: await this.cipher.encrypt(verifier, `oauth:${stateHash}`),
      key_version: this.cipher.version,
    });
    if (result.result !== 'started') throw new SafeError('CANVA_START_FAILED', 503);
    if (result.credentials && result.connection_id) {
      try {
        const old = await this.cipher.decrypt(result.credentials.encrypted_refresh_token,
          result.credentials.key_version, `refresh:${result.connection_id}`);
        await this.provider.revoke(old);
      } catch { /* The previous generation is already disabled locally. */ }
    }
    const url = new URL('https://www.canva.com/api/oauth/authorize');
    url.search = new URLSearchParams({ client_id: this.clientId, redirect_uri: this.redirectUri,
      response_type: 'code', scope: SCOPES.join(' '), state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return { authorizationUrl: url.toString() };
  }
  private async encrypted(tokens: Tokens, connectionId: string) {
    return {
      encrypted_access_token: await this.cipher.encrypt(tokens.access_token, `access:${connectionId}`),
      encrypted_refresh_token: await this.cipher.encrypt(tokens.refresh_token, `refresh:${connectionId}`),
      key_version: this.cipher.version,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), scopes: tokens.scopes,
    };
  }
  async callback(actor: Actor, params: URLSearchParams) {
    const state = params.get('state');
    if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || params.getAll('state').length !== 1) {
      throw new SafeError('CANVA_STATE_INVALID');
    }
    const stateHash = await hash(state);
    const consumed = await this.repo.transition('consume', actor, { state_hash: stateHash });
    if (consumed.result !== 'consumed' || !consumed.connection_id || !consumed.encrypted_verifier || !consumed.key_version) {
      throw new SafeError('CANVA_STATE_INVALID');
    }
    const code = params.get('code');
    if (params.has('error') || !code || code.length > 4096 || params.getAll('code').length !== 1) {
      throw new SafeError('CANVA_AUTHORIZATION_DENIED');
    }
    const verifier = await this.cipher.decrypt(consumed.encrypted_verifier, consumed.key_version, `oauth:${stateHash}`);
    let tokens: Tokens | undefined;
    try {
      tokens = await this.provider.exchange(code, verifier);
      const identity = await this.provider.identity(tokens.access_token);
      const capabilities = await this.provider.capabilities(tokens.access_token);
      const saved = await this.repo.transition('complete', actor, {
        connection_id: consumed.connection_id, generation: consumed.generation, state_hash: stateHash,
        ...await this.encrypted(tokens, consumed.connection_id), canva_user_id: identity.user_id,
        canva_team_id: identity.team_id, capability_state: { capabilities }, status: capabilityStatus(capabilities),
      });
      if (saved.result !== 'saved' || !saved.connection) throw new SafeError('CANVA_FLOW_SUPERSEDED', 409);
      return publicConnection(saved.connection);
    } catch (error) {
      if (tokens) await this.provider.revoke(tokens.refresh_token).catch(() => undefined);
      throw error;
    }
  }
  async getValidCanvaAccessToken(actor: Actor, connectionId: string): Promise<string> {
    const refreshId = crypto.randomUUID();
    for (let attempt = 0; attempt < 5; attempt++) {
      const claim = await this.repo.transition('claim', actor, { connection_id: connectionId, refresh_id: refreshId });
      if (claim.result === 'busy') { if (attempt < 4) await this.wait(250); continue; }
      if (!claim.credentials || !['valid','claimed'].includes(claim.result)) throw new SafeError('CANVA_REAUTHORIZATION_REQUIRED', 403);
      const k = claim.credentials;
      if (claim.result === 'valid') {
        try { return await this.cipher.decrypt(k.encrypted_access_token, k.key_version, `access:${connectionId}`); }
        catch {
          await this.repo.transition('invalidate', actor, { connection_id: connectionId, generation: claim.generation });
          throw new SafeError('CANVA_REAUTHORIZATION_REQUIRED', 403);
        }
      }
      let refreshed: Tokens | undefined;
      try {
        const refresh = await this.cipher.decrypt(k.encrypted_refresh_token, k.key_version, `refresh:${connectionId}`);
        const tokens = await this.provider.refresh(refresh);
        refreshed = tokens;
        const saved = await this.repo.transition('rotate', actor, {
          connection_id: connectionId, generation: claim.generation, refresh_id: refreshId,
          ...await this.encrypted(tokens, connectionId),
        });
        if (saved.result !== 'saved') {
          throw new SafeError('CANVA_FLOW_SUPERSEDED', 409);
        }
        return tokens.access_token;
      } catch {
        if (refreshed) await this.provider.revoke(refreshed.refresh_token).catch(() => undefined);
        await this.repo.transition('fail', actor, {
          connection_id: connectionId, generation: claim.generation, refresh_id: refreshId,
        });
        throw new SafeError('CANVA_REAUTHORIZATION_REQUIRED', 403);
      }
    }
    throw new SafeError('CANVA_REFRESH_BUSY', 409);
  }
  async disconnect(actor: Actor) {
    // Local invalidation commits before any external call, even on revocation failure.
    const result = await this.repo.transition('disconnect', actor, {});
    let providerRevoked = result.result === 'missing';
    if (result.credentials && result.connection_id) {
      try {
        const token = await this.cipher.decrypt(result.credentials.encrypted_refresh_token,
          result.credentials.key_version, `refresh:${result.connection_id}`);
        await this.provider.revoke(token); providerRevoked = true;
      } catch { providerRevoked = false; }
    }
    return { status: 'revoked', providerRevoked };
  }
}

export function createHandler(repo: Repository, service: CanvaService, origin: string) {
  return async (req: Request): Promise<Response> => {
    const headers = {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS', 'Content-Type': 'application/json',
      'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin',
    };
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      if (req.headers.has('Origin') && req.headers.get('Origin') !== origin) throw new SafeError('CANVA_ORIGIN_DENIED', 403);
      const authorization = req.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) throw new SafeError('AUTHENTICATION_REQUIRED', 401);
      const actor = await repo.authenticate(authorization.slice(7));
      if (!actor) throw new SafeError('AUTHENTICATION_REQUIRED', 401);
      if (!actor.tenant_id || !actor.store_id || !['owner','manager','admin'].includes(actor.role)) throw new SafeError('CANVA_SCOPE_DENIED', 403);
      const url = new URL(req.url);
      const path = url.pathname.replace(/^.*\/canva-connect/, '');
      if (req.method === 'GET' && path === '/oauth/start') return json(await service.start(actor));
      if (req.method === 'GET' && path === '/oauth/callback') return json(await service.callback(actor, url.searchParams));
      if (req.method === 'DELETE' && path === '/oauth') return json(await service.disconnect(actor));
      if (req.method === 'GET' && path === '/oauth') {
        const connection = await repo.connection(actor);
        return json({ connection: connection ? publicConnection(connection) : null });
      }
      return json({ error: 'METHOD_OR_ROUTE_NOT_ALLOWED' }, 405);
    } catch (error) {
      // Never log database/provider exceptions, URLs, headers, codes or tokens.
      return json({ error: error instanceof SafeError ? error.code : 'CANVA_OPERATION_FAILED' },
        error instanceof SafeError ? error.status : 503);
    }
  };
}
