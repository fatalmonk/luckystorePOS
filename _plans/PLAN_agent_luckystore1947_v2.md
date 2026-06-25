# PLAN: agent.luckystore1947.com — Orchestrator Worker (v2)

> **Scope:** Cloudflare Worker acting as MCP-compatible agent gateway for Lucky Store. Thin orchestration layer — proxies to existing workers (neon-proxy, images), validates JWT+roles, applies rate-limiting, publishes MCP discovery metadata.
> **Domain:** `agent.luckystore1947.com` → Cloudflare DNS CNAME → Worker (orange cloud)
> **Zone ID:** `cadbf71f2c3aee47e0c299319cba570d`
> **Version:** 2.1 (post-review corrections applied 2026-06-25)

---

## Security Model

```
Client / AI Agent
      │
      ▼ HTTPS
┌─────────────────────────────────────────┐
│  agent.luckystore1947.com Worker        │
│  ├─ CORS (strict, per-route)            │
│  ├─ JWT validate (Supabase JWKS)        │
│  ├─ Role check (worker_agent role)      │
│  ├─ Rate-limit (in-memory)              │  ← in-memory, isolate-scoped (upgrade path: CF zone rules)
│  ├─ x-request-id propagated to all      │  ← incl. error responses
│  └─ Audit log (console.warn + warn.ts)  │  ← NEW: auth/role failures logged
└────────────┬────────────────────────────┘
             │
   ┌─────────┼──────────┐
   ▼         ▼          ▼
Supabase  neon-proxy  images-worker
(RLS)     (Neon DB)   (R2)
```

---

## Secret Management

Store via `wrangler secret put` — never in code or Vercel:

| Secret | Description |
|--------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-only) |
| `SUPABASE_URL` | Supabase project URL |
| `NEON_PROXY_API_KEY` | Auth key for neon-proxy worker |

Public vars in `wrangler.toml` `[vars]`:

```toml
NEON_PROXY_URL = "https://lucky-store-neon-proxy.luckystore-1947.workers.dev"
IMAGES_WORKER_URL = "https://images.luckystore1947.com"
OAUTH_METADATA_URL = "https://api.luckystore1947.com/.well-known/oauth-protected-resource"  # proxy, not self-reference
```

**Startup validation** (added in worker init):
```ts
// Loosened to support custom domains (not just workers.dev)
if (!env.NEON_PROXY_URL.startsWith('https://')) {
  throw new Error('NEON_PROXY_URL must use HTTPS');
}
```

---

## Phase 0 — Pre-flight Checks

| Check | Command |
|-------|---------|
| Wrangler auth | `wrangler whoami` |
| Zone ID confirmed | DNS → `cadbf71f2c3aee47e0c299319cba570d` |
| Secrets scan | `npm run scan:secrets` (see §scripts) |
| neon-proxy audit | Review source for hardcoded creds — **must pass** before deploy |

---

## Phase 1 — Worker Scaffold

### `wrangler.toml`

```toml
name = "agent-luckystore1947"
main = "src/index.ts"
compatibility_date = "2026-06-01"
account_id = "8e457654e12c3b75d2094bbd8914030b"
workers_dev = false

[vars]
NEON_PROXY_URL = "https://lucky-store-neon-proxy.luckystore-1947.workers.dev"
IMAGES_WORKER_URL = "https://images.luckystore1947.com"
OAUTH_METADATA_URL = "https://api.luckystore1947.com/.well-known/oauth-protected-resource"

# NOTE: No KV namespace — using in-memory rate limiting (free tier, acceptable for POS traffic)
# V8 isolate caveat: cache is per-isolate, not shared. Cache miss = one Supabase round-trip.
# If traffic grows significantly, upgrade to Cloudflare zone-level Rate Limiting rules.

[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
enabled = true

[[routes]]
pattern = "agent.luckystore1947.com/*"
zone_id = "cadbf71f2c3aee47e0c299319cba570d"
```

---

## Phase 2 — Route Definitions

