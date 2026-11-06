# Supabase Egress Phase 3 Results

**Scope:** Mobile catalog server-side pagination and measurement, plus SQL verification and migration-history review. This work did not execute a production mutation or deployment. Read-only checks found both catalog migrations and the reviewed function in production. GitHub Actions run `42141518789` confirms the merged application build was deployed through the Hostinger staging and production workflow.

## Current state

- **Implementation:** PR #588 is merged to `main` as `d54b2ea680e0d8c7b11a3cad4ec92c62f5ea2453`.
- **Test database:** Both catalog migrations are applied and the SQL/security regression checks passed. The intended test and production storefront records were read-only checked as public on 2026-11-06.
- **Target history mismatch:** The test ledger recorded the follow-up migration as `20261106011758`; production and the merged repository use `20261106000000`. A local test-alignment rename was reversed so the worktree again matches the merged repository and production. Both projects' live function source has SHA-256 `e45cb90d5f61ce9996d1ab80f6d3f92484ce23a2586df8e9df38e3503a4b4987`.
- **Full ledger reconciliation:** Still incomplete. The test project has 283 migration records and this worktree has 275 migration files. The remaining unmatched entries need source and database-state mapping before any migration-history repair or automatic synchronization.
- **Production release:** Both catalog migration records and the reviewed function are present in production as checked read-only on 2026-11-06. Hostinger workflow run `42141518789`, triggered by the `d54b2ea` push to `main`, successfully built one immutable artifact, deployed it to staging, passed staging validation, deployed the same artifact to production, and passed production smoke. A separate read-only, actual-`anon` one-item RPC smoke returned total `684`, page count `1`, and no cost fields in the returned item. Production egress savings are unknown.

The local `main` checkout was separately fast-forwarded to the PR #588 merge. No migration-history repair or automatic sync was run in this task.

## Decision at a glance

| Area | Status | Evidence |
|---|---|---|
| PR #588 | Merged | Merge commit `d54b2ea680e0d8c7b11a3cad4ec92c62f5ea2453`; Project Doctor, CI, Storefront CI/CD (build, lint/typecheck, Chromium E2E), and Vercel checks passed on `67b9212d`. |
| Mobile catalog optimization | Implemented | One server-side RPC returns a filtered page and exact total; browse cache remains 60 seconds. |
| Synthetic payload measurement | 99.75% fewer serialized catalog bytes | Test-project harness only; not a billable-egress or production measurement. |
| Follow-up SQL security verification | Passed in non-production | Forward migration applied; complete SQL suite and supplemental `anon`-role private-store, unconfigured-store, cross-tenant, and cost-redaction checks passed transactionally. |
| Intended store visibility | Enabled as checked | `is_public_storefront = true` for store `4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd` in both test and production, checked read-only on 2026-11-06. |
| Migration history reconciliation | Production aligned; test ledger divergent | Production has 275 migration records matching all 275 repository versions. Test has 283 records with historical timestamp and test-only differences. No history repair or automatic sync was run. |
| Production rollout | Deployed and smoke-checked | Hostinger run `42141518789` deployed merged SHA `d54b2ea` to staging and production, with both validation jobs successful. Both catalog migrations and reviewed function are live in production. |
| Production egress savings | Unknown | No pre/post gateway byte trace or billing measurement is available. |

The production smoke ran in a read-only transaction under the `anon` role and rolled back. It used the existing configured store and created no fixtures. It checked the first item only; it does not establish that every returned item is free of cost fields.

**Release note:** The SQL security verification gap is closed for the non-production test project. Read-only checks found the reviewed catalog function in production, and Hostinger run `42141518789` confirms the merged application was deployed. The worktree filename matches production; test-project history remains divergent and must not be automatically synced. Measure live egress before claiming savings.

## Confirmed root cause

`getMobileCatalog()` repeatedly called the product repository in pages of 500. Each product search fetched up to 501 catalog rows to calculate `hasMore`, fetched published Bengali translations in batches of 100, then the mobile layer applied category, stock, sorting, and pagination filters after those rows crossed from Supabase. A 5,000-item catalog therefore transferred almost the whole catalog for a 20-item response.

