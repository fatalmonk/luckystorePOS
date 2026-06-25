# Meta-Level Plan: `agent.luckystore1947.com` — AI Agent Orchestrator Worker

> **Status:** Reviewed — ready for execution  
> **Branch:** `feat/agent.luckystore1947`  
> **Created:** 2026-06-25  
> **Version:** 3.0 (post-review, all corrections incorporated)  
> **Reviewed by:** Antigravity (2026-06-25)  
> **Author:** Dracarys (Hermes Agent)  
> **For:** Mac / Lucky Store

---

## 1. Executive Summary

Deploy a new Cloudflare Worker at **`agent.luckystore1947.com`** that serves as the **central AI agent gateway** for Lucky Store. It consolidates all agent-facing capabilities — discovery, auth proxy, tool routing, and capability metadata — behind a single well-known subdomain.

This is **not** a rewrite of existing services. It is a **new, thin orchestration layer** that:
- Publishes RFC-compliant discovery endpoints (`.well-known/*`)
- Proxies `/.well-known/oauth-protected-resource` to `api.luckystore1947.com` (single source of truth)
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
| **Worker validates, RLS enforces** | The Worker is the gate. RLS is the safety net. Both must pass for every request. |
| **Service role key stays in Worker secrets** | Never in Vercel env, never in browser bundle, never in git history. |
| **Reuse existing Workers** | `images.luckystore1947.com` and `neon-proxy` are working investments. Don't break them. |
| **Split CORS by route type** | `*` for public discovery routes (`/.well-known/*`, `/auth.md`). Strict Vercel-only for data routes (`/api/*`). |
| **SELECT-only from Neon** | The neon-proxy already enforces this (`isReadOnlyQuery()` validated). The agent Worker will route analytics queries there. |
| **Proxy, don't duplicate, oauth metadata** | `/.well-known/oauth-protected-resource` proxies to `api.luckystore1947.com` — single source of truth. |

---

## 3. Scope

### 3.1 In Scope (this plan)

- [ ] New Worker: `cloudflare/workers/agent-orchestrator/`
- [x] DNS record: `agent.luckystore1947.com` → Worker (automatically created on deploy via `custom_domain = true` in wrangler.toml)
- [ ] `.well-known/oauth-authorization-server` (proxied from Supabase + agent_auth extension)
- [ ] `.well-known/oauth-protected-resource` (**proxied from `api.luckystore1947.com`** — not duplicated)
- [ ] `.well-known/openid-configuration` (proxied from Supabase)
- [ ] `.well-known/agent-skills/index.json` (Agent Skills Discovery RFC v0.2.0)
- [ ] `.well-known/mcp/server-card.json` (MCP Server Card SEP-1649)
- [ ] `/auth.md` (agent registration instructions)
- [ ] `/health` (health check endpoint for uptime monitoring)
- [ ] Split CORS: `*` for discovery routes, Vercel-only for `/api/*` data routes
- [ ] Per-IP rate limiting (100 requests/min on `/api/*` routes)
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
│   ├── index.ts             # Main fetch handler, router, split CORS, request ID
│   ├── routes/
│   │   ├── well-known.ts    # .well-known/* endpoints (proxies oauth-protected-resource)
│   │   ├── auth-proxy.ts    # Token validation, role gating, JWKS cache
│   │   └── tools.ts         # Agent tool call router
│   └── lib/
│       ├── cors.ts          # Split CORS: * for discovery, strict for /api/*
│       ├── rate-limit.ts    # Per-IP rate limiter (100 req/min on /api/*)
│       ├── supabase.ts      # Supabase client (service role from secret)
│       ├── jwks.ts          # JWKS fetch + in-memory cache + kid rotation
│       ├── role-cache.ts    # (userId, role) in-memory cache with TTL
│       ├── request-id.ts    # UUIDv4 generation + propagation
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
- [x] ~~**Audit `neon-proxy` source code**~~ — **PRE-PASSED.** `isReadOnlyQuery()` in `cloudflare/workers/neon-proxy/src/index.ts` (L52-72) validates SELECT/WITH prefix, strips string literals, blocks 13 forbidden keywords. `x-api-key` header validated at L98-104. No gaps found.
- [ ] Set Worker secrets:
  ```bash
  cd cloudflare/workers/agent-orchestrator
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put SUPABASE_URL
  npx wrangler secret put NEON_PROXY_API_KEY   # the x-api-key for neon-proxy Worker
  ```