| Method | Path | Auth | CORS |
|--------|------|------|------|
| `GET` | `/.well-known/oauth-authorization-server` | none | `*` |
| `GET` | `/.well-known/oauth-protected-resource` | none | `*` |
| `GET` | `/auth.md` | none | `*` |
| `GET` | `/health` | none | `*` |
| `GET` | `/healthz` | none | `*` |  ← NEW: downstream health
| `GET` | `/robots.txt` | none | `*` |  ← NEW
| `GET` | `/openapi.json` | none | `*` |  ← NEW
| `OPTIONS` | `/api/*` | none | strict |
| `*` | `/api/*` | JWT+role | strict |

---

## Phase 3 — CORS Strategy

**Discovery routes** → `Access-Control-Allow-Origin: *`

**Data routes (`/api/*`)** → strict whitelist:

```ts
// customer_storefront: lucky-store-bd.vercel.app + luckystore1947.com (custom domain)
// admin_web portal: lucky-store-pos-six.vercel.app
const ALLOWED_ORIGINS = [
  'https://lucky-store-bd.vercel.app',       // customer storefront (Vercel)
  'https://luckystore1947.com',              // customer storefront (custom domain)
  'https://lucky-store-pos-six.vercel.app',  // admin web portal
  'http://localhost:5173',                   // local dev (admin_web)
  'http://localhost:3000',                   // local dev (storefront)
];

function getDataCorsHeaders(origin: string): HeadersInit {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  };
}
```

**Rule:** call `getDataCorsHeaders` first, pass result into every `Response` constructor — including error responses.

---

## Phase 4 — JWT Validation & Role Cache

```ts
// src/auth.ts
const JWKS_CACHE: { keys: any[]; fetched: number } = { keys: [], fetched: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_JWKS_RETRIES = 3;

async function getJwks(url: string): Promise<any[]> {
  if (Date.now() - JWKS_CACHE.fetched < CACHE_TTL_MS) return JWKS_CACHE.keys;

  // Exponential back-off retry on JWKS fetch failure
  for (let attempt = 0; attempt < MAX_JWKS_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
      const { keys } = await res.json() as { keys: any[] };
      JWKS_CACHE.keys = keys;
      JWKS_CACHE.fetched = Date.now();
      return keys;
    } catch (err) {
      if (attempt === MAX_JWKS_RETRIES - 1) {
        // Grace: serve 503 with Retry-After rather than loop
        throw new Response('JWKS unavailable', {
          status: 503,
          headers: { 'Retry-After': '30' }
        });
      }
      await new Promise(r => setTimeout(r, 2 ** attempt * 500));
    }
  }
  return [];
}

export async function validateJwt(token: string, env: Env) {
  const keys = await getJwks(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  // ... standard verify against kid-matched key ...
}

// Use app_metadata only — user_metadata is user-editable (untrusted)
// worker_agent role must be set server-side via Supabase admin/service role
export function validateRole(payload: any, required = 'worker_agent'): boolean {
  return payload?.app_metadata?.role === required;
}
```

---

## Phase 5 — In-Memory Rate Limiting

**Approach:** In-memory per-isolate rate limiting (free, no KV cost). Acceptable for Lucky Store's low-traffic POS workload.

> **V8 Isolate Caveat:** Cloudflare Workers run in V8 isolates. The `rateLimits` Map is per-isolate — multiple concurrent isolates do not share state. Under sustained high concurrency, a user could exceed the limit across isolates. For Lucky Store's traffic, this is acceptable. If this becomes a concern, migrate to Cloudflare zone-level Rate Limiting rules (free, 1 rule on Free plan) — no code change required.

```ts
// src/rateLimit.ts
const rateLimits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const timestamps = rateLimits.get(ip)!;

  // Slide window
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) timestamps.shift();

  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}
```

Rate-limited response must include `Retry-After`:
```ts
return new Response('Too Many Requests', {
  status: 429,
  headers: {
    ...corsHeaders,
    'Retry-After': '60',
    'x-request-id': requestId,
  }
});
```

---

## Phase 6 — Security Headers

All responses pass through:

```ts
// src/headers.ts
export function applySecurityHeaders(headers: Headers): Headers {
  headers.set('Content-Security-Policy', "default-src 'self'");
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('X-Frame-Options', 'DENY');
  return headers;
}
```

---

## Phase 7 — Audit Logging

Auth/role failures and proxy calls logged via `console.warn` (captured by `observability.logs`):