## Implementation

- Added versioned `search_storefront_mobile_catalog_v1`, which scopes to an explicitly opted-in public store and its tenant, filters active products/category/stock/search server-side, preserves published Bengali name/description search and stock/price projection, uses deterministic ordering, and returns an exact total with the requested page. A forward migration now rejects offsets above 100,000 and treats a missing `is_public_storefront` flag as private.
- Replaced the mobile catalog batch loop with one RPC page request. The public API response fields and 60-second product freshness window remain in place.
- Added a 60-second Next Data Cache entry keyed by normalized query, sorted category IDs, stock filter, sort, limit, and offset. Category data continues to use its existing 300-second cache.
- Added sampled route telemetry: correlation ID, duration, returned rows, exact mobile response bytes, and errors. Successful logs are sampled at 1%; error logs omit payloads and customer data. Next Data Cache hit/miss is not exposed by this route instrumentation.
- No index was added. Existing tenant, item, stock, and translation indexes were inspected; the query-plan probe used the tenant index and a top-N page sort.
- Follow-up review fixes in commit `67b9212d` return sanitized API errors with correlation and duration headers, propagate category-cache lookup failures instead of converting them to empty filters, and make `products/constants.ts` the single source for `STOREFRONT_STORE_ID` while preserving the promotions module export.

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

Homepage, web category listing, web search, product detail, brand pages, middleware, cart/promotion polling, and SSR/client duplication were not measured in this task. The Phase 3 application was deployed by Hostinger run `42141518789`, but there is no controlled staging gateway trace/byte export. Production Supabase-origin bytes, production cache hit rate, and billable savings remain unknown. The synthetic mobile comparison exceeds the 50% serialized-payload target only for this test dataset; it does not prove the same reduction in production billing.

### Production log observation after release

A read-only query of production Supabase edge logs for 2026-11-05 23:00 through 2026-11-06 02:20 UTC found **zero** paths containing `mobile_catalog`. The 00:00–01:00 UTC pre-release and 01:20–02:20 UTC post-release slices had other catalog traffic, but the mobile RPC had no observed calls. Only 610 of 1,906 edge-log events in the broader window carried a `Content-Length` header, and the headers visible on catalog paths were mostly tiny responses. These logs do not establish a wire-byte or billable-egress comparison. Measure again after real mobile catalog traffic is observed; do not generate production fixtures to force a result.

The exact total is computed from all matching rows, so database work still grows with the matching catalog size even though fewer rows cross the network. Monitor RPC execution time and database load as the catalog grows. The 60-second cache applies to catalog browsing. Checkout independently fetches current catalog prices and replaces client-supplied prices with database values; order creation goes through the existing stock-aware server RPC. Those checkout paths were not changed by Phase 3.

## Verification and security

