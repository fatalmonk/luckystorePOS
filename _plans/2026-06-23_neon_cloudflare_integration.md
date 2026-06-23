# Integration Plan: Neon + Cloudflare into Lucky Store

> **Status:** Draft — awaiting approval
> **Date:** 2026-06-23
> **Author:** Dracarys

---

## Current Architecture (AS-IS)

| Layer | Technology | Details |
|-------|-----------|---------|
| Database | Supabase Postgres | `hvmyxyccfnkrbxqbhlnm` (ap-northeast-1, Tokyo) |
| Auth | Supabase Auth | Email/password, OAuth, RLS policies |
| Edge Functions | Supabase Functions (Deno) | `create-sale`, `payment-*`, `post-facebook`, `send-whatsapp-message`, etc. |
| Storage | Supabase Storage | Product images, receipts |
| Realtime | Supabase Realtime | `useRealtime` hook in admin_web |
| Admin Web | React 19 + Vite SPA | Deployed to Vercel (`adminweb-blond.vercel.app`) |
| Customer Storefront | Next.js 15 | Deployed to Vercel (`lucky-store.vercel.app`) |
| Mobile App | Flutter | Local SQLite (drift) + Supabase sync |
| Migrations | 151 SQL files | `supabase/migrations/` |
| Neon | **Credentials exist, nothing uses it** | `DATABASE_URL` + `DIRECT_DATABASE_URL` in `.env` / `.env.local` |
| Cloudflare | **Not present** | Only `pg-cloudflare` as transitive dep of `pg` |

---

## What Neon + Cloudflare Add

### Neon — Analytics Read Replica + Dev Branching

**Problem:** The admin dashboard runs heavy read queries (reports, charts, ledger, competitor pricing) on the same Supabase Postgres that handles transactional writes (POS sales, stock adjustments, inventory). Under concurrent load (POS checkout + dashboard refresh), read queries slow down writes and vice versa.

**Solution:** Use Neon as a dedicated **analytics/read database**:
- Sync data from Supabase → Neon (logical replication or scheduled pg_dump/restore)
- Point all read-heavy admin features (Dashboard, Reports, Ledger, Competitor Prices) to Neon
- Keep all writes (POS, inventory, purchases) on Supabase
- Use Neon's **database branching** for preview/staging environments per PR

**Why Neon specifically:**
- Serverless driver (`@neondatabase/serverless`) — HTTP-based, perfect for Vercel serverless functions
- Branching — spin up a full DB copy per branch for testing migrations
- Free tier covers the read load for a single store
- Already has credentials in `.env`

### Cloudflare — CDN + Image Optimization + Edge Rate Limiting

**Problem:** Storefront images served from Supabase Storage have high latency (Tokyo region → Bangladesh users). No DDoS protection or edge caching on Vercel. Rate limiting is done in-app (Supabase Edge Functions) which is too late in the request chain.

**Solution:**
1. **CDN** — Proxy both Vercel apps through Cloudflare for edge caching of static assets and storefront pages
2. **R2 Storage** — Migrate product images from Supabase Storage → Cloudflare R2 (zero egress fees, S3-compatible)
3. **Cloudflare Workers** — Edge-side rate limiting and geo-blocking before requests hit Vercel
4. **Cloudflare Images** (optional) — Automatic format conversion + resize for storefront product images

---

## Integration Phases

### Phase 1: Neon Analytics Read Replica (1-2 days)

**Goal:** Route read-heavy admin queries to Neon, keep writes on Supabase.

#### 1.1 Set up Neon schema
- Export current Supabase schema: `pg_dump --schema-only`
- Import into Neon: `psql $DIRECT_DATABASE_URL < schema.sql`
- Verify all 151 migrations apply cleanly

#### 1.2 Set up data sync
- **Option A (real-time):** Logical replication (Supabase → Neon) — Supabase WAL → Neon subscriber
- **Option B (scheduled):** Cron job `pg_dump` from Supabase → `pg_restore` to Neon every N minutes
- **Recommendation:** Start with Option B (simpler), upgrade to A if staleness is a problem

#### 1.3 Create Neon client in admin_web
```
apps/admin_web/src/lib/neon.ts
```
- Install `@neondatabase/serverless`
- Create a `neonClient` using HTTP driver (no connection pooling needed)
- Only for read queries — never write

#### 1.4 Route read-heavy domains to Neon
Files to modify (read-only queries only):
- `apps/admin_web/src/lib/api/domains/reports.ts`
- `apps/admin_web/src/lib/api/domains/dashboard.ts`
- `apps/admin_web/src/lib/api/domains/competitorPrices.ts`
- `apps/admin_web/src/lib/api/domains/dailySales.ts`

**Pattern:** Each domain file gets a `readClient` parameter:
```ts
// Before
const { data } = await supabase.from('sales').select('*');
// After (read path)
const data = await neonClient.query('SELECT * FROM sales');
```

Write paths (sales.ts, pos.ts, inventory.ts, purchases.ts) stay on Supabase.

#### 1.5 Neon branching for staging
- Create a `main` branch on Neon matching production schema
- CI workflow: `neon branches create --parent main` per PR → run migrations against branch → test → delete branch on close

#### 1.6 Update `.env.example`
- Document `NEON_DATABASE_URL` (replace generic `DATABASE_URL` to avoid confusion)
- Add `NEON_BRANCH` for CI branching

---

### Phase 2: Cloudflare CDN + R2 Image Storage (2-3 days)

**Goal:** Faster image delivery for storefront, edge caching, zero egress on images.