```ts
// src/audit.ts
export function auditLog(
  event: 'auth_fail' | 'role_fail' | 'rate_limit' | 'proxy_ok' | 'proxy_fail',
  ctx: { requestId: string; ip: string; path: string; reason?: string }
) {
  console.warn(JSON.stringify({ event, ts: new Date().toISOString(), ...ctx }));
}
```

Call in all failure paths:
```ts
// 401
auditLog('auth_fail', { requestId, ip, path, reason: 'invalid JWT' });
// 403
auditLog('role_fail', { requestId, ip, path, reason: 'missing worker_agent role' });
```

---

## Phase 8 — Proxy Logic

```ts
// src/proxy.ts
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB guard

export async function proxyRequest(
  upstream: string,
  request: Request,
  neonProxyApiKey: string,
  requestId: string
): Promise<Response> {
  // Only forward safe headers — do NOT spread all client headers.
  // Spreading Host causes upstream domain mismatch; CF-* headers are internal.
  const safeHeaders: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    'x-request-id': requestId,
  };
  // Add neon-proxy auth key only when routing to neon-proxy
  if (upstream.includes('neon-proxy') || upstream.includes('luckystore-1947')) {
    safeHeaders['x-api-key'] = neonProxyApiKey;
  }

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: safeHeaders,
    body: request.body,
  });

  // Size guard (Workers limit: 50 MB, we enforce 10 MB)
  const contentLength = parseInt(upstreamRes.headers.get('content-length') ?? '0');
  if (contentLength > MAX_RESPONSE_BYTES) {
    return new Response('Upstream response too large', { status: 502 });
  }

  return upstreamRes;
}
```

---

## Phase 9 — Discovery Endpoints

### `/.well-known/oauth-authorization-server`

```json
{
  "issuer": "https://agent.luckystore1947.com",
  "authorization_endpoint": "https://<supabase-project>.supabase.co/auth/v1/authorize",
  "token_endpoint": "https://<supabase-project>.supabase.co/auth/v1/token",
  "jwks_uri": "https://<supabase-project>.supabase.co/auth/v1/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["openid", "email", "worker_agent"]
}
```

Acceptance check: `curl -s https://agent.luckystore1947.com/.well-known/oauth-authorization-server | jq .issuer`

### `/.well-known/oauth-protected-resource`

This endpoint **proxies** to `https://api.luckystore1947.com/.well-known/oauth-protected-resource` (the existing `oauth-protected-resource` Worker). Do not duplicate — single source of truth.

```ts
// In well-known.ts handler:
if (pathname === '/.well-known/oauth-protected-resource') {
  const upstream = await fetch(env.OAUTH_METADATA_URL);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...publicCors },
  });
}
```

The existing Worker returns:
```json
{
  "resource": "https://api.luckystore1947.com",
  "authorization_servers": ["https://hvmyxyccfnkrbxqbhlnm.supabase.co"],
  "bearer_methods_supported": ["header"]
}
```

### `/auth.md`

```markdown
# Authentication
Bearer token (Supabase JWT) required on all /api/* routes.
Role: user_metadata.role = "worker_agent"
```

Cache-Control on all discovery: `Cache-Control: public, max-age=300, stale-while-revalidate=60`

### `/robots.txt`

```
User-agent: *
Disallow: /api/
Allow: /.well-known/
Allow: /
```

> **Note:** `/.well-known/` must NOT be disallowed — it is the agent discovery surface (RFC 8615). Any crawler or AI agent needs to reach these paths.

### `/openapi.json`

Expose OpenAPI spec for `/api/*` endpoints (generate from route definitions — see `scripts/gen-openapi.ts`).

---

## Phase 10 — Health Endpoints

### `GET /health` — Worker alive

```json
{ "status": "ok", "ts": "<ISO>" }
```

### `GET /healthz` — Downstream composite (NEW)

