# Supabase egress investigation — 29 October 2026

## Scope and conclusion

Production project `hvmyxyccfnkrbxqbhlnm` was inspected read-only. The change in this PR narrows three storefront paths that previously fetched full catalog pages when they needed only cart/product IDs. It does not change the database, cache stock or prices, or affect production configuration. No deployment or production write was performed.

The request-count evidence is useful for locating callers, but historical response bytes are incomplete. Supabase edge logs omitted `response.headers.content_length` on most named catalog requests. A bounded production SQL comparison measured serialized JSON sizes, not bytes actually transferred over HTTP or billed by Supabase.

## Caller inventory

Paths below are application callers, with scripts and background services called out separately. Production request logs do not record the originating application route or page, so route attribution is based on code tracing.

| Endpoint / resource | Caller and purpose | Trigger and execution | Query bounds, cache, freshness |
|---|---|---|---|
| `rpc/search_storefront_catalog` | Public product adapter `apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.ts:205-245`; sitemap `apps/customer_storefront/app/sitemap.ts:134-165`. Standard checkout (`apps/customer_storefront/app/api/checkout/route.ts`) and mobile checkout (`apps/customer_storefront/app/api/mobile/v1/checkout/route.ts`) previously called it for full-catalog price fallbacks. | Product slug-prefix resolution during server rendering; sitemap regeneration. Checkout callers triggered on checkout POST before this change. | Slug-prefix resolution pages through the full active catalog; sitemap reads bounded pages and is revalidated daily. Checkout and exact-product fallbacks now use v2 ID selectors. Slug-prefix resolution and sitemap remain unchanged. |
| `rpc/search_storefront_catalog_v2` | Storefront search `apps/customer_storefront/app/lib/search/searchProducts.ts:53-60,68-100,163-190`; buying guides `apps/customer_storefront/app/lib/buying-guides/catalogue.ts:44`; promotion/deal data `apps/customer_storefront/app/lib/deals.ts:217`; new checkout and exact-product lookups `apps/customer_storefront/app/lib/storefrontCatalogLookup.ts:10-29`; public product adapter search `apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.ts:106-138` | Server-rendered catalog/search, deal/guide reads, checkout POST, product detail fallback | Search uses page limits/offsets and a 60-second Next Data Cache for the default client. The RPC supports exact item IDs and a maximum of 1,000 IDs. Checkout/detail calls now send only distinct requested IDs and set the limit to that ID count. |
| `GET /rest/v1/items` | Mobile checkout `apps/customer_storefront/app/api/mobile/v1/checkout/route.ts:84-100`; public product lookup `apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.ts:140-149`; admin item API `apps/admin_web/src/lib/api/domains/products.ts:13-25,30-35,65-80,92-115,139-146,181-186`; additional admin workflows in purchase, imports, image review, and competitor-price screens | Checkout POST, product detail render, admin screen/query activity | Mobile checkout selects only `id,name,price,mrp` filtered to cart IDs. Product detail selects explicit fields by primary key. Some admin API methods use `select('*')` or have no explicit bound, but the observed production responses were predominantly one-row ranges; caller-level attribution for those requests is unavailable. |
| `GET /rest/v1/item_translations` | Search matching and overlays `app/lib/search/searchProducts.ts:123-147,228-251`; Bengali product/category/brand pages (`app/(bengali)/bn/product/[slug]/page.tsx:23-29`, `app/(bengali)/bn/category/[slug]/page.tsx:233`, `app/(bengali)/bn/category/page.tsx:105`, `app/(bengali)/bn/brand/[slug]/page.tsx:118`); homepage `app/lib/products/getHomePageData.ts:216-224`; mobile product `app/lib/mobile/product.ts:96`; sitemap `app/sitemap.ts:189-196` | Bengali page render, text search, mobile detail, daily sitemap build | Search matching limits IDs to 1,000; search overlays select four fields for the current page in batches of 100. Sitemap pages IDs. Page translation reads are item-scoped. Search results share the existing 60-second Data Cache only for the default Supabase client. |
| `GET /rest/v1/categories` | Storefront adapter `app/lib/products/adapters/SupabaseProductAdapter.ts:276-290`; cached storefront helper `app/lib/products/getCachedCategories.ts:10-32`; admin categories and purchase/inventory forms (`apps/admin_web/src/features/import/ImportProductsPage.tsx:63`, `apps/admin_web/src/features/purchase/PurchaseEntryPage.tsx:442`, `PurchaseHistoryPage.tsx:86`, inventory pages and drawers) | Product/search rendering and admin form/query mounts | Storefront category helper uses the shared Next Data Cache for 300 seconds and React request deduplication. Admin QueryClient defaults to 5-minute stale time and 10-minute garbage collection. The repeated category calls are not evidence of an unbounded query. |
| `GET /rest/v1/stock_levels` | Public product detail `app/lib/products/adapters/SupabaseProductAdapter.ts:156-178`; mobile stock services/screens `apps/mobile_app/lib/features/stock/services/stock_service.dart:100`, `apps/mobile_app/lib/features/stock/presentation/screens/stock_adjustment_screen.dart:245`; other inventory/Edge Function flows | Product render, inventory operations, stock adjustment | Product detail filters by item and store and selects three stock fields. Missing/error result formerly triggered a full-catalog lookup; it now requests that item ID through v2. POS also subscribes to store-filtered stock updates in `apps/admin_web/src/features/pos/QuickPosPage.tsx:39-61`. |