- **Migration order verified:** `20261105235042_add_mobile_catalog_search_rpc.sql` was already applied to non-production project `grxxenvdhfwzafzyykgo` (“Lucky Store Security Tests”). The follow-up was applied after it and replaces the function without changing its signature or grants.
- The MCP `apply_migration` request accepts a migration name and SQL but no version, so the test project recorded execution-time version `20261106011758`. Production recorded `20261106000000`, matching the merged repository filename. The worktree again uses `20261106000000_update_mobile_catalog_visibility_and_offset_guards.sql`; the SQL bytes were not changed. Both projects' live function source SHA-256 (`e45cb90d5f61ce9996d1ab80f6d3f92484ce23a2586df8e9df38e3503a4b4987`) matches the checked-in function body. Production's signature, `SECURITY DEFINER` setting, pinned search path, and ACL (`anon`, `authenticated`, `service_role`) also match the intended definition.
- SQL coverage includes first/final/empty pages, exact totals, category filters, ascending/descending price and name sorts, sellable stock, literal wildcard characters, English search, published Bengali search, unpublished translation exclusion, inactive-item visibility, tenant isolation, non-public store behavior, anonymous execution, and cost-field omission.
- Mobile unit coverage checks one RPC call, query/filter/pagination arguments, Bengali labels, price and stock mapping, empty-page totals, invalid sort fallback, and warm cache reuse.
- `EXPLAIN (ANALYZE, BUFFERS)` on the synthetic 5,000-row query took 63.12 ms for the matching/page plan. It showed the existing `idx_items_tenant_id` scan and a top-N sort. The stock table had only 22 rows in the test project, so its sequential scan is not evidence that a production index is needed. No index change is proposed from this probe.
- The RPC is `SECURITY DEFINER` because anonymous callers cannot select the protected item table directly. It pins `search_path`, explicitly scopes item/stock/translation rows to the store tenant, filters inactive products and unpublished translations, revokes `PUBLIC`, and grants only the established catalog roles. Anonymous execution is intentional for public catalog browsing; the tests verify store and tenant guards under the actual `anon` role. Price/stock mutation and checkout paths were not changed.
- Review validation identified that the original RPC treated a missing public-store flag as opted in and did not bound offsets. The forward migration now defaults missing flags to private and rejects offsets greater than 100,000. The complete SQL regression script passed against PostgreSQL and rolled back its generated fixture data. A supplemental transactional run under the actual `anon` role confirmed the public store returned only its three tenant-owned items (excluding the foreign-tenant fixture), while private and unconfigured stores returned empty catalogs; it also confirmed cost redaction. A post-run query found no leftover test tenants. Supabase Security Advisor still reports the expected generic public `SECURITY DEFINER` warning, plus unrelated pre-existing findings.
- All five PR #588 review findings were confirmed valid, fixed in `67b9212d`, replied to, and resolved. The remaining three fixes cover correlation/duration headers on failures, strict category lookup errors, and the shared store-ID source.

### Migration history reconciliation

**Status: production version set aligned; test-project ledger remains divergent.**

The test project's migration ledger contains 283 records. Production has 275 records, and this worktree has 275 migration files. Production and the worktree have identical version sets. Their names are not all identical, so the version-set check does not prove every historical SQL body equivalent. The test-versus-worktree version-set comparison found:

- **17 test versions** with no same-version repository file. Nine have a same-named production/repository migration under a different timestamp. Two are present under `supabase/test-only-migrations`. Five have no same-named current file or matching migration path in available Git history. The seventeenth is the follow-up catalog migration, which has the reviewed function body under a different version.
- **9 repository versions** with no same-version test record. Three pair by name with test records at different timestamps, including the follow-up catalog migration. Six have no same-name test record and need classification as pending or otherwise applied.
- **Nine historical same-name pairs:** Two applied SQL strings match byte-for-byte, two differ only by trailing whitespace, and five differ in comments or statement separators. After removing line comments, whitespace, and statement separators, all nine compare equal. This is a text comparison, not proof that historical database effects match.

| Test ledger version | Production/repository version | Migration name | Applied SQL comparison |
| --- | --- | --- | --- |
| `20261015182509` | `20261015090000` | `stabilize_storefront_catalog_pagination` | Equal after comments/separators removed |
| `20261015182521` | `20261015165958` | `bound_storefront_catalog_search` | Exact |
| `20261015184514` | `20261015080000` | `ensure_online_stock_reservation_column` | Equal after comments/separators removed |
| `20261015185642` | `20261015190000` | `restore_guest_order_tracking_wrapper` | Equal after separators removed |
| `20261015202313` | `20261016100000` | `expose_sellable_storefront_stock` | Exact |
| `20261019003234` | `20261017100000` | `fix_storefront_catalog_v2_item_filter` | Equal after separators removed |
| `20261019003253` | `20261018222800` | `enhance_bilingual_competitor_matcher` | Equal after comments removed |
| `20261028155952` | `20261028213829` | `unified_catalog_import_pipeline` | Trailing whitespace only |
| `20261028160012` | `20261028213842` | `catalog_image_cas_tenant_scope` | Trailing whitespace only |

These are comparisons of the SQL strings retained in each database ledger. They do not authorize changing either ledger. The production ledger's version set matches the repository, while 13 historical production records use names different from the corresponding repository filenames; those names also need review before declaring full history equivalence.

