---
meta:
  contentType: Reference
  title: Phase 2 — Indexing, Canonical, Sitemap & 404 Hygiene Tracker
  date: 2026-09-08
  status: In Progress — Implementation Started on Branch feat/indexing-sitemap-hygiene
---

# Phase 2 — Indexing, Canonical, Sitemap & 404 Hygiene Tracker

## Purpose

Executes Phase 2 of the SEO Optimization Master Plan: establishing strict canonical consolidation, eliminating soft 404s, returning genuine HTTP 404s for nonexistent products and categories, purging fabricated sitemap fallbacks, unifying category slug algorithms across routes and sitemaps, and guaranteeing that the sitemap contains only canonical, indexable URLs.

## Core Architectural Invariant

> **Lucky Store has exactly one indexable URL for every indexable resource, and the sitemap contains only those URLs.**

---

## Baseline Diagnostics (GSC 24 June – 5 September 2026)

| GSC Classification | Baseline Count | Root Cause / Diagnosis | Phase 2 Remedy |
| --- | ---: | --- | --- |
| Indexed | 1,230 | Valid products, categories, policy pages, and historical URLs | Maintain canonical health; eliminate cannibalizing aliases |
| Excluded by `noindex` | 333 | Parameterized category URLs, transactional funnel (`/cart`, `/order`, `/login`), legacy URLs | Verify intended exclusions; keep parameters `noindex,follow` with clean parent canonical |
| Discovered – not indexed | 22 | Low crawl priority / crawl budget fragmentation from URL permutations | Consolidate duplicate aliases into single canonical via 308 |
| Duplicate without canonical | 13 | Bare UUIDs (`/product/<uuid>`) and outdated slug paths | 308 permanent redirect directly to canonical slug |
| Not found (404) | 8 | Retired legacy products or broken incoming links | Enforce true HTTP 404 response |
| Crawled – not indexed | 7 | Thin or uncanonicalized content | Inspect individually; ensure valid Product schema and content depth |
| Blocked by robots.txt | 4 | Intentional disallow on `/api/` and `/admin/` | Keep intact per security policy |
| Redirect | 3 | Historical redirected URLs | Enforce 1-hop 308 redirect; purge from sitemap |
| Soft 404 | 1 | Unrecognized category slugs rendered empty product search shell with HTTP 200 | Return genuine `notFound()` (HTTP 404) in both metadata and page component |
| Sitemap URLs Discovered | 621 | Live catalog sitemap entries | Enforce 4-point membership rule; eliminate hardcoded fallback; share slug logic |

---

## Implementation Workstream

### 1. Storefront Routing & Status Code Remediation
- [ ] **Category 404 & Alias 308** (`apps/customer_storefront/app/category/[slug]/page.tsx`):
  - `notFound()` called in `generateMetadata` and `CategorySlugPage` when `!canonicalCategorySlug`.
  - Canonical slug alias comparison: if `categorySlug !== canonicalCategorySlug`, execute `permanentRedirect(`/category/${canonicalCategorySlug}`)`.
- [ ] **Product 404 & Slug Canonicalization** (`apps/customer_storefront/app/product/[slug]/page.tsx`):
  - Make `generateMetadata` call `notFound()` when `!product`, matching component behavior.
  - Centralize canonical check: if `slug !== canonicalSlug`, execute `permanentRedirect(`/product/${canonicalSlug}`)`.
- [ ] **Pre-Session Middleware Interception** (`apps/customer_storefront/middleware.ts`):
  - Intercept `/category?cat=...` BEFORE `updateSession(request)`.
  - Normalize slug and preserve non-cat parameters (e.g. `?cat=snacks&sort=price` -> `/category/snacks?sort=price`).
  - Return HTTP 308 in one hop.

### 2. Sitemap Invariants & Hygiene
- [ ] **Shared Canonical Category Slugging** (`apps/customer_storefront/app/sitemap.ts`):
  - Use `getCachedCategories` and shared slug utilities instead of independent `.replace()` algorithm.
- [ ] **Eliminate Fabricated Fallbacks**:
  - Delete hardcoded fallback category array; return `[]` on DB error.
- [ ] **Product Sitemap Eligibility Contract**:
  - Filter by: `is_active = true`, `store_id = STORE_ID`, non-empty name, price > 0, deterministic slug.
- [ ] **Truthful `lastModified`**:
  - Omit `lastModified` if trustworthy database timestamp unavailable; do not use `new Date()`.

### 3. Automated SEO Contract Testing
- [ ] Create `apps/customer_storefront/app/lib/__tests__/seo-routing-contract.test.ts` covering:
  - Product 200, 308, 404 paths
  - Category 200, 308, 404 paths
  - Middleware query parameter preservation & normalization
  - Sitemap invariant enforcement