Additional direct table callers found include admin purchase/import/image/competitor-price UI, `apps/admin_web/src/lib/api/domains/inventory.ts`, `apps/admin_web/src/lib/r2.ts`, and the protected Supabase import/image/stock Edge Functions. CLI/data scripts (`scripts/ops/import-competitor-data.js`, `scripts/ops/remove-duplicate-items.js`, image migration scripts, and CI seed/preflight scripts) are one-off or workflow callers, not storefront request handlers. They were not run or modified.

## Production observations

Supabase edge log window: approximately 28 October 2026 10:29 UTC through 29 October 2026 10:29 UTC. Exact query windows are rolling 24-hour windows and differ by a few minutes across queries.

| Path | Requests (approx.) | Response evidence | Interpretation |
|---|---:|---|---|
| `/rest/v1/rpc/search_storefront_catalog` | 4,866 | HTTP 200; `content_length` missing on all 4,866 | Highest-priority byte suspect. Code contains full-catalog checkout and product-detail fallback callers. Bytes cannot be read from gateway logs. |
| `/rest/v1/items` | 4,018 | HTTP 200; 1,820 missing lengths; most logged ranges were `0-0/*`; present lengths summed to 183,303 bytes | Frequent but observed responses are mostly single-row reads. Not a byte leader based on available lengths. |
| `/rest/v1/item_translations` | 2,859 | HTTP 200; 1,574 missing lengths; ranges vary from one to 100 rows | Potentially meaningful response size, but no full byte total or route attribution. |
| `/rest/v1/categories` | 2,104 | Most successful reads returned range `0-33/*` (34 rows); lengths missing on most | Repeated moderate-size dataset; storefront and admin query caches already exist. |
| `/rest/v1/stock_levels` | 1,641 | 1,491 responses were `[]` (2 bytes); 150 responses were single-row JSON (48–50 bytes); logged sum 10,288 bytes | High request count but small observed body. Empty results explain why product-detail code entered its broad fallback. |
| `/rest/v1/rpc/search_storefront_catalog_v2` | 1,355 | HTTP 200; length missing on most | Search and selected-item RPC; current route mix prevents separating search from other callers. |
| Supabase Storage public object | 1 object response, about 17 KB | One image body observed in this window | Direct Supabase Storage image egress was not material in this log slice. Storefront images are configured as browser-loaded images and many use the existing image/R2 domain. |

The same production window contained 19 Realtime error events and 11 info events. The POS stock subscription is filtered by store; it also listens for item changes to invalidate product/category queries. Event logs do not expose subscription traffic bytes or connection counts. No named catalog REST request had a recognized bot/crawler user-agent using a simple `bot|crawler|spider` classification; this does not rule out generic or spoofed user agents.

## Bounded production payload comparison

A read-only SQL query called the existing production functions and returned only row counts and serialized JSON byte lengths:

| Call | Rows | JSONB text bytes |
|---|---:|---:|
| `search_storefront_catalog(store, '', null, 1000, 0)` | 684 | 546,356 |
| `search_storefront_catalog_v2(store, '', null, 10 selected item IDs, 10, 0)` | 10 | 7,882 |

For this sample, the selected-item result was 98.56% smaller before HTTP compression. This measures PostgreSQL JSON serialization, not actual wire bytes or billable egress. It is a representative payload comparison, not a benchmark across cart sizes.

If all 4,866 observed v1 calls had transferred the full sample payload and were replaced by a 10-item payload, the arithmetic would be about 2.62 GB/day of raw JSON avoided. That scenario is not a billing estimate: gateway logs cannot assign each call to a route, many v1 calls come from product slug resolution and sitemap generation, HTTP compression is unmeasured, and the estimate exceeds the observed monthly egress when extrapolated. No monthly billing savings claim is supported yet.

