# Meta-Level Plan: `agent.luckystore1947.com` — AI Agent Orchestrator Worker

> **Status:** Draft — awaiting review before execution  
> **Branch:** `feat/agent.luckystore1947`  
> **Created:** 2026-06-25  
> **Author:** Dracarys (Hermes Agent)  
> **For:** Mac / Lucky Store

---

## 1. Executive Summary

Deploy a new Cloudflare Worker at **`agent.luckystore1947.com`** that serves as the **central AI agent gateway** for Lucky Store. It consolidates all agent-facing capabilities — discovery, auth proxy, tool routing, and capability metadata — behind a single well-known subdomain.

This is **not** a rewrite of existing services. It is a **new, thin orchestration layer** that:
- Publishes RFC-compliant discovery endpoints (`.well-known/*`)
- Proxies authenticated requests to Supabase (the primary data layer)
- Routes agent tool calls to the appropriate backend (Supabase, R2 images, Neon)
- **Never stores the service role key in Vercel or the browser**

---

## 2. Architecture Decision

### 2.1 Target State

```
Internet
  │
  ├─ DNS: luckystore1947.com
  │   ├─ luckystore1947.com ──────→ Vercel (customer_storefront)
  │   ├─ admin.luckystore1947.com ─→ Vercel (admin_web)    [future]
  │   ├─ agent.luckystore1947.com ─→ Cloudflare Worker   [NEW]
  │   ├─ images.luckystore1947.com ─→ Cloudflare Worker   [EXISTING: R2 proxy]
  │   ├─ api.luckystore1947.com ───→ Cloudflare Worker   [EXISTING: OAuth metadata]
  │   └─ _index._agents ───────────→ SVCB/TXT records     [EXISTING]
  │
  └─ Workers
      ├─ agent-orchestrator  (agent.luckystore1947.com)    ← THIS PLAN
      ├─ images-proxy        (images.luckystore1947.com)   ← KEEP AS-IS
      ├─ neon-proxy          (lucky-store-neon-proxy.luckystore-1947.workers.dev) ← KEEP AS-IS
      └─ oauth-metadata      (api.luckystore1947.com)         ← KEEP AS-IS

Data Layer (unchanged)
  ├─ Supabase (primary): products, orders, users, RLS enforced
  ├─ Neon (secondary): SELECT-only analytics queries via neon-proxy
  └─ R2 (storage): product images via images-proxy
```

### 2.2 Core Principles

| Principle | Rationale |
|-----------|-----------|
| **Worker orchestrates, Supabase stores** | The Worker is a convenience layer, not a security perimeter. RLS is the actual boundary. |
| **Service role key stays in Worker secrets** | Never in Vercel env, never in browser bundle, never in git history. |
| **Reuse existing Workers** | `images.luckystore1947.com` and `neon-proxy` are working investments. Don't break them. |
| **CORS for Vercel origins, not Hostinger** | Frontends deploy on Vercel. Hostinger is email-only. |
| **SELECT-only from Neon** | The neon-proxy already enforces this. The agent Worker will route analytics queries there. |

---

## 3. Scope

### 3.1 In Scope (this plan)

- [ ] New Worker: `cloudflare/workers/agent-orchestrator/`
- [ ] DNS record: `agent.luckystore1947.com` → Worker (orange cloud, WAF)
- [ ] `.well-known/oauth-authorization-server` (proxied from Supabase + agent_auth extension)
- [ ] `.well-known/oauth-protected-resource` (RFC 9728 compliant)
- [ ] `.well-known/openid-configuration` (proxied from Supabase)
- [ ] `.well-known/agent-skills/index.json` (Agent Skills Discovery RFC v0.2.0)
- [ ] `.well-known/mcp/server-card.json` (MCP Server Card SEP-1649)
- [ ] `/auth.md` (agent registration instructions)
- [ ] CORS configuration locked to Vercel origins
- [ ] `wrangler.toml`, `package.json`, `tsconfig.json` for the new Worker

### 3.2 Out of Scope (respecting CLAUDE.md forbidden areas)