#### 2.1 Register Cloudflare account + add domains
- Add `lucky-store.vercel.app` and `adminweb-blond.vercel.app` to Cloudflare
- Or use custom domains (`luckystore.com.bd` if available) for cleaner setup
- Change nameservers at domain registrar

#### 2.2 Create R2 bucket for product images
- Bucket: `lucky-store-images`
- Enable public access via R2 custom domain: `img.luckystore.com.bd`
- S3-compatible API endpoint for uploads

#### 2.3 Image upload migration
- Write migration script: `scripts/migrate-images-to-r2.mjs`
  - List all images in Supabase Storage `product-images` bucket
  - Download each → upload to R2
  - Update `items.image_url` and `items.images` columns to R2 URLs
  - Keep Supabase Storage as fallback during transition

#### 2.4 Update upload code
Files to modify:
- `apps/admin_web/src/hooks/useImageUpload.ts` — upload to R2 instead of Supabase Storage
- `apps/customer_storefront/next.config.js` — add R2 domain to `remotePatterns`
- Supabase Edge Functions that return image URLs — no change needed (URLs are in DB)

#### 2.5 Cloudflare CDN caching rules
- Cache storefront pages: `Cache Everything` + `Edge TTL: 60s` for HTML
- Cache images: `Cache Everything` + `Edge TTL: 7 days` for `img.*`
- Bypass cache for `/api/*` and admin dashboard

#### 2.6 Cloudflare Worker — edge rate limiting
- Create Worker: `cloudflare/workers/rate-limit.ts`
- 10 req/s per IP on `/api/*` routes
- 100 req/min per IP on storefront
- Returns 429 with Retry-After header
- Remove in-app rate limiting from Supabase Edge Functions (or keep as defense-in-depth)

---

### Phase 3: Neon Branching in CI (1 day)

**Goal:** Every PR gets its own Neon database branch for safe migration testing.

#### 3.1 Install Neon CLI
- `npm install -D @neondatabase/cli` or use `npx`
- Add `NEON_API_KEY` to GitHub secrets

#### 3.2 GitHub Actions workflow
File: `.github/workflows/neon-branch.yml`
- On PR open: create Neon branch from `main`
- Run `supabase/migrations/*.sql` against branch
- Run `supabase/tests/` against branch
- On PR close: delete branch

#### 3.3 Update CI workflow
- `.github/workflows/ci.yml` — add Neon branch step before tests
- Remove hardcoded `DATABASE_URL` from test env, use branch URL

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `apps/admin_web/src/lib/neon.ts` | Neon serverless client (read-only) |
| `scripts/migrate-images-to-r2.mjs` | One-time image migration script |
| `scripts/sync-supabase-to-neon.mjs` | Scheduled data sync (Phase 1 Option B) |
| `cloudflare/workers/rate-limit.ts` | Edge rate limiting Worker |
| `.github/workflows/neon-branch.yml` | CI: Neon branch per PR |

### Modified Files
| File | Change |
|------|--------|
| `apps/admin_web/src/lib/api/domains/reports.ts` | Read from Neon |
| `apps/admin_web/src/lib/api/domains/dashboard.ts` | Read from Neon |
| `apps/admin_web/src/lib/api/domains/competitorPrices.ts` | Read from Neon |
| `apps/admin_web/src/lib/api/domains/dailySales.ts` | Read from Neon |
| `apps/admin_web/src/hooks/useImageUpload.ts` | Upload to R2 |
| `apps/customer_storefront/next.config.js` | Add R2 domain to remotePatterns |
| `apps/admin_web/package.json` | Add `@neondatabase/serverless` |
| `.env.example` | Document Neon + Cloudflare env vars |
| `.github/workflows/ci.yml` | Neon branch step |
| `apps/admin_web/vercel.json` | Cloudflare proxy headers (optional) |

### Untouched (Forbidden)
- `PosProvider` and related state management
- `supabase/migrations/` (existing migrations)
- Auth flow logic
- Core business logic (write paths)
- Mobile app (local SQLite unaffected)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data staleness (sync delay) | Dashboard shows stale data | Start with 5-min sync, monitor, upgrade to logical replication if needed |
| Neon cold start | First query after idle takes ~300ms | Use Neon's autoscaling + warm connection via Vercel cron |
| Cloudflare proxy breaks Vercel | Site inaccessible | Use Cloudflare in DNS-only mode first, enable proxy gradually |
| R2 migration breaks image URLs | Broken product images | Keep Supabase Storage URLs as fallback, dual-write during transition |
| Cost overrun | Neon + Cloudflare bills | Both have generous free tiers; single store won't exceed them |

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Neon | 0.5 GB storage, 100 compute hours/mo | Analytics reads — well within |
| Cloudflare | Free plan (CDN, DDoS) | Enough for single store |
| Cloudflare R2 | 10 GB storage, 1M Class A ops/mo | ~500 product images — well within |
| Cloudflare Workers | 100K req/day | Rate limiting — well within |

**Total: $0/mo** for a single neighborhood grocery store.

---

## Approval Checklist

- [ ] Mac approves Phase 1 (Neon analytics read replica)
- [ ] Mac approves Phase 2 (Cloudflare CDN + R2)
- [ ] Mac approves Phase 3 (Neon branching in CI)
- [ ] Mac confirms custom domain availability (`luckystore.com.bd` or similar)
- [ ] Mac confirms Neon account is active (credentials already in `.env`)
- [ ] Mac confirms Cloudflare account created

---

## Next Steps

1. Confirm which phases to execute
2. Verify Neon account is accessible with existing credentials
3. Test schema export from Supabase → Neon import
4. Start Phase 1 implementation