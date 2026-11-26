# Lucky Store Ice Cream SEO/UX V3 — P0 Synthetic Qualification

**Date:** 2026-11-26 (Asia/Dhaka)
**Review decision:** HOLD for implementation, database migration and production deployment
**Repository:** `fatalmonk/luckystorePOS`
**Review branch:** `plan/category-pagination-v3`
**Base:** GitHub `main` at `0357e707f753781fa57e97429b3205d9aed390b4`
**Authority:** Owner authorized a test/evidence-only commit, push and new pull request for independent review.

## Scope and provenance

This PR adds one source-characterization/synthetic-test file and this qualification note.
No storefront route, component, database schema, catalog record, Cloudflare rule or production configuration is changed.
The tests deliberately **do not connect to Supabase or the live storefront**.

The main development worktree, `feature/mobile-homepage-redesign` at
`e2403bf760eae2478ea7d2944eb824a9292ea96f`, contains unrelated dirty work and was not edited.
The review worktree was already present and clean before this task; it was fast-forwarded to `main`
before the scoped additions.

## Verification

Run from the repository root:

```sh
node --test scripts/seo/ice-cream-pagination-qualification.test.mjs
```

Observed result: **7/7 passed**, exit 0, on Node.js 22.23.5.
These passes characterize the current source and the synthetic model;
they **do not** certify implementation correctness or a production runtime.

The test checks:

1. The current category route-data caps (500 grouped / 200 leaf), client `PAGE_SIZE=24` and Load More.
2. The English and Bengali metadata rule that treats any nonempty query parameter as a filter.
3. Expected synthetic 65-product partition of 24+24+17.
4. Synthetic grouped 65-, 501- and 1,001-product data sets with alternating category memberships.
5. How per-category ordered RPC results become category-concatenated rather than globally sorted.
6. How deeper offsets cause the multi-category model to retrieve more than the 24 visible rows.
7. Full frozen-snapshot traversal, including the distinction between consistent concatenation and globally sorted results.

## Evidence and interpretation

| Finding | Status | Evidence |
|---|---|---|
| Both route variants have broad `hasFilters` logic | VERIFIED SOURCE | `app/(english)/category/[slug]/page.tsx`, `app/(bengali)/bn/category/[slug]/page.tsx` |
| Route-data fetch caps | VERIFIED SOURCE | `app/lib/categoryRouteData.ts` |
| 24-item Load More uses client state | VERIFIED SOURCE | `app/components/CatalogLayout.tsx` |
| Underlying RPC `p_limit`/`p_offset` support | VERIFIED SOURCE | `app/lib/search/searchProducts.ts` |
| Multi-category aggregation uses per-category reads plus Map deduplication | VERIFIED SOURCE | `app/lib/search/searchProducts.ts` |
| Model can be stable in an unchanged snapshot but not globally name-sorted | VERIFIED SYNTHETIC | `ice-cream-pagination-qualification.test.mjs` |
| Deep grouped pages can require progressively more transferred rows | VERIFIED SYNTHETIC | Same test, not a production query benchmark |
| `?page=N` self-canonicals and `noindex` classification are implemented | NOT IMPLEMENTED | Source review |
| Live server HTML product-anchor coverage | UNKNOWN | No raw HTML crawl |
| Mobile LCP element/TTFB/CLS | UNKNOWN | No browser performance trace |
| Supabase query plans, latency and egress | UNKNOWN | No production or staging benchmark |
| Current Ice Cream count of 65 | HISTORICAL | Earlier browser observation, not a frozen inventory |

### Important caveats

- The synthetic model mirrors the visible multi-category data path, but **does not execute the actual RPC implementation**. Source evolution can invalidate its characterization assertions.
- The simulated ordering illustrates a real design risk; a valid implementation may choose a different deterministic total ordering (not necessarily alphabetical). It must document and test that decision.
- A stable tie-breaker alone does not prevent page drift when inventory changes between requests.
- The 60-second search cache is not evidence that all deep-page queries are cheap or uniformly cached.
- The reported third-party SEO auditor HTTP 403 has not been shown to affect Googlebot. Earlier Search Console URL Inspection reported successful Googlebot crawling.
- Existing `permanentRedirect()` yields HTTP **308**, not 301.
- An earlier PLAN_ONLY task created the planning worktree. That historical write must not be misrepresented as read-only.

## P0 closure gates

**HOLD** until an independent reviewer and the implementer can establish:

1. A bounded, deterministic, globally consistent eligible-product ordering and traversal strategy for 65/501/1001+ fixtures, with duplicates and omissions asserted absent.
2. The chosen category search and multi-category retrieval design is measured against baseline payload/egress/query-count costs in an isolated test or staging environment.
3. Raw HTML product URL and pagination anchor coverage, including JS-disabled navigation.
4. Correct `?page=1` normalization, `?page=2+` self-canonical and indexability, and filtered/invalid URL semantics in both locales.
5. Actual mobile performance traces, explicitly separating lab metrics from field Core Web Vitals.
6. An independent source/diff and test review tied to the exact final PR head SHA.

**No production merge, migration, WAF adjustment, rollout, storefront redesign or execution authorization is implied by this PR.**


## 2026-11-26 — Isolated Ice Cream remediation candidate (NOT DEPLOYED)

**Branch:** `fix/ice-cream-server-pagination-v3` based on GitHub merge `04ebdd304d0b8979b0412f4653d00d18fe36291d`.
**Status:** Local source implementation and unit/SEO qualification complete; staging and production remain **HOLD**.
**Feature gate:** `LUCKYSTORE_ICE_CREAM_PAGINATION=enabled` enables the new path for the Ice Cream leaf category only. The variable is **not set** by this change; the existing behavior remains the default.

### Corrected architectural decision

- **VERIFIED SOURCE:** The Ice Cream slug resolves as a *leaf category* under Snacks, not a grouped-category root. Its identified category has a single ID and can use the existing `search_storefront_catalog_v2` `p_limit`/`p_offset` RPC, with the existing `name, id` sort. No new migration is necessary for this **isolated leaf-category pilot**.
- **VERIFIED SOURCE:** The prior report's `supabase/migrations/20261015090000_stabilize_storefront_catalog_pagination.sql` already exists and updates the older `search_storefront_catalog` RPC, not the active V2 RPC. It is **not a new required migration** for this feature.
- **UNRESOLVED:** Globally ordered and bounded paging across multiple child-category IDs (e.g. Snacks group) is *not solved* by this leaf-only implementation. That work requires independent architecture and staging qualification; no migration is proposed or applied here.
- **UNMEASURED:** The reported 85–95% egress reduction cannot be asserted. The single-category path requests at most `pageSize+1` rows per RPC call, except for documented bounded legacy-fallback probes, but server rendering, translation lookup, caching and network payloads require actual staging measurements.

### Candidate functionality

- 24 products per Ice Cream page using existing leaf category ID and offset, with `hasMore` driving real HTML previous/next links in English and Bengali.
- Valid `?page=2+` uses self-canonical URLs, localized alternates, unique page titles and indexable metadata; `?page=1` redirects via HTTP 308; malformed page numbers fail closed; filtered/sorted queries normalize to page one and remain noindex.
- The client-side Load More button is disabled only when the server slice is active. Default best-match sorting does not reorder the local slice, preserving cross-page database ordering.
- Per-page `ItemList` emits product name, URL and positions corresponding to the current page, without embedded category-page offers; unrelated category schemas remain on the existing path.
- A category-specific compact mobile hero is introduced (192px to 128px on mobile), retaining desktop imagery and the established GridProductCard.
- Legacy name-only fallback first checks whether category-ID items exist before serving a deeper fallback page. Missing category IDs or query errors fail closed instead of presenting empty indexable deep pages.
- The Ice Cream introduction no longer asserts an unverified Chawkbazar location or frozen-delivery guarantee.

### Executed local verification

- Vitest scoped suites: **111/111 passed**, exit 0. Includes route-level English/Bengali canonical, redirect and offset tests; 65/501/1001 static fixture traversal; fallback and malformed-page checks; existing SEO contracts.
- TypeScript: `tsc --noEmit --incremental false` against storefront project **passed**, exit 0.
- Scoped ESLint and `git diff --check`: **passed**, exit 0.
- No Supabase queries, migrations, production requests, live catalog writes or deployment.

### Remaining release gates

**HOLD activation/merge/production release** until all of the following have been independently reviewed:

1. Staging raw HTML crawl with JavaScript disabled: real product and pagination anchors on pages 1–3, correct 404 and 308 responses, and reciprocal locale URLs.
2. Empirical Supabase RPC request counts, bytes, query latency, translation overlays and egress versus the approved baseline. No savings percentage is presently verified.
3. The actual mobile LCP element, TTFB, CLS and first-product position at 360/390/768px, with functional and accessibility testing.
4. Full-category brand/availability/price filter completeness: in the paginated mode, derived filter counts currently reflect the **current page**, not necessarily the entire catalog. This must not be misrepresented as a global facet.
5. Frozen-snapshot ordering and inventory-churn limitations reviewed by a different reviewer, with an exact source SHA and rollback/flag-off receipt.

**Do not set the feature flag in production, deploy, or claim P0 closure based solely on passing tests.**