| Forbidden Area | Why Excluded |
|----------------|------------|
| `PosProvider` / state management | Core business logic — do not touch |
| `supabase/migrations/` | Schema changes require separate migration plan |
| Auth flow logic | Existing Supabase Auth is working; don't refactor |
| Core business logic | POS, inventory, order processing — unchanged |
| `/api/ai/*` LLM orchestration | Spec doesn't exist yet; add when there's a concrete design |
| WebMCP (`navigator.modelContext`) | Client-side browser API; belongs in `customer_storefront`, not Worker |
| Markdown negotiation middleware | Already exists in `customer_storefront` (`app/api/markdown/route.ts`) |
| robots.txt / sitemap | Already exists in `customer_storefront/public/` |
| DNS-AID SVCB records | Already configured via `scripts/dns_aid_setup.sh` |

---

## 4. Component Map

### 4.1 New Files (to be created)

```
cloudflare/workers/agent-orchestrator/
├── wrangler.toml              # Custom domain: agent.luckystore1947.com
├── package.json             # @cloudflare/workers-types, wrangler
├── tsconfig.json            # Worker TypeScript config
├── src/
│   ├── index.ts             # Main fetch handler, router, CORS
│   ├── routes/
│   │   ├── well-known.ts    # .well-known/* endpoints
│   │   ├── auth-proxy.ts    # Token validation, role gating
│   │   └── tools.ts         # Agent tool call router
│   └── lib/
│       ├── cors.ts          # CORS headers (Vercel origins only)
│       ├── supabase.ts      # Supabase client (service role from secret)
│       └── errors.ts        # Standard error responses
```

### 4.2 Modified Files (minimal, surgical)

| File | Change |
|------|--------|
| `package.json` (root) | Add `"deploy:agent-worker": "cd cloudflare/workers/agent-orchestrator && npx wrangler deploy"` |
| `apps/customer_storefront/next.config.js` | Add `Link` header pointing to `https://agent.luckystore1947.com/.well-known/*` |
| `.env.example` | Add `AGENT_WORKER_URL=https://agent.luckystore1947.com` |

### 4.3 Existing Workers (untouched, verified compatible)

| Worker | Domain | Status |
|--------|--------|--------|
| `images-proxy` | `images.luckystore1947.com` | ✅ KEEP — R2 upload/delete/serve |
| `neon-proxy` | `lucky-store-neon-proxy.luckystore-1947.workers.dev` | ✅ KEEP — SELECT-only analytics |
| `oauth-protected-resource` | `api.luckystore1947.com` | ✅ KEEP — RFC 9728 metadata |

---

## 5. Implementation Phases

### Phase 0: Prerequisites (before any code)

- [ ] Verify `cfat_` wrangler token is active (`wrangler whoami`)
- [ ] Confirm Cloudflare zone `luckystore1947.com` = `cadbf71f2c3aee47e0c299319cba570d`
- [ ] Set Worker secrets:
  ```bash
  cd cloudflare/workers/agent-orchestrator
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put SUPABASE_URL
  npx wrangler secret put NEON_PROXY_URL
  npx wrangler secret put NEON_API_KEY
  ```
- [ ] Note Vercel deployment URLs for CORS allowlist:
  - `https://adminweb-blond.vercel.app` (admin_web)
  - `https://lucky-store.vercel.app` (customer_storefront)

**Acceptance:** `wrangler whoami` returns account `8e457654e12c3b75d2094bbd8914030b`

---

### Phase 1: Worker Skeleton + Discovery Endpoints

**Goal:** Deploy a minimal Worker that serves `.well-known/*` and `/auth.md`.

