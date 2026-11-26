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