```ts
export async function healthz(env: Env): Promise<Response> {
  const checks = await Promise.allSettled([
    // Use /auth/v1/health — public endpoint, no auth header required
    fetch(`${env.SUPABASE_URL}/auth/v1/health`, {
      headers: { 'apikey': env.SUPABASE_ANON_KEY },  // anon key, not service role
    }),
    fetch(`${env.NEON_PROXY_URL}/health`),
    fetch(`${env.IMAGES_WORKER_URL}/health`),
  ]);

  const result = {
    supabase: checks[0].status === 'fulfilled' && (checks[0].value as Response).ok,
    neon_proxy: checks[1].status === 'fulfilled' && (checks[1].value as Response).ok,
    images: checks[2].status === 'fulfilled' && (checks[2].value as Response).ok,
  };

  const allOk = Object.values(result).every(Boolean);
  return Response.json(
    { status: allOk ? 'ok' : 'degraded', checks: result, ts: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
```

> **Note:** Add `SUPABASE_ANON_KEY` as a Wrangler secret (not service role — anon key is safe for health checks):
> ```bash
> npx wrangler secret put SUPABASE_ANON_KEY
> ```

---

## Phase 11 — MCP Server Card

```json
{
  "name": "lucky-store-agent",
  "version": "1.0.0",
  "description": "Lucky Store POS agent gateway — inventory, orders, ledger",
  "url": "https://agent.luckystore1947.com",
  "authentication": {
    "type": "bearer",
    "scheme": "https://agent.luckystore1947.com/auth.md"
  },
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  }
}
```

---

## Phase 12 — Tests (Miniflare)

Create `tests/` with Miniflare-based suite. Required coverage:

```ts
// tests/worker.test.ts
describe('Discovery', () => {
  it('GET /.well-known/oauth-protected-resource → 200, CORS *');
  it('GET /.well-known/oauth-authorization-server → 200, has .issuer');
  it('GET /auth.md → 200, Cache-Control: public,max-age=300');
  it('GET /robots.txt → 200, Disallow: /api/');
  it('GET /openapi.json → 200, valid JSON');
});

describe('Auth', () => {
  it('missing token → 401, x-request-id present');
  it('malformed JWT → 401');
  it('valid JWT, wrong role → 403, audit log emitted');
  it('valid JWT, correct role → proxied upstream');
});

describe('Rate Limiting', () => {
  it('101st request → 429 with Retry-After header');
  it('rate-limit counter resets after window');
});

describe('Proxy', () => {
  it('proxies /api/neon/* to NEON_PROXY_URL');
  it('proxies /api/images/* to IMAGES_WORKER_URL');
  it('upstream >10MB → 502');
  it('x-request-id forwarded to upstream');
});

describe('Health', () => {
  it('GET /health → 200 { status: ok }');
  it('GET /healthz → composite upstream status');
});

describe('Security Headers', () => {
  it('all responses include X-Content-Type-Options: nosniff');
  it('all responses include Content-Security-Policy');
  it('error responses include x-request-id');
});
```

Run: `npm test` → `miniflare tests/`

---

## Phase 13 — CI/CD Pipeline

**`.github/workflows/deploy-agent.yml`:**

```yaml
name: Deploy Agent Worker

on:
  push:
    branches: [feat/agent.luckystore1947, main]
    paths:
      - 'workers/agent/**'
      - '.github/workflows/deploy-agent.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: workers/agent

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Secret scan
        run: npm run scan:secrets

      - name: Tests
        run: npm test

      - name: Deploy
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_WORKER_API_TOKEN }}
```

---

## Phase 14 — Scripts

**`package.json` scripts:**

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "miniflare tests/ --modules",
    "lint": "eslint src/",
    "scan:secrets": "detect-secrets scan . --baseline .secrets.baseline",
    "gen-openapi": "ts-node scripts/gen-openapi.ts"
  }
}
```

**`scripts/secret_scan.js`** — delegates to `detect-secrets`:
```js
const { execSync } = require('child_process');
execSync('detect-secrets scan . --baseline .secrets.baseline', { stdio: 'inherit' });
```

Install: `pip install detect-secrets && detect-secrets scan . > .secrets.baseline`

---

## Phase 15 — Vercel Storefront Integration

Update `apps/customer_storefront/next.config.js`:

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Link',
      value: '<https://agent.luckystore1947.com/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"'
    }]
  }];
}
```

`NEXT_PUBLIC_AGENT_URL` in `.env.example` — only expose client-side if storefront UI needs it; otherwise keep server-only as `AGENT_URL`.

