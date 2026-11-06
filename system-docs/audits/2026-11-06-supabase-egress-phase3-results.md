# Supabase Egress Phase 3 Results

**Scope:** Mobile catalog server-side pagination and measurement. No production database queries, application deployment, Hostinger changes, or Cloudflare changes were made.

## Confirmed root cause

`getMobileCatalog()` repeatedly called the product repository in pages of 500. Each product search fetched up to 501 catalog rows to calculate `hasMore`, fetched published Bengali translations in batches of 100, then the mobile layer applied category, stock, sorting, and pagination filters after those rows crossed from Supabase. A 5,000-item catalog therefore transferred almost the whole catalog for a 20-item response.

## Implementation

- Added versioned `search_storefront_mobile_catalog_v1`, which scopes to a public store and its tenant, filters active products/category/stock/search server-side, preserves published Bengali name/description search and stock/price projection, uses deterministic ordering, and returns an exact total with the requested page.
- Replaced the mobile catalog batch loop with one RPC page request. The public API response fields and 60-second product freshness window remain in place.
- Added a 60-second Next Data Cache entry keyed by normalized query, sorted category IDs, stock filter, sort, limit, and offset. Category data continues to use its existing 300-second cache.
- Added sampled route telemetry: correlation ID, duration, returned rows, exact mobile response bytes, and errors. Successful logs are sampled at 1%; error logs omit payloads and customer data. Next Data Cache hit/miss is not exposed by this route instrumentation.
- No index was added. Existing tenant, item, stock, and translation indexes were inspected; the query-plan probe used the tenant index and a top-N page sort.

## Measurements

Environment: non-production Supabase test project `grxxenvdhfwzafzyykgo`. A transaction generated 5,000 synthetic catalog rows and published Bengali translations, ran five before/after iterations, and rolled all fixture data back. The catalog response sizes below are PostgreSQL `jsonb::text` byte counts for RPC/translation payloads; they exclude HTTP framing, TLS, gateway overhead, category response bytes, and Supabase billing accounting. They are a controlled comparison, not a billable-egress measurement.

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Mobile cold-path Supabase reads, including one uncached category read | 61 (10 catalog RPC + 50 translation reads + 1 category read) | 2 (1 catalog RPC + 1 category read) | 96.72% fewer requests |
| Catalog and translation JSON text bytes | 3,682,419 | 9,189 | 99.75% fewer serialized bytes |
| Product rows fetched for a 20-item response | 5,009 catalog rows + 5,000 translation rows | 20 catalog rows; translations included in those rows | 99.60% fewer catalog rows |
| Search RPC requests | 10 | 1 | 90% fewer |
| Category requests, cold / warm | 1 / 0 | 1 / 0 | unchanged |
| Cache hit rate | Not live-instrumented; search pages use a 60-second Next Data Cache | Not live-instrumented; identical-query reuse passed a mocked warm-cache test | Not measured in a running app |
| Median database harness time (5 runs) | 12,924.79 ms | 35.93 ms | 99.72% lower |
| P95 database harness time (5 runs) | 13,122.05 ms | 45.18 ms | 99.66% lower |
| Harness errors | 0 / 5 | 0 / 5 | unchanged |

The before harness reproduces the existing cold mobile path: ten 500-row pages, each catalog RPC returning the extra row used for `hasMore`, plus five 100-ID translation-overlay reads per page. The time comparison is database-only and executes those calls sequentially in one SQL harness; it excludes application mapping and network latency and should not be read as an end-to-end latency result. The warm-cache test is mocked and does not establish cache persistence across Hostinger instances or process restarts.

## Other workflows and production impact

Homepage, web category listing, web search, product detail, brand pages, middleware, cart/promotion polling, and SSR/client duplication were not measured in this task. There is no controlled staging gateway trace/byte export or deployed Phase 3 application. Production Supabase-origin bytes, production cache hit rate, and billable savings remain unknown. The synthetic mobile comparison exceeds the 50% serialized-payload target only for this test dataset; it does not prove the same reduction in production billing.

## Verification and security

- The test-project migration was applied to the non-production project; the SQL regression script passed transactionally and rolled its fixtures back.
- SQL coverage includes first/final/empty pages, exact totals, category filters, ascending/descending price and name sorts, sellable stock, literal wildcard characters, English search, published Bengali search, unpublished translation exclusion, inactive-item visibility, tenant isolation, non-public store behavior, anonymous execution, and cost-field omission.
- Mobile unit coverage checks one RPC call, query/filter/pagination arguments, Bengali labels, price and stock mapping, empty-page totals, invalid sort fallback, and warm cache reuse.
- `EXPLAIN (ANALYZE, BUFFERS)` on the synthetic 5,000-row query took 63.12 ms for the matching/page plan. It showed the existing `idx_items_tenant_id` scan and a top-N sort. The stock table had only 22 rows in the test project, so its sequential scan is not evidence that a production index is needed. No index change is proposed from this probe.
- The RPC is `SECURITY DEFINER` because anonymous callers cannot select the protected item table directly. It pins `search_path`, returns only for public stores, explicitly scopes item/stock/translation rows to the store tenant, filters inactive products and unpublished translations, revokes `PUBLIC`, and grants only the established catalog roles. Price/stock mutation and checkout paths were not changed.
- Supabase Security Advisor reports the new RPC under its generic anonymous `SECURITY DEFINER` warning, as it does the existing public catalog RPCs. Anonymous execution is intentional for the public storefront; the procedure is bounded to public stores, page size is capped at 60, output omits cost, and tenant/visibility checks are regression-tested. The advisor also returned unrelated existing findings; no unrelated remediation was included.

## Build and test status

- Targeted mobile/API/search/product-adapter tests: 50 passed.
- Storefront typecheck and targeted ESLint: passed.
- Repository secret scanner: passed; self-test passed 29/29.
- Full storefront suite: 685 passed, 5 failed, plus one blog suite failed to import. The failures are in unchanged root-layout mocks, the campaign hero landmark expectation, and the Bengali footer wishlist URL; the blog dependency imports unresolved `next/image.js`.
- Production build: blocked because the sandbox could not resolve `fonts.googleapis.com` for the existing `next/font` declarations. No E2E run or CI result is available yet.

## Deployment and rollback

1. Apply the additive RPC migration before deploying the storefront code. The old application continues using existing RPCs during this step.
2. Deploy the app only after migration verification in a non-production project. No production migration or deployment has been authorized or performed.
3. To roll back application behavior, restore the prior app release; leave the additive function unused until no clients call it, then remove it in a separately reviewed migration if desired.

## Remaining limitations

- Real staging/production traces, wire-level Supabase response bytes, cache effectiveness on Hostinger, and billable egress remain unverified.
- The database probe uses synthetic catalog rows in the test project, not a production-sized sanitized snapshot.
- CI and E2E results remain pending. The full-suite and build limitations are listed above and tracked in `context.md`.