- [ ] **Do NOT store `NEON_PROXY_URL` as a secret.** It's a public Worker URL. Put it in `wrangler.toml` under `[vars]`.
- [ ] Note Vercel deployment URLs for CORS allowlist (data routes only):
  - `https://adminweb-blond.vercel.app` (admin_web)
  - `https://lucky-store.vercel.app` (customer_storefront)

**Acceptance:**
```bash
wrangler whoami  # returns account 8e457654e12c3b75d2094bbd8914030b
```

---

### Phase 1: Worker Skeleton + Discovery Endpoints

**Goal:** Deploy a minimal Worker that serves `.well-known/*` and `/auth.md`.

- [ ] Create `cloudflare/workers/agent-orchestrator/` directory structure
- [ ] Write `wrangler.toml` with custom domain `agent.luckystore1947.com`
  - `account_id = "8e457654e12c3b75d2094bbd8914030b"` (consistent with neon-proxy)
  - `compatibility_date = "2026-06-01"` (not 2025 — future-proof)
  - `[vars]` section for `NEON_PROXY_URL` (public, not secret)
- [ ] Write `package.json` + `tsconfig.json`
- [ ] Implement `src/lib/request-id.ts` — generate `x-request-id` (UUIDv4) on every request
- [ ] Implement `src/lib/cors.ts` — **split CORS:**
  - `/.well-known/*`, `/auth.md`, `/health` → `Access-Control-Allow-Origin: *` (public discovery)
  - `/api/*` → explicit Vercel origin allowlist + `Vary: Origin`
- [ ] Implement `src/lib/rate-limit.ts` — per-IP rate limiter (100 req/min on `/api/*` routes)
- [ ] Implement `src/index.ts` — router for:
  - `GET /health` — health check (returns `{"status":"ok"}`)
  - `GET /.well-known/oauth-authorization-server`
  - `GET /.well-known/oauth-protected-resource` — **proxy to `https://api.luckystore1947.com/.well-known/oauth-protected-resource`** (single source of truth)
  - `GET /.well-known/openid-configuration`
  - `GET /.well-known/agent-skills/index.json`
  - `GET /.well-known/mcp/server-card.json`
  - `GET /auth.md`
  - `OPTIONS /*` (CORS preflight)
- [ ] Deploy: `npx wrangler deploy` (automatically configures the custom domain and DNS records in Cloudflare via `custom_domain = true` in wrangler.toml)

**Acceptance:**
```bash
curl -s https://agent.luckystore1947.com/.well-known/oauth-protected-resource | jq '.resource'
# → "https://api.luckystore1947.com" (proxied, not duplicated)

curl -s https://agent.luckystore1947.com/health | jq '.status'
# → "ok"

curl -s https://agent.luckystore1947.com/.well-known/agent-skills/index.json | jq '.skills | length'
# → >= 1

curl -s https://agent.luckystore1947.com/auth.md | head -1
# → "# auth.md — Lucky Store Agent Authentication"

curl -sI https://agent.luckystore1947.com/.well-known/oauth-protected-resource | grep x-request-id
# → x-request-id: <uuid>

# Discovery routes return * CORS
curl -sI -H "Origin: https://any-agent.example.com" https://agent.luckystore1947.com/.well-known/oauth-protected-resource | grep -i access-control-allow-origin
# → Access-Control-Allow-Origin: *

# Data routes reject unknown origins
curl -sI -H "Origin: https://evil.com" https://agent.luckystore1947.com/api/agent/query | grep -i access-control-allow-origin
# → (no output = correct)
```

---

