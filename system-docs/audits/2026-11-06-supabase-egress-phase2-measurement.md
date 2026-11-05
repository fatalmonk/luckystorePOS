# Phase 2 — Supabase egress verification

Date: 2026-11-06
Branch: `perf/supabase-egress-phase2`

## Scope and measurement limits

The Phase 1 synthesis and Task 1/2 reports were reviewed. No controlled staging URL, Supabase gateway trace/byte export, or production cache telemetry was available in this worktree. No production queries or load tests were run. The results below separate deterministic local tests from production/staging measurements; local fixture counts are not Supabase egress measurements.

## Measured local behavior

Focused command: `rtk proxy npm --prefix apps/customer_storefront test -- --run app/lib/products`

Result: 11 test files, 111 tests passed in 1.26s; storefront TypeScript `typecheck` and targeted `rtk lint` passed. In the adapter fixture, two identical searches result in one inner adapter request (one cold miss, then one warm hit); distinct explicit offsets each issue a request and return the result for that offset. The pre-fix key omitted `offset`, so page 1/2 requests with equal query and limit could reuse the same entry. This is a correctness fix; it does not demonstrate reduced egress. Fixture payload bytes, request latency, errors, data freshness, and real cache hit rate were not measured.

## Workflow baseline and after

| Metric | Baseline | Optimized | Change |
|---|---:|---:|---:|
| Homepage Supabase calls / bytes | Not measured | Not measured | Unknown |
| Category Supabase calls / bytes | Not measured | Not measured | Unknown |
| Search Supabase calls / bytes | Not measured | Not measured | Unknown |
| Product detail calls / bytes | Not measured | Not measured | Unknown |
| Brand page calls / bytes | Not measured | Not measured | Unknown |
| Mobile catalog calls / bytes | Not measured | Not measured | Unknown |
| Cart/promotions calls / bytes | Not measured | Not measured | Unknown |
| Checkout validation calls / bytes | Not measured | Not measured | Unknown |
| Cache hit rate, latency, duplicate rate, errors, freshness | Not measured | Not measured | Unknown |

No percent reduction is claimed. The 50% target cannot yet be evaluated.

## Phase 1 finding status

| Finding | Status | Evidence and action |
|---|---|---|
| Broad catalog reads and pagination | Confirmed in code; impact unmeasured | Mobile route loads catalog in 500-row pages before applying local category, stock, sort, and requested page. See `apps/customer_storefront/app/lib/mobile/catalog.ts` and `apps/customer_storefront/app/api/mobile/v1/catalog/route.ts`. Do not change without RPC support for exact totals, filters, and ordering. |
| Product search cache key omits offset | Confirmed and fixed | `CachingProductAdapter.search` forwards explicit offset to the adapter; old key ignored it. JSON tuple key now includes query, category filters, page, limit, and offset. Added pagination, category delimiter, and adapter-instance isolation regressions. |
| Middleware reads bypass app data cache | Confirmed in source | `apps/customer_storefront/middleware.ts` performs `no-store` product canonicalization and category slug reads; runtime frequency and byte impact are unknown. Left unchanged to preserve redirects, aliases, and fresh 404 behavior. |
| Brand pages perform broad concurrent searches | Confirmed in source; impact unmeasured | `apps/customer_storefront/app/(english)/brand/[slug]/page.tsx` and `apps/customer_storefront/app/(bengali)/bn/brand/[slug]/page.tsx` fan out search terms and paginate results. Reducing terms/pages could omit matching products; no semantic change made. |
| Promotion polling every 30 seconds | Confirmed in source cadence; runtime behavior unmeasured | `apps/customer_storefront/app/lib/storefront-promotions.ts` traces a 30-second refresh. No measurement established whether hidden tabs continue polling or what portion reaches Supabase through caches. Checkout remains untouched. |
| SSR/client duplicate requests | Insufficient evidence | No correlated browser/server traces were available to distinguish genuine duplicate Supabase calls from shared Next/process cache hits. See `apps/customer_storefront/app/lib/products/getCachedProduct.ts` and the product detail route metadata/page paths in Phase 1 Task 1 report. |
| Hostinger/Cloudflare cache persistence | Insufficient evidence | Repository configuration alone cannot prove cross-request or cross-instance persistence. No live headers, deployed cache rules, restart behavior, or instance topology inspected; relevant config includes `apps/customer_storefront/next.config.js` and `.github/workflows/storefront-hostinger.yml`. |

## Next controlled measurement

Use a staging build and non-production Supabase project. For fixed homepage, category, search, product, brand, mobile, cart/promotion, and checkout-validation scenarios, record cold/warm runs separately. Correlate a generated non-PII trace ID with endpoint/RPC, status, duration, returned row count, reliable response bytes, cache layer hit/miss, duplicate calls, and error count. Obtain gateway bytes separately from browser payload bytes. Repeat across process restart and instances, and inspect Cloudflare response headers/rules. Do not use production load testing.
