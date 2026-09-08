---
meta:
  contentType: Reference
---

# Indexing remediation manifest — 8 September 2026

## Status

Preflight template for SEO Phase 2. The aggregate counts are verified live from Search Console for 24 June–5 September 2026. No URL-level remediation is approved until the relevant export and URL Inspection evidence are attached.

## Verified aggregate baseline & Phase 2 Technical Resolution

| Search Console status | URL count | Root Cause Diagnosis | Technical Remediation (Phase 2) | Acceptance Test Status |
| --- | ---: | --- | --- | --- |
| Indexed | 1,230 | Valid products, categories, policy pages | Self-canonical preservation; eliminate duplicate alias competition | Invariant tested |
| Excluded by `noindex` | 333 | Parameterized category URLs, `/cart`, `/order`, `/login` | Intended exclusion: emit `<meta name="robots" content="noindex, follow"/>` + clean parent canonical | Verified in tests |
| Discovered, currently not indexed | 22 | Crawl priority diluted by duplicate aliases | Consolidate duplicate aliases into single canonical via 308 | Consolidated via 308 |
| Duplicate without selected canonical | 13 | Bare UUIDs (`/product/<uuid>`) and outdated slug paths | Centralized HTTP 308 `permanentRedirect` to canonical slug | Contract tested (13 tests) |
| Not found | 8 | Missing/retired items or broken incoming links | Enforce true HTTP 404 response (`notFound()` in metadata + component) | Contract tested |
| Crawled, currently not indexed | 7 | Thin or duplicate content signals | Ensure server-rendered JSON-LD schema, clean canonical, and high-value internal links | Monitored |
| Blocked by robots.txt | 4 | Operational endpoints (`/api/`, `/admin/`) | Retain intentional disallow in `robots.txt` per security policy | Verified |
| Redirect | 3 | Historical redirects | One-hop HTTP 308 permanent redirect; excluded from sitemap | Enforced |
| Soft 404 | 1 | Unrecognized category slugs rendered empty product search shell with HTTP 200 | Return genuine `notFound()` (HTTP 404) in both metadata and component | Contract tested |
| Sitemap URLs discovered | 621 | Live catalog sitemap entries | Purge hardcoded fallback; share category slugger; enforce strict product eligibility contract | Reconciled & tested |

---

## Verified Phase 2 Route Actions

### 1. Legacy & Duplicate Consolidation (HTTP 308)
- `GET /category?cat=[slug]` -> `308 Location: /category/[normalized-slug]` (preserves non-cat query params, runs pre-session in middleware)
- `GET /category/[unnormalized-alias]` -> `308 Location: /category/[canonical-slug]` (preserves query params)
- `GET /product/[bare-uuid]` -> `308 Location: /product/[name--id-prefix]`
- `GET /product/[outdated-slug]` -> `308 Location: /product/[current-name--id-prefix]`

### 2. Missing Resource Semantics (HTTP 404)
- `GET /product/[nonexistent-slug]` -> `notFound()` executed in both `generateMetadata` and `ProductPage` -> HTTP 404
- `GET /category/[nonexistent-slug]` -> `notFound()` executed in both `generateMetadata` and `CategorySlugPage` -> HTTP 404

### 3. Sitemap Membership Invariants
- Dynamic categories: Sourced via `getCachedCategories()` and normalized via `normalizeCategorySlug()`. Fabricated fallback category array completely removed.
- Dynamic products: Sourced via `search_items_pos` filtered by `is_active === true`, `store_id === STORE_ID`, `price > 0`, non-empty name and UUID.
- `lastModified`: Sourced only from legitimate database timestamps (`updated_at` / `created_at`). If no content timestamp is available, `lastModified` is omitted rather than injecting synthetic dates.

---

## Required manifest fields

One row per exact URL:

| Field | Required value |
| --- | --- |
| Source status | Exact Search Console exclusion/indexing status |
| Source evidence | Export filename/date plus URL Inspection date |
| Exact source URL | Absolute URL |
| HTTP response | Status code and redirect chain, if any |
| Rendered canonical | Absolute canonical URL or missing |
| Google-selected canonical | URL Inspection result |
| Index directive | Rendered robots meta and relevant header |
| Robots access | Allowed/blocked plus matching rule |
| Sitemap membership | Sitemap URL and lastmod, or absent |
| Internal references | Count and source pages for meaningful links |
| Replacement URL | Exact one-to-one destination, when applicable |
| Intended state | Index, redirect, noindex, gone, or blocked |
| Proposed action | Smallest change needed to reach intended state |
| Owner | Named accountable owner |
| Acceptance test | HTTP, rendered DOM, canonical, sitemap, and URL Inspection checks |
| Rollback | Commit/config reversal and previous state |
| Observation | Recrawl/validation date and final result |

## Decision rules

### Legacy or duplicate URLs

- Use a permanent redirect only for a true one-to-one replacement.
- Do not redirect unrelated retired products to a category or homepage merely to remove a 404.
- Do not remove `noindex` until canonical ownership, sitemap membership, and content purpose are confirmed.
- Keep only canonical, indexable URLs in the sitemap.

### Pending-index URLs

- Do not request recrawl in bulk.
- Check status, canonical, robots directives, server rendering, duplication, content usefulness, internal discovery, and sitemap membership first.
- Request recrawl only after the underlying issue is corrected and verified.

### Robots-blocked URLs

- Do not unblock `/api/`, `/admin/`, private, or non-search surfaces without an explicit product/security decision.
- Record the exact matching robots rule before proposing a change.

### 404 and soft-404 URLs

- Preserve a real 404/410 when content is intentionally gone and no equivalent replacement exists.
- Fix internal links and sitemap references independently of redirect decisions.
- For a soft 404, verify HTTP status, rendered substance, template state, and canonical before deciding.

## Acceptance gate

No row is complete until:

1. The exact URL and intended state are documented.
2. Before-state evidence is attached.
3. The smallest remediation is implemented in an authorized file/change surface.
4. Plain and cache-busted URL checks agree.
5. HTTP response, rendered canonical, robots directive, and sitemap state match the decision.
6. Search Console validation or recrawl observation is recorded.
7. The rollback reference is retained through the observation window.