## Ranked contributors and root causes

1. **Confirmed oversized caller, high confidence:** standard web checkout requested the entire catalog for every checkout and filtered it in Node. Mobile checkout also had a broad paginated fallback. Both now call the existing exact-ID v2 selector.
2. **Confirmed oversized fallback, high confidence:** when a product detail had no direct stock row, its adapter fetched the full catalog to obtain one product’s sellable quantity. There were 1,491 empty stock responses in the log window. That fallback now requests only the already-known product ID.
3. **Remaining suspected oversized caller, medium confidence:** product slug-prefix resolution still scans catalog pages because the existing RPC has no prefix selector for UUIDs. The server-side product adapter caches single-product results for five minutes per process and React cache deduplicates metadata/page work within a request, but this is not a cross-instance cache. A safe cross-instance fix would need a reviewed ID-resolution interface or a verified cache/invalidation contract; no schema change was made.
4. **Frequent small reads, lower byte confidence:** `/items`, `/categories`, and `/stock_levels` counts are high, but observed response ranges/projections are narrow or bodies are tiny. No additional cache was added to sensitive stock or price data.
5. **Translations and background page fetches, uncertain:** translation response lengths are incomplete. The daily SEO monitor fetches the public website (not Supabase directly); the daily competitor scraper reads/writes catalog data using a service-role secret. These schedules were not altered. Their exact egress contribution was not separable from Supabase request logs.

## Other telemetry and hidden-traffic checks

- Supabase edge logs expose request path, method, status, request/response headers, Cloudflare metadata, and `content_length`; PostgREST logs expose only sparse path metadata. Most catalog response lengths are absent, so the path-level request counts cannot be converted into egress totals.
- Supabase Storage logs show little direct object traffic in this window. Repeated image delivery through Cloudflare/R2 cannot be quantified from the connected telemetry available to this task.
- Vercel project logs were queried. The account reports Hobby retention of one hour; the requested 24-hour window was unavailable, and the latest 30-minute grouped query returned no rows. No request-level Vercel route baseline is available.
- Cloudflare analytics and Hostinger application logs were not available through a connected read-only tool in this run.
- Repository schedule scan found the daily SEO technical monitor (`.github/workflows/seo-technical-monitor.yml:4-5`) and daily competitor scraper (`.github/workflows/scraper-daily.yml:3-7`). The SEO monitor requests the customer site; the scraper uses service-role access. No schedule or secret was changed.
- No customer data, authentication response, privileged result, price, or stock response was put into a shared cache.

## Changes and validation

Changes are in `app/lib/storefrontCatalogLookup.ts`, the standard and mobile checkout route handlers, and `app/lib/products/adapters/SupabaseProductAdapter.ts`. One shared helper deduplicates IDs and calls the existing v2 RPC with `p_query: ''`, `p_item_ids`, `p_limit` equal to the unique ID count, and offset zero. Checkout continues to use fresh database prices and promotion data; product detail continues to use live sellable stock.

Validation completed locally without production writes:

- `rtk npm run test -- app/lib/storefrontCatalogLookup.test.ts app/lib/products/adapters/SupabaseProductAdapter.test.ts app/lib/mobile/checkout.test.ts app/lib/__tests__/checkout-promotions-integration.test.ts` — 4 files, 24 tests passed.
- `rtk npm run typecheck` — passed.
- `rtk lint .` — passed.
- `rtk npm run build` — passed; all 41 static pages generated and both checkout routes compiled.

These checks validate the lookup contract and compile the routes. They do not validate a live checkout or POS transaction. No write was made to production.

## Deployment and rollback

No database migration or production setting is required. Review and merge the PR through normal controls, then allow the existing storefront deployment path to build the merge commit. Confirm a test checkout with current price/promotion and an available/unavailable item, a Bengali product detail with fresh stock, and existing POS sale/inventory checks in the authorized isolated test environment. Monitor `/rest/v1/rpc/search_storefront_catalog` and v2 traffic, HTTP errors, checkout price mismatches, and actual Supabase egress for at least 24 hours.

Rollback is code-only: revert this PR commit (or redeploy the previous storefront deployment) if checkout price validation or product availability regresses. No database rollback is needed. Do not use production writes as a test.

## Measurement still needed

The smallest useful follow-up is one 24-hour window of per-path transferred response bytes (including compressed/chunked bodies) joined to route/caller identity, plus Vercel request counts for `/api/checkout`, `/api/mobile/v1/checkout`, and product slug pages. Compare those measures with the same window after the PR is deployed. This is necessary to confirm actual daily and monthly egress reduction and whether slug-prefix lookup merits a separate safe change.