The test database ledger was not edited. The target function definition's SHA-256 matches live `pg_proc.prosrc` in both environments and the checked-in function body. The five test-only records without repository paths affect `model_performance`, promotions/order test schema, checkout core, rate-limit/stock-view hardening, and privileged maintenance RPC access. Their SQL is retained in the test ledger, but their deployment origin and intended persistence are not established. The two preview-image migrations have files under `supabase/test-only-migrations`; their recorded function bodies differ materially from those files, including tenant and preview-host conditions. Do not treat these files as equivalent to the recorded migrations or replay them automatically.

The six repository versions absent from the test ledger are `20261022120000`, `20261026000000`, `20261029024810`, `20261029030023`, `20261031193836`, and `20261103000000`. Their absence is a test-project state question, not evidence that production lacks them; all six versions occur in production.

After the temporary filename alignment, the full transactional SQL suite and actual-`anon` private/unconfigured/cross-tenant/cost checks passed again. Offset `100000` was accepted and `100001` rejected. Fixtures rolled back, and a post-run query found no leftovers. The filename was then restored to the production/repository version without changing SQL bytes. These checks validate the catalog function; they do **not** resolve the other migration-ledger differences.

**Before any migration-history repair or automatic synchronization:**

1. Preserve a read-only export of the test project's migration ledger.
2. Keep the nine same-name/different-version pairs mapped explicitly; verify any database-state implications before a history repair. Do not rename production migration files to fit test timestamps.
3. Trace the five unmatched test-ledger records to their deployment origin, review the two test-only preview-image files against their recorded SQL, and classify the six repository-only versions using schema evidence. Treat the follow-up catalog version as an environment-specific timestamp difference with verified live function bodies.
4. Only after a reviewed version-by-version mapping, rerun the ledger comparison and SQL regression suite. Do not delete unknown history, mark versions applied based on names, or run `db push`/automatic sync while these entries remain unresolved.

## Build and test status

- Targeted mobile/API/search/product-adapter tests: 50 passed.
- After the review fixes, focused route and mobile catalog tests: 16 passed across 2 files; storefront typecheck passed; `git diff --check` passed.
- Storefront typecheck and targeted ESLint: passed.
- Repository secret scanner: passed; self-test passed 29/29.
- Full storefront suite: 685 passed, 5 failed, plus one blog suite failed to import. The failures are in unchanged root-layout mocks, the campaign hero landmark expectation, and the Bengali footer wishlist URL; the blog dependency imports unresolved `next/image.js`.
- Local production build: blocked because the sandbox could not resolve `fonts.googleapis.com` for the existing `next/font` declarations. GitHub checks on review-fix commit `67b9212d` passed: Project Doctor, CI, Storefront CI/CD (production build, lint/typecheck, Chromium E2E), and both Vercel checks. The separate push-triggered Hostinger run `42141518789` deployed merged commit `d54b2ea` to production and passed its smoke validation. Neither run measures production egress.

## Controlled release sequence

The production database contains both catalog migrations and the reviewed function. Hostinger run `42141518789` deployed the merged application to production and passed production smoke. Do not reapply the migrations.

1. Retain Hostinger run `42141518789` and its immutable artifact digest as the release evidence. The workflow's staging validation and production smoke succeeded; the separate one-item production RPC smoke also passed.
2. Monitor errors, RPC duration, gateway bytes, cache effectiveness, and billable egress. Compare with a matching pre-release baseline before claiming savings.
3. Finish the test-project migration-history mapping before any automatic synchronization; production and repository version sets already match.
4. For application rollback, restore the prior app release. Keep the additive RPC until no client uses it; remove it only in a separately reviewed migration.

## Remaining limitations

- Real staging/production traces, wire-level Supabase response bytes, cache effectiveness on Hostinger, and billable egress remain unverified. Broader test-project migration differences remain partly unclassified. The full-suite and local build limitations are listed above and tracked in `context.md`.
- The database probe uses synthetic catalog rows in the test project, not a production-sized sanitized snapshot.
