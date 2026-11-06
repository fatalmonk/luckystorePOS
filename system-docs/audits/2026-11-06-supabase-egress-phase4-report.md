# Supabase Egress Phase 4 Optimization Report

**Date:** 2026-11-06  
**Branch:** `perf/supabase-egress-phase4`  
**Commits:** `50c0716a`, `0090a4a4`, `915ef4fa`, `893bd0fe`  
**Scope:** Customer storefront steady-state Supabase read and egress reduction across middleware, cart promotion polling, and brand catalog resolution.

---

## Executive Summary

Phase 4 addresses the remaining unmeasured/steady-state Supabase egress leaks identified in the Phase 1 & 2 audits. By targeting three high-frequency application paths—middleware category interception, client-side cart polling, and brand page product hydration—we eliminated unnecessary database roundtrips, unconstrained loops, and background tab queries while maintaining strict fail-open/fail-closed semantics.

| Area | Prior Behavior | Optimized Behavior | Impact |
| --- | --- | --- | --- |
| **B: Middleware Category Interception** | `no-store` REST fetch to `/rest/v1/categories` on every `/category/<slug>` and `/bn/category/<slug>` request. | Module-scope in-memory `Set<string>` with 5-minute TTL. Stale cache retained on upstream failure; fail-open preserved if cold. | Eliminates per-request database hits on all category routes. $O(N) \to O(1)$ per 5 min. |
| **C: Cart Promotion Polling** | Unconditional 30-second `setInterval` polling `loadActiveStorefrontPromotions` via Supabase client, even in hidden/background tabs. | Integrated `visibilitychange` listener. Automatically halts interval when `document.hidden === true`; resumes immediately with fresh price refresh upon refocus. | Eliminates idle/background tab egress entirely. |
| **A: Brand Page Resolution** | Serial `while (hasMore && page < 10)` loop fetching pages of 1,000 rows per search term sequentially before post-filtering. | Concurrent `Promise.all` over search terms with a single 1,000-row page limit per term, matching the current ~700-row catalog scale. | Drops Supabase queries per brand visit from $N_{\text{terms}} \times \le 10$ down to $N_{\text{terms}} \times 1$. |

---

## Detailed Implementation & Changes

### 1. Middleware Category Slug Cache (`apps/customer_storefront/middleware.ts`)
- **Problem:** Every visitor or crawler navigating to a category route invoked `isKnownCategorySlug`, generating a direct HTTP call to Supabase REST with `cache: 'no-store'`.
- **Solution:** 
  - Added module-level `_categorySlugsCache` (`Set<string>`) and `_categoryCacheExpiresAt` with a 300,000 ms (5 min) TTL.
  - On miss/expiry, fetches active category slugs/names once into a `Set` for instant $O(1)$ lookups.
  - Fail-open fallback: If Supabase fails on a cold boot, category routes remain accessible (`return true`). If stale cache exists, it serves existing known categories.
  - Added test helper `_resetCategorySlugCacheForTest()` to ensure deterministic unit testing.

### 2. Tab-Aware Promotion Polling (`apps/customer_storefront/app/hooks/useCart.ts`)
- **Problem:** Active shopping sessions left open in background tabs executed Supabase queries every 30 seconds perpetually.
- **Solution:**
  - Added lifecycle management around the polling interval:
    - `startInterval()` / `stopInterval()` invoked via `document.addEventListener('visibilitychange', ...)`.
    - If `document.hidden` is true at mount or becomes true, the interval is cleared.
    - Upon becoming visible, an immediate `refreshPromotions()` runs and the interval restarts.
  - Added 3 automated regression unit tests in `app/lib/__tests__/useCart.test.ts` testing mount-hidden, visibility-restore, and tab-hiding transitions.

### 3. Concurrent Brand Page Fetching (`app/(english)/brand/[slug]/page.tsx` & `app/(bengali)/bn/brand/[slug]/page.tsx`)
- **Problem:** Brand catalog pages searched each alias/term in a sequential `while (hasMore && page < maxPages)` loop, fetching up to 10 pages per term.
- **Solution:**
  - Since the total product catalog is ~700 active items, any brand's matching items fit comfortably within a single 1,000-row fetch.
  - Replaced the sequential `while` loops with `Promise.all` querying each term concurrently (`repo.search({ query: term, limit: 1000, page: 0 })`).
  - Preserved brand validation via `isProductOfBrand()` and deduplication via `Map<string, Product>`.

---

## Verification & Test Results

### Unit & Integration Suites
Command:
```bash
npx vitest run app/lib/__tests__/useCart.test.ts app/lib/__tests__/brandsData.test.ts app/lib/__tests__/seo-routing-contract.test.ts
```
Result:
- `brandsData.test.ts`: 7 passed (7)
- `useCart.test.ts`: 21 passed (21, including 3 new visibility polling tests)
- `seo-routing-contract.test.ts`: 64 passed (64, including middleware fail-open & category canonicalization)
- **Total:** 92 passed, 0 failed.

### Static Analysis
Command:
```bash
npx tsc --noEmit -p apps/customer_storefront/tsconfig.json
```
Result: Clean exit (code 0), zero TypeScript errors.

---

## Rollout & Operational Guardrails

1. **Deploy Path:** Push branch `perf/supabase-egress-phase4` to GitHub and open PR targeting `main`.
2. **Monitoring:**
   - Review Cloudflare/Hostinger edge execution times on `/category/*` routes to observe latency reduction from middleware caching.
   - Monitor Supabase Edge logs for reduction in `/rest/v1/categories` and `/rest/v1/storefront_item_promotions` request volume.