- [ ] Create `cloudflare/workers/agent-orchestrator/` directory structure
- [ ] Write `wrangler.toml` with custom domain `agent.luckystore1947.com`
- [ ] Write `package.json` + `tsconfig.json`
- [ ] Implement `src/index.ts` — router for:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /.well-known/oauth-protected-resource`
  - `GET /.well-known/openid-configuration`
  - `GET /.well-known/agent-skills/index.json`
  - `GET /.well-known/mcp/server-card.json`
  - `GET /auth.md`
  - `OPTIONS /*` (CORS preflight)
- [ ] Implement CORS: `Access-Control-Allow-Origin` = Vercel origins only
- [ ] Deploy: `npx wrangler deploy`
- [ ] Create DNS record `agent.luckystore1947.com` → Worker (orange cloud)

**Acceptance:**
```bash
curl -s https://agent.luckystore1947.com/.well-known/oauth-protected-resource | jq '.resource'
# → "https://agent.luckystore1947.com"

curl -s https://agent.luckystore1947.com/.well-known/agent-skills/index.json | jq '.skills | length'
# → >= 1

curl -s https://agent.luckystore1947.com/auth.md | head -1
# → "# auth.md — Lucky Store Agent Authentication"
```

---

### Phase 2: Auth Proxy + Role Gating

**Goal:** Authenticate incoming requests and validate role from Supabase `users` table.

- [ ] Implement `src/routes/auth-proxy.ts`
  - Extract `Authorization: Bearer <token>` header
  - Validate JWT against Supabase JWKS (`/auth/v1/.well-known/jwks.json`)
  - Fetch user role from `users` table using service role key
  - Reject if role doesn't match required capability
- [ ] Implement `src/lib/supabase.ts` — Supabase client singleton
  - Service role key from `env.SUPABASE_SERVICE_ROLE_KEY`
  - URL from `env.SUPABASE_URL`
- [ ] Add route: `POST /api/agent/query` — authenticated Supabase RPC proxy
  - Validates JWT
  - Validates role
  - Forwards to Supabase PostgREST with service role
  - Returns result

**Acceptance:**
```bash
# Valid token + correct role → 200
curl -X POST https://agent.luckystore1947.com/api/agent/query \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"rpc": "get_products", "params": {"limit": 5}}' | jq '.products | length'
# → 5

# Invalid token → 401
curl -X POST https://agent.luckystore1947.com/api/agent/query \
  -H "Authorization: Bearer badtoken"
# → 401 {"error":"invalid_token"}

# Valid token + wrong role → 403
# → 403 {"error":"insufficient_role"}
```

---

### Phase 3: Agent Skills Discovery Index

**Goal:** Publish skill definitions that tell agents what they can do.

- [ ] Create `public/.well-known/agent-skills/` (in Worker, not storefront)
  - `index.json` — skills array with `$schema`, `name`, `type`, `description`, `url`, `sha256`
  - `browse-products.md` — endpoint, params, response format, auth requirements
  - `search-orders.md`
  - `check-inventory.md`
- [ ] Compute `sha256` for each skill markdown file
- [ ] Add skill entries to `index.json`
- [ ] Redeploy Worker

**Acceptance:**
```bash
curl -s https://agent.luckystore1947.com/.well-known/agent-skills/index.json | jq '.skills[].name'
# → "browse-products", "search-orders", "check-inventory"
```

---

### Phase 4: MCP Server Card + Tool Router

**Goal:** Expose MCP-compatible tool definitions and route tool calls.

- [ ] Implement `.well-known/mcp/server-card.json`:
  ```json
  {
    "serverInfo": { "name": "lucky-store", "version": "1.0.0" },
    "transport": { "type": "http", "endpoint": "https://agent.luckystore1947.com/api/mcp" },
    "capabilities": { "tools": true, "resources": false, "prompts": false },
    "tools": [
      { "name": "search_products", "description": "...", "inputSchema": {...} },
      { "name": "get_order_status", "description": "...", "inputSchema": {...} }
    ]
  }
  ```
- [ ] Implement `POST /api/mcp` — MCP tool call router
  - Parse JSON-RPC 2.0 request
  - Route to appropriate handler
  - Authenticate via JWT + role gate
  - Return JSON-RPC 2.0 response

**Acceptance:**
```bash
curl -X POST https://agent.luckystore1947.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {"name": "search_products", "arguments": {"query": "rice"}},
    "id": 1
  }' | jq '.result.products | length'
# → >= 1
```

---

### Phase 5: Integration with Existing Workers

**Goal:** The agent Worker can delegate to `images` and `neon-proxy` for non-Supabase operations.

- [ ] Add env vars to agent Worker:
  - `IMAGES_WORKER_URL=https://images.luckystore1947.com`
  - `NEON_PROXY_URL=https://lucky-store-neon-proxy.luckystore-1947.workers.dev`
- [ ] Implement tool handlers that forward to:
  - `images.luckystore1947.com` for image upload/delete (if agent has `write:media` scope)
  - `neon-proxy` for analytics queries (if agent has `read:analytics` scope)
- [ ] Ensure Neon proxy still only accepts SELECT queries (existing behavior)

**Acceptance:**
```bash
# Agent tool call that hits Neon proxy → returns analytics data
curl -X POST https://agent.luckystore1947.com/api/mcp \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_sales_summary","arguments":{"days":7}},"id":2}' \
  | jq '.result[0].total_sales'
# → numeric value
```

---

### Phase 6: Vercel Frontend Updates

**Goal:** Storefront and admin web know about the agent gateway.

- [ ] Update `apps/customer_storefront/next.config.js`:
  - Add `Link` header: `</.well-known/agent-skills/index.json>; rel="service-doc"` (pointing to agent subdomain)
- [ ] Update `apps/customer_storefront/public/auth.md`:
  - Change discovery URLs from `luckystore1947.com` to `agent.luckystore1947.com`
- [ ] Add `AGENT_WORKER_URL` to `.env.example`
- [ ] Verify build passes: `cd apps/customer_storefront && npm run build`

**Acceptance:** Storefront build succeeds, `Link` header includes agent subdomain.

---

### Phase 7: Security Hardening + Audit

**Goal:** Verify no secrets leak, CORS is tight, RLS still matters.

- [ ] Run `node scripts/secret_scan.js` — ensure no secrets in new code
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT in any `.env` file, git history, or Vercel env
- [ ] Verify CORS only allows Vercel origins (not `*`)
- [ ] Test that direct Supabase queries from browser still work (anon key + RLS)
- [ ] Test that admin dashboard queries route through agent Worker (service role)
- [ ] Document: "RLS is the real security boundary. Worker is convenience."

**Acceptance:** `npm run scan:secrets` passes clean.

---

### Phase 8: Documentation + Handoff

**Goal:** Mac can operate this without me.

- [ ] Write `docs/agent-worker.md` — architecture, deployment, troubleshooting
- [ ] Write `docs/agent-api-reference.md` — endpoints, auth, scopes, examples
- [ ] Update `CLAUDE.md` Allowed Files to include:
  - `cloudflare/workers/agent-orchestrator/*`
  - `docs/agent-worker.md`
  - `docs/agent-api-reference.md`
- [ ] Commit all changes with conventional commit: `feat(agent): deploy agent.luckystore1947.com orchestrator Worker`

**Acceptance:** Mac can read `docs/agent-worker.md` and redeploy independently.

---

## 6. Security Model

### 6.1 Secret Handling

| Secret | Location | Access Pattern |
|--------|----------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Wrangler secret only | `env.SUPABASE_SERVICE_ROLE_KEY` in Worker |
| `SUPABASE_ANON_KEY` | Vercel env + Flutter env | Frontend direct to Supabase (RLS enforced) |
| `NEON_API_KEY` | Wrangler secret only | Worker → neon-proxy |
| `R2_S3_KEYS` | Wrangler secret only | images-proxy Worker |

### 6.2 CORS Policy

```js
const ALLOWED_ORIGINS = [
  'https://adminweb-blond.vercel.app',
  'https://lucky-store.vercel.app',
  // Add custom domains when configured
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  return {}; // No CORS for unknown origins
}
```

### 6.3 Role Gating

```
Request → Extract JWT → Validate with Supabase JWKS →
  Query users table for role →
    Role matches required capability? → Forward to Supabase RPC
    Role doesn't match? → 403 Forbidden
```

**Critical:** UI gating alone is insufficient. The Worker validates `role` from `users` table post-auth.

---

## 7. Deployment Steps

```bash
# 1. Navigate to Worker directory
cd cloudflare/workers/agent-orchestrator

# 2. Install dependencies
npm install

# 3. Set secrets (interactive — never in files)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put NEON_PROXY_URL
npx wrangler secret put NEON_API_KEY

# 4. Deploy Worker
npx wrangler deploy

# 5. Add custom domain via Cloudflare dashboard
#    Workers & Pages → agent-orchestrator → Triggers → Add Custom Domain
#    → agent.luckystore1947.com (orange cloud ON)

# 6. Verify DNS
nslookup agent.luckystore1947.com

# 7. Verify endpoints
curl -s https://agent.luckystore1947.com/.well-known/oauth-protected-resource | jq

# 8. Update storefront Link headers
cd ../../../apps/customer_storefront
# edit next.config.js → add agent.luckystore1947.com references
npm run build

# 9. Commit
git add -A
git commit -m "feat(agent): deploy agent.luckystore1947.com orchestrator Worker"
git push origin feat/agent.luckystore1947
```

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Service role key leaked in git | Low | Critical | Wrangler secret only; run `secret_scan.js` pre-commit |
| CORS too permissive (`*`) | Medium | High | Explicit allowlist; reject unknown origins |
| Role gating bypassed | Low | Critical | Validate `role` from `users` table in Worker, not just UI |
| Neon proxy overloaded | Low | Medium | Keep SELECT-only; monitor query latency |
| `agent.luckystore1947.com` DNS conflict | Medium | Medium | Verify no existing record before creating |
| Worker exceeds Cloudflare free limits (100K req/day) | Low | Medium | Monitor; upgrade to paid plan if needed |
| Supabase Realtime connection limits (200 concurrent) | Low | Low | Not a Day 1 blocker; monitor on higher tiers |

---

## 9. Dependencies

| Dependency | Status | Required By |
|------------|--------|-------------|
| Cloudflare account (`8e457654e12c3b75d2094bbd8914030b`) | ✅ Active | All phases |
| `cfat_` wrangler token | ✅ Active | Phases 0–8 |
| Zone `luckystore1947.com` (`cadbf71f2c3aee47e0c299319cba570d`) | ✅ Active | Phase 1 |
| Supabase project (`hvmyxyccfnkrbxqbhlnm`) | ✅ Active | All phases |
| Neon proxy Worker | ✅ Deployed | Phase 5 |
| Images proxy Worker | ✅ Deployed | Phase 5 |
| Vercel storefront deployment URL | ✅ Known | Phase 1, 6 |
| Vercel admin deployment URL | ✅ Known | Phase 1, 6 |

---

## 10. Success Criteria

After all 8 phases:

1. ✅ `agent.luckystore1947.com` resolves and returns 200 for `.well-known/*`
2. ✅ `/.well-known/oauth-protected-resource` has `resource` = `https://agent.luckystore1947.com`
3. ✅ `auth.md` is accessible at `https://agent.luckystore1947.com/auth.md`
4. ✅ `secret_scan.js` passes clean (no leaked keys)
5. ✅ CORS only allows Vercel origins (test with `curl -H "Origin: https://evil.com"` → no ACAO header)
6. ✅ Authenticated POST to `/api/agent/query` returns data; unauthenticated → 401
7. ✅ MCP tool calls route correctly to Supabase, Neon, or R2 as appropriate
8. ✅ Storefront build passes with updated Link headers
9. ✅ All changes committed to `feat/agent.luckystore1947` branch
10. ✅ `docs/agent-worker.md` exists and is readable by a human

---

## 11. Appendix: File Templates (Reference)

### 11.1 `wrangler.toml`

```toml
name = "agent-orchestrator"
main = "src/index.ts"
compatibility_date = "2025-06-01"

[[routes]]
pattern = "agent.luckystore1947.com"
custom_domain = true

[observability.logs]
enabled = true
invocation_logs = true
```

### 11.2 Minimal `src/index.ts` Router

```ts
import { handleWellKnown } from './routes/well-known';
import { handleAuthProxy } from './routes/auth-proxy';
import { handleTools } from './routes/tools';
import { getCorsHeaders } from './lib/cors';

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  NEON_PROXY_URL: string;
  NEON_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = getCorsHeaders(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Router
    if (url.pathname.startsWith('/.well-known/')) {
      return handleWellKnown(request, env, cors);
    }
    if (url.pathname === '/auth.md') {
      return new Response(AUTH_MD_CONTENT, { status: 200, headers: { 'Content-Type': 'text/markdown', ...cors } });
    }
    if (url.pathname.startsWith('/api/agent/')) {
      return handleAuthProxy(request, env, cors);
    }
    if (url.pathname === '/api/mcp') {
      return handleTools(request, env, cors);
    }

    // Default: 404 with CORS
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } });
  },
};
```

### 11.3 `package.json`

```json
{
  "name": "lucky-store-agent-orchestrator",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260623.1",
    "typescript": "^5.9.2",
    "wrangler": "^4.104.0"
  }
}
```

---

> **End of Plan.** Review, edit, or approve for execution.