---

## Rollback Procedure

```bash
# List recent deployments
npx wrangler deployments list

# Rollback to specific revision
npx wrangler rollback <revision-id>

# Or revert commit and redeploy
git revert HEAD
git push origin main
# CI pipeline triggers wrangler deploy automatically
```

---

## Final Deployment Checklist

| # | Item | Status |
|---|------|--------|
| 1 | `wrangler whoami` verified | ☐ |
| 2 | Zone ID confirmed (`cadbf71f2c3aee47e0c299319cba570d`) | ☐ |
| 3 | Secrets stored: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEON_PROXY_API_KEY` | ☐ |
| 4 | `NEON_PROXY_URL` startup validation passes (HTTPS check) | ☐ |
| 5 | `OAUTH_METADATA_URL` proxies to `api.luckystore1947.com` (not self-referencing) | ☐ |
| 6 | DNS CNAME `agent.luckystore1947.com` → Worker (orange cloud) | ☐ |
| 7 | `npm run scan:secrets` clean | ☐ |
| 8 | All Miniflare tests passing | ☐ |
| 9 | CI pipeline green on `feat/agent.luckystore1947` | ☐ |
| 10 | Discovery endpoints curl-verified (all 5 paths) | ☐ |
| 11 | `/health` → 200, `/healthz` → composite status | ☐ |
| 12 | CORS: `*` on discovery, strict whitelist on `/api/*` (5 allowed origins) | ☐ |
| 13 | Rate-limit: 429 + `Retry-After` on 101st req | ☐ |
| 14 | Audit log: auth/role failures in Workers observability | ☐ |
| 15 | Security headers on all responses incl. errors | ☐ |
| 16 | Rollback procedure documented and tested | ☐ |
| 17 | Vercel `next.config.js` `Link` header added (storefront + admin portal) | ☐ |
| 18 | `npm run build` (storefront `lucky-store-bd.vercel.app`) passes | ☐ |
| 19 | `robots.txt` allows `/.well-known/`, `openapi.json` reachable | ☐ |
| 20 | neon-proxy source audit pre-passed (confirmed `isReadOnlyQuery()` L52-72) | ✅ |
| 21 | `app_metadata.role` used exclusively for `worker_agent` checks (not `user_metadata`) | ☐ |
| 22 | Proxy strips `Host`/`CF-*` headers — only safe headers forwarded upstream | ☐ |

---

## Optional Enhancements (Post-MVP)

- **Feature flag** — store `agent_enabled` bool in KV; fast disable without redeploy
- **Observability metrics** — `worker_requests_total`, `worker_errors_total` to Datadog/Axiom
- **JWKS rotation alert** — Slack webhook if JWKS fetch fails ≥ 2 times in window
- **KV/Durable Objects rate limiting** — upgrade from in-memory to KV (Workers paid ~$5/mo) or Durable Object for fully atomic, shared rate-limit counters under high concurrency
- **Cloudflare zone Rate Limiting rules** — free alternative to KV; configure in Cloudflare dashboard (Security → Rate Limiting) — no code change required
- **Git pre-commit hook** — `detect-secrets` runs before any commit touching Worker code

---

> **End of Plan v2.1.** Review corrections applied 2026-06-25:
> - `wrangler publish` → `wrangler deploy` (3 occurrences)
> - KV rate limiting → in-memory (free tier, V8 isolate caveat documented)
> - `ALLOWED_ORIGINS`: `lucky-store-bd.vercel.app` + `luckystore1947.com` (storefront), `lucky-store-pos-six.vercel.app` (admin portal)
> - `compatibility_date` → `2026-06-01`
> - `validateRole`: `app_metadata` only
> - Proxy: safe headers only (no Host/CF-* spread)
> - `/healthz`: Supabase `anon_key` on `/auth/v1/health`
> - `account_id` added to `wrangler.toml`
> - `OAUTH_METADATA_URL` → proxies to `api.luckystore1947.com` (not self-referencing)
> - `authorization_servers` → `hvmyxyccfnkrbxqbhlnm.supabase.co`
> - `robots.txt`: removed `Disallow: /.well-known/`