### Phase 2: Auth Proxy + Role Gating

**Goal:** Authenticate incoming requests and validate role from Supabase `users` table.

- [ ] Implement `src/lib/jwks.ts`
  - Fetch JWKS from `https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/.well-known/jwks.json` once at startup
  - Cache in module-level variable
  - On `kid` mismatch, refetch JWKS automatically
  - If Supabase JWKS is unreachable, return 503 (don't fail open)
- [ ] Implement `src/lib/role-cache.ts`
  - In-memory cache: `Map<userId, { role: string; expiresAt: number }>`
  - TTL: 60 seconds
  - Fallback to Supabase `users` table query on cache miss
- [ ] Implement `src/routes/auth-proxy.ts`
  - Extract `Authorization: Bearer <...03e` header
  - Validate JWT locally using cached JWKS (no network call per request)
  - Look up role from `role-cache.ts` (cached, not DB per request)
  - Reject if role doesn't match required capability
  - Include `x-request-id` in all responses
- [ ] Implement `src/lib/supabase.ts` — Supabase client singleton
  - Service role key from `env.SUPABASE_SERVICE_ROLE_KEY`
  - URL from `env.SUPABASE_URL`
- [ ] Add route: `POST /api/agent/query` — authenticated Supabase RPC proxy
  - Validates JWT (cached JWKS)
  - Validates role (cached lookup)
  - Forwards to Supabase PostgREST with service role
  - Propagates `x-request-id` to Supabase RPC call (if RPC function accepts it)
  - Returns result

**Acceptance:**
```bash
# Valid token + correct role → 200
curl -X POST https://agent.luckystore1947.com/api/agent/query \
  -H "Authorization: Bearer <...3e" \
  -H "x-request-id: test-123" \
  -d '{"rpc": "get_products", "params": {"limit": 5}}' | jq '.products | length'
# → 5

# Invalid token → 401
curl -X POST https://agent.luckystore1947.com/api/agent/query \
  -H "Authorization: Bearer <invalid>"
# → 401 {"error":"invalid_token","request_id":"..."}

# Valid token + wrong role → 403
# → 403 {"error":"insufficient_role","request_id":"..."}
```

---

### Phase 3: Agent Skills Discovery Index

**Goal:** Publish skill definitions that tell agents what they can do.

- [ ] Create `public/.well-known/agent-skills/` (in Worker, not storefront)
  - `index.json` — skills array with `$schema`, `version`, `name`, `type`, `description`, `url`, `sha256`, `deprecated`
  - `browse-products.md` — endpoint, params, response format, auth requirements
  - `search-orders.md`
  - `check-inventory.md`
- [ ] Compute `sha256` for each skill markdown file
- [ ] Add `version: "1.0.0"` to index root
- [ ] Add `deprecated: false` to each skill entry
- [ ] Add skill entries to `index.json`
- [ ] Redeploy Worker

**Acceptance:**
```bash
curl -s https://agent.luckystore1947.com/.well-known/agent-skills/index.json | jq '{version: .version, skills: [.skills[].name]}'
# → {"version":"1.0.0","skills":["browse-products","search-orders","check-inventory"]}
```

---

### Phase 4: MCP Server Card + Tool Router

**Goal:** Expose MCP-compatible tool definitions and route tool calls.

- [ ] Implement `.well-known/mcp/server-card.json` with `authentication` metadata:
  ```json
  {
    "serverInfo": { "name": "lucky-store", "version": "1.0.0" },
    "authentication": {
      "type": "bearer",
      "scheme": "https://agent.luckystore1947.com/auth.md"
    },
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
  - Authenticate via JWT + role gate (same as `/api/agent/query`)
  - Return JSON-RPC 2.0 response
  - Include `x-request-id` in response

**Acceptance:**
```bash
curl -X POST https://agent.luckystore1947.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <...3e" \
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

- [ ] Add `[vars]` to `wrangler.toml` (not secrets):
  - `IMAGES_WORKER_URL=https://images.luckystore1947.com`
  - `NEON_PROXY_URL=https://lucky-store-neon-proxy.luckystore-1947.workers.dev`
- [ ] Implement tool handlers that forward to:
  - `images.luckystore1947.com` for image upload/delete (if agent has `write:media` scope)
  - `neon-proxy` for analytics queries (if agent has `read:analytics` scope)
- [x] ~~**neon-proxy hardening:**~~ **NOT NEEDED.** Phase 0 audit confirmed `isReadOnlyQuery()` blocks all write/DDL keywords at parser level. No agent Worker–side validation needed.
- [ ] Propagate `x-request-id` to downstream Workers

**Acceptance:**
```bash
# Agent tool call that hits Neon proxy → returns analytics data
curl -X POST https://agent.luckystore1947.com/api/mcp \
  -H "Authorization: Bearer <...3e" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_sales_summary","arguments":{"days":7}},"id":2}' \
  | jq '.result[0].total_sales'
# → numeric value

# Attempted write query → blocked at agent Worker
# → 403 {"error":"write_queries_forbidden","request_id":"..."}
```

---

### Phase 6: Vercel Frontend Updates

**Goal:** Storefront and admin web know about the agent gateway.

- [ ] Update `apps/customer_storefront/next.config.js`:
  - Add `Link` header: `<https://agent.luckystore1947.com/.well-known/agent-skills/index.json>; rel="alternate"` (use `rel="alternate"` or custom relation, not non-standard `service-doc`)
- [ ] Update `apps/customer_storefront/public/auth.md`:
  - Change discovery URLs from `luckystore1947.com` to `agent.luckystore1947.com`
- [ ] Add `AGENT_WORKER_URL` to `.env.example`
- [ ] Verify build passes: `cd apps/customer_storefront && npm run build`

**Acceptance:** Storefront build succeeds, `Link` header includes agent subdomain.

---

### Phase 7: Security Hardening + Audit

**Goal:** Verify no secrets leak, split CORS is correct, defense in depth holds.

- [ ] Run `node scripts/secret_scan.js` — ensure no secrets in new code
  - If `scripts/secret_scan.js` does not exist, create it or use `git-secrets` / `detect-secrets` as fallback
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT in any `.env` file, git history, or Vercel env
- [ ] Verify split CORS works correctly:
  ```bash
  # Discovery routes → * (correct for public metadata)
  curl -sI -H "Origin: https://any-agent.example.com" https://agent.luckystore1947.com/.well-known/oauth-protected-resource | grep -i access-control-allow-origin
  # → Access-Control-Allow-Origin: *

  # Data routes → reject unknown origins
  curl -sI -H "Origin: https://evil.com" https://agent.luckystore1947.com/api/agent/query | grep -i access-control-allow-origin
  # → (no output = correct)

  # Data routes → allow Vercel origins
  curl -sI -H "Origin: https://lucky-store.vercel.app" https://agent.luckystore1947.com/api/agent/query | grep -i access-control-allow-origin
  # → Access-Control-Allow-Origin: https://lucky-store.vercel.app
  ```
- [ ] Verify rate limiting works: send 101 rapid requests to `/api/agent/query` → 429 on 101st
- [ ] Test that direct Supabase queries from browser still work (anon key + RLS)
- [ ] Test that admin dashboard queries route through agent Worker (service role)
- [ ] Document: "Worker validates intent and identity. RLS enforces database access. Both must pass."
- [ ] Verify `x-request-id` propagates end-to-end: agent Worker → Supabase RPC → response

**Acceptance:** `npm run scan:secrets` passes clean (or equivalent tool).

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
| `NEON_PROXY_API_KEY` | Wrangler secret only | Forwarded as `x-api-key` header to neon-proxy Worker |
| `R2_S3_KEYS` | Wrangler secret only | images-proxy Worker |
| `NEON_PROXY_URL` | `wrangler.toml` `[vars]` (public) | Not a secret — public Worker URL |

**Note:** `NEON_PROXY_URL` is public by design. neon-proxy validates `x-api-key` header (confirmed in audit, L98-104 of `neon-proxy/src/index.ts`). The agent Worker stores this key as `NEON_PROXY_API_KEY` and forwards it.

### 6.2 CORS Policy (Split Model)

CORS is split by route type — public discovery vs authenticated data:

| Route Pattern | CORS | Credentials | Rationale |
|---------------|------|-------------|----------|
| `/.well-known/*` | `*` | No | Public metadata — any agent must discover it |
| `/auth.md` | `*` | No | Public documentation |
| `/health` | `*` | No | Public health check |
| `/api/*` | Vercel origins only | Yes | Authenticated data — strict origin matching |

**Warning:** `Access-Control-Allow-Credentials: true` is only safe with explicit origin matching. The `/api/*` routes never return `*` — they return an exact origin or nothing.

```js
const ALLOWED_DATA_ORIGINS = [
  'https://adminweb-blond.vercel.app',
  'https://lucky-store.vercel.app',
  // Add custom domains when configured
];

// Discovery routes: public access
const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Data routes: strict origin matching
function getDataCorsHeaders(origin) {
  if (ALLOWED_DATA_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    };
  }
  return {}; // No CORS for unknown origins
}

// Router determines which CORS to use based on pathname
function getCorsHeaders(pathname, origin) {
  if (pathname.startsWith('/.well-known/') || pathname === '/auth.md' || pathname === '/health') {
    return PUBLIC_CORS;
  }
  return getDataCorsHeaders(origin);
}
```

**Note:** The existing `api.luckystore1947.com` Worker also uses `*` CORS — this is correct because it only serves public RFC 9728 metadata (no data, no auth required).

### 6.3 Role Gating

```
Request → Extract JWT → Validate with cached JWKS →
  Look up role from in-memory cache (TTL 60s) →
    Cache miss? Query users table → store in cache →
    Role matches required capability? → Forward to Supabase RPC
    Role doesn't match? → 403 Forbidden
```

**Critical:** The Worker validates `role` from `users` table post-auth. RLS policies enforce database-level access. Neither alone is sufficient.

### 6.4 V8 Isolate Cache Behavior

> **Note:** Cloudflare Workers use V8 isolates. Module-level `Map` caches (JWKS, role) persist **within an isolate** but:
> - Isolates are evicted under memory pressure
> - Multiple isolates serve concurrent requests (no shared state between them)
> - Cold starts create fresh isolates with empty caches
>
> This means cache hit rates will be lower than on a traditional server. For Lucky Store's traffic volume, this is acceptable — cache misses just add a Supabase round-trip. If cache hit rates become a concern at scale, migrate to Cloudflare Workers KV with TTL.

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
npx wrangler secret put NEON_PROXY_API_KEY

# 4. Deploy Worker
npx wrangler deploy

# 5. Add custom domain via Cloudflare dashboard
#    Workers & Pages → agent-orchestrator → Triggers → Add Custom Domain
#    → agent.luckystore1947.com (orange cloud ON)

# 6. Verify DNS
nslookup agent.luckystore1947.com

# 7. Verify endpoints
curl -s https://agent.luckystore1947.com/.well-known/oauth-protected-resource | jq

# 8. Verify request ID propagation
curl -sI https://agent.luckystore1947.com/.well-known/oauth-protected-resource | grep x-request-id

# 9. Update storefront Link headers
cd ../../../apps/customer_storefront
# edit next.config.js → add agent.luckystore1947.com references
npm run build

# 10. Commit
git add -A
git commit -m "feat(agent): deploy agent.luckystore1947.com orchestrator Worker"
git push origin feat/agent.luckystore1947
```

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Service role key leaked in git | Low | Critical | Wrangler secret only; run `secret_scan.js` pre-commit |
| CORS too permissive on `/api/*` | Low | High | Split CORS model: `*` only on discovery routes, strict allowlist on `/api/*` |
| Role gating bypassed | Low | Critical | Validate `role` from `users` table in Worker; cache with TTL; RLS enforces |
| JWKS cache stale after rotation | Low | High | Auto-refetch on `kid` mismatch; don't fail open |
| Role cache stale after role change | Medium | Low | 60s TTL; acceptable latency for role propagation |
| V8 isolate eviction clears caches | Medium | Low | Cache miss = one Supabase round-trip; acceptable at current traffic |
| Neon proxy overloaded | Low | Medium | Keep SELECT-only (validated); monitor query latency |
| `agent.luckystore1947.com` DNS conflict | Medium | Medium | Verify no existing record before creating |
| Worker exceeds Cloudflare free limits (100K req/day) | Low | Medium | All 4 Workers share 100K/day pool. Lucky Store traffic is well under this. Monitor |
| Supabase Realtime connection limits (200 concurrent) | Low | Low | Not a Day 1 blocker; monitor on higher tiers |
| neon-proxy direct access (bypass agent Worker) | Low | Medium | neon-proxy validates `x-api-key` header (audit confirmed L98-104) |

---

## 9. Dependencies

| Dependency | Status | Required By |
|------------|--------|-------------|
| Cloudflare account (`8e457654e12c3b75d2094bbd8914030b`) | ✅ Active | All phases |
| `cfat_` wrangler token | ✅ Active | Phases 0–8 |
| Zone `luckystore1947.com` (`cadbf71f2c3aee47e0c299319cba570d`) | ✅ Active | Phase 1 |
| Supabase project (`hvmyxyccfnkrbxqbhlnm`) | ✅ Active | All phases |
| Neon proxy Worker | ✅ Deployed, ✅ Audited | Phase 5 |
| Images proxy Worker | ✅ Deployed | Phase 5 |
| Vercel storefront deployment URL | ✅ Known | Phase 1, 6 |
| Vercel admin deployment URL | ✅ Known | Phase 1, 6 |

---

## 10. Success Criteria

After all 8 phases:

1. ✅ `agent.luckystore1947.com` resolves and returns 200 for `.well-known/*`
2. ✅ `/.well-known/oauth-protected-resource` proxies from `api.luckystore1947.com` (resource = `https://api.luckystore1947.com`)
3. ✅ `auth.md` is accessible at `https://agent.luckystore1947.com/auth.md`
4. ✅ `/health` returns `{"status":"ok"}`
5. ✅ `secret_scan.js` passes clean (or equivalent tool verifies no leaked keys)
6. ✅ Split CORS works: `*` on discovery routes, Vercel-only on `/api/*` (test with `curl -H "Origin: https://evil.com"` on `/api/*` → no ACAO header)
7. ✅ Rate limiting works: 101st rapid request to `/api/*` → 429
8. ✅ Authenticated POST to `/api/agent/query` returns data; unauthenticated → 401; wrong role → 403
9. ✅ MCP tool calls route correctly to Supabase, Neon, or R2 as appropriate
10. ✅ Storefront build passes with updated Link headers
11. ✅ All changes committed to `feat/agent.luckystore1947` branch
12. ✅ `docs/agent-worker.md` exists and is readable by a human
13. ✅ `x-request-id` propagates end-to-end (visible in response headers)
14. ✅ JWKS caching works (no Supabase JWKS fetch on every request)
15. ✅ Role caching works (no `users` table query on cache hit)
16. ✅ Agent skills index includes `version` and `deprecated` fields
17. ✅ MCP server card includes `authentication` metadata

---

## 11. Appendix: File Templates (Reference)

### 11.1 `wrangler.toml`

```toml
name = "agent-orchestrator"
main = "src/index.ts"
compatibility_date = "2026-06-01"
account_id = "8e457654e12c3b75d2094bbd8914030b"

[[routes]]
pattern = "agent.luckystore1947.com"
custom_domain = true

[vars]
NEON_PROXY_URL = "https://lucky-store-neon-proxy.luckystore-1947.workers.dev"
IMAGES_WORKER_URL = "https://images.luckystore1947.com"
OAUTH_METADATA_URL = "https://api.luckystore1947.com/.well-known/oauth-protected-resource"

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
import { generateRequestId } from './lib/request-id';

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  NEON_PROXY_API_KEY: string;    // x-api-key for neon-proxy Worker
  NEON_PROXY_URL: string;        // from [vars], not secret
  IMAGES_WORKER_URL: string;     // from [vars], not secret
  OAUTH_METADATA_URL: string;    // from [vars], proxied oauth-protected-resource
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = generateRequestId();
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = getCorsHeaders(url.pathname, origin); // split CORS by route type

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'x-request-id': requestId } });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json', ...cors, 'x-request-id': requestId },
      });
    }

    // Rate limit on data routes
    if (url.pathname.startsWith('/api/')) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!checkRate(ip, 100)) {
        return new Response(JSON.stringify({ error: 'rate_limit_exceeded', request_id: requestId }), {
          status: 429, headers: { 'Content-Type': 'application/json', ...cors, 'x-request-id': requestId, 'Retry-After': '60' },
        });
      }
    }

    // Router
    if (url.pathname.startsWith('/.well-known/')) {
      return handleWellKnown(request, env, cors, requestId);
    }
    if (url.pathname === '/auth.md') {
      return new Response(AUTH_MD_CONTENT, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown', ...cors, 'x-request-id': requestId },
      });
    }
    if (url.pathname.startsWith('/api/agent/')) {
      return handleAuthProxy(request, env, cors, requestId);
    }
    if (url.pathname === '/api/mcp') {
      return handleTools(request, env, cors, requestId);
    }

    // Default: 404 with CORS + request ID
    return new Response(
      JSON.stringify({ error: 'not_found', request_id: requestId }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...cors, 'x-request-id': requestId } },
    );
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

### 11.4 JWKS Cache + Rotation Handler

```ts
// src/lib/jwks.ts
let jwksCache: { keys: JsonWebKey[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 300_000; // 5 minutes

export async function getJwks(env: Env): Promise<JsonWebKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const data = await res.json();
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return jwksCache.keys;
}

export function invalidateJwksCache() {
  jwksCache = null;
}
```

### 11.5 Role Cache

```ts
// src/lib/role-cache.ts
const roleCache = new Map<string, { role: string; expiresAt: number }>();
const ROLE_TTL_MS = 60_000; // 60 seconds

export function getCachedRole(userId: string): string | undefined {
  const entry = roleCache.get(userId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.role;
  }
  roleCache.delete(userId);
  return undefined;
}

export function setCachedRole(userId: string, role: string) {
  roleCache.set(userId, { role, expiresAt: Date.now() + ROLE_TTL_MS });
}
```

### 11.6 Request ID Generator

```ts
// src/lib/request-id.ts
export function generateRequestId(): string {
  return crypto.randomUUID();
}
```

---

## 12. Cost Analysis

This plan uses **$0 additional infrastructure cost**. All components run on existing free tiers:

| Service | Free Tier Limit | Impact of This Plan |
|---------|----------------|--------------------|
| Cloudflare Workers | 100K requests/day (account-wide) | Adds 1 Worker to existing pool of 3. Lucky Store traffic well under limit |
| Cloudflare DNS | Free (included with zone) | 1 new CNAME record for `agent.luckystore1947.com` |
| Cloudflare Custom Domains | Free on Workers | Already using for `api.` and `images.` |
| Supabase | Existing plan | No new project — agent Worker proxies to existing project |
| Neon | Existing connection | No new resources — delegates to existing neon-proxy |

**Trigger for paid upgrade:** Exceeding 100K total Worker requests/day across all 4 Workers. At current traffic levels, this is not expected.

---

> **End of Plan v3.0.** All review corrections incorporated:
> - oauth-protected-resource: proxy to `api.luckystore1947.com` (option A)
> - Split CORS: `*` for discovery, strict for `/api/*`
> - neon-proxy audit pre-passed
> - `NEON_API_KEY` → `NEON_PROXY_API_KEY`
> - Added: `account_id`, `/health`, rate limiting, V8 cache docs, cost analysis
