# Buying guides baseline, findings, and remediation record

Date: 2026-10-17 (Asia/Dhaka)

Scope: the editorial `/best/[slug]` buying-guide system only. `/best/dealoftheweek` is explicitly excluded except where it shares an RPC contract.

## Baseline report

| Field | Verified baseline |
| --- | --- |
| Repository commit | `5fdba5ac75ef01b7afc0df293bec5afa66de7b12`, created from current `origin/main` in focused branch `codex/buying-guides-audit-remediation`. |
| Deployment commit | Unverified. The live health endpoint reports only `status` and service name; response headers expose no build SHA. |
| Runtime | Storefront declares Node `>=22.12.0`, Next.js `15.5.28`, React `^19.0.0`, TypeScript `^5.9.2`, and Vitest `^4.1.11`. Hostinger build/deploy uses Node 22 and a Next standalone artifact. Local evidence used Node `v22.22.3` and npm `10.9.8`. |
| Database | Production project `hvmyxyccfnkrbxqbhlnm` exposes tenant-scoped `search_storefront_catalog(uuid,text,uuid,integer,integer)` and `search_storefront_catalog_v2(uuid,text,uuid,uuid[],integer,integer)`, both returning JSONB. Both expose `qty_on_hand` and reservation-aware `sellable_qty`. Production v2 currently fails to constrain an empty-query request by `p_item_ids` because `p_query = ''` makes its OR predicate true. |
| Published guides | None. `/best/biscuits-bangladesh`, `/best/milk-powder-bangladesh`, and `/best/ice-cream-bangladesh` each return a real HTTP 404 with `X-Robots-Tag: noindex`. |
| Editorial drafts | Three `review` records exist in source: biscuits, milk powder, and ice cream. They have no author, publication dates, or approval, so the publication contract correctly excludes them. |
| Product evidence | The nine referenced catalogue IDs currently resolve in production with the exact recorded names, categories, positive selling prices, images, and positive `sellable_qty`. This verifies catalogue identity and availability, not package-label facts or editorial claims. |
| SEO state | `/best` returns 200 and a canonical to `https://www.luckystore1947.com/best`; the three unpublished guide URLs are 404/noindex and absent from the sitemap. `www` redirects to the apex host while canonicals use `www`. `robots.txt` returns 200 without a Googlebot-wide disallow. |
| Analytics | Existing consent-gated Zaraz/GA-style commerce path carries `buying_guide_slug` and revision through guide view, product click, add-to-cart, checkout, and purchase code. Production destination receipt/reporting remains unverified. |
| Existing tests | App-scoped focused run: 5 files and 27 tests passed. A repository-root invocation was invalid because it missed the storefront Vitest environment. Storefront `tsc --noEmit` is already red before edits on unrelated matcher declarations and Supabase helper implicit-any errors. |
| Deployment environments | Hostinger workflow defines staging and production environments and packages a standalone Next artifact. Production promotion is gated after staging. Cloudflare fronts live HTTP responses; observed cache status is `DYNAMIC` for `/best` and guide URLs. |

## Findings register

| ID | Status | Evidence and impact | Correction decision |
| --- | --- | --- | --- |
| BG-01 | CONFIRMED | All three source records are `review`; publication filtering excludes them; live routes are 404/noindex. | Publish only the biscuit pilot after accountable human verification and approval. No fabricated approval will be added. |
| BG-02 | CONFIRMED | `catalogue.ts` validates and gates on `qty_on_hand`, although production RPCs expose reservation-aware `sellable_qty`. This can advertise stock already reserved. | Parse and gate on `sellable_qty`; retain physical quantity only as non-commerce data. |
| BG-03 | CONFIRMED | The guide loader calls the category-wide v1 RPC in as many as ten 1,000-row pages. | Repair v2 ID filtering in a forward migration, test the contract, and make guide reads request only the selected IDs. Do not apply the migration to production in this task. |
| BG-04 | PARTIAL | The model and renderer support accountable author and genuine publication/update dates, but review records intentionally omit them and no revision-history view exists. | Keep fail-closed publication; add visible revision/approval context only for genuinely approved content. |
| BG-05 | CONFIRMED | The generated introductions repeat a generic comparison template and do not explain audience, key result, or immediate shopping relevance. | Replace the biscuit pilot copy with evidence-bounded, answer-first editorial content before publication approval. |
| BG-06 | CONFIRMED | The shared generator uses the same price/pack/availability methodology wording for every category. | Store category-specific criteria and display them explicitly. |
| BG-07 | CONFIRMED | Product sections contain recorded name, package amount, generic description/use case, and live offer only. | Add verified brand/image and more useful evidence-bounded comparison detail; do not invent ingredients or ratings. |
| BG-08 | DISPROVEN | A semantic table with caption and responsive wrapper already exists and is covered by server-rendering tests. | Preserve it and extend tests for mobile overflow/accessibility. |
| BG-09 | CONFIRMED | Production rows have images, but the catalogue schema drops `image_url` and cards render no image. | Carry the authoritative image URL through and render it with useful alt text. |
| BG-10 | CONFIRMED | Product cards link to product pages but expose no direct add-to-cart action. | Add a consent/analytics-compatible client action using the existing cart path, disabled when unavailable. |
| BG-11 | PARTIAL | Instrumentation and 4 focused tests exist; live analytics receipt, reporting destinations, and attribution dashboards are not accessible from source evidence. | Preserve the single tracking path, add direct-add event coverage, and document production reporting as unverified. |
| BG-12 | CONFIRMED | Generated records default `relatedSlugs` to an empty array, so no related-guide graph can render. | Populate only links to other published records; while only one pilot is approved, show the real category fallback instead of fake related articles. |
| BG-13 | CONFIRMED | Publication requires matching revision, SHA-256 content hash, verified/approved timestamps, author, and genuine dates; middleware also validates the hash. | Preserve and expand regression coverage; do not weaken this control. |
| BG-14 | PARTIAL | Live robots and real 404/noindex behavior were verified, but no published guide exists to validate crawler-visible article HTML in production. | Validate rendered pilot HTML locally/staging; keep live published-guide verification as a release gate. |
| BG-15 | CONFIRMED | Product JSON-LD has name, URL, and Offer but omits available catalogue image, brand, and stable SKU/identifier fields. | Align schema with visible, authoritative fields and test exact output. |

## Architecture decisions

1. Keep editorial content in reviewed, versioned source records. Publication remains a fail-closed source change with revision-specific cryptographic approval.
2. Treat Supabase public catalogue RPCs as the authority for current price, image, category identity, and sellable stock. Editorial copy must never override current commerce state.
3. Repair `search_storefront_catalog_v2` so a non-null ID list is an exact selector even when the query is empty; preserve store/tenant isolation, limits, grants, and the public projection.
4. Fetch one bounded RPC result for the guide's selected IDs and require exact catalogue identities. Do not scan the whole category.
5. Reuse the existing cart and analytics implementations. Do not install a second tracker or create a parallel cart state.
6. Publish no pilot in this branch without a named accountable approver confirming package labels, copy, dates, and the content hash. The branch can make the pilot publication-ready while leaving it in `review`.

## Verification limitations

- Cloudflare/Hostinger exposed no deployed commit SHA through the checked endpoints.
- Production analytics reports, Search Console, gross-profit reporting, and consented browser delivery were not accessible from repository evidence.
- Catalogue rows verify system-of-record fields only; manufacturer packaging, ingredients, nutritional statements, and broad market superiority were not independently verified.
- The `context-mode` HTML indexer was unavailable because its local `turndown` dependency is missing, so live checks used a bounded fetch-based parser and recorded only derived status/metadata facts.

## Implemented remediation

- Replaced category-wide paginated guide catalogue scans with one bounded `search_storefront_catalog_v2` call for the selected IDs.
- Added a forward migration that makes a non-null `p_item_ids` argument an exact selector while preserving store validation, public projection, grants, and a fixed search path. The migration has not been applied to any environment.
- Switched availability decisions to reservation-aware `sellable_qty`; physical stock remains descriptive only.
- Added authoritative product images, brand, SKU, and matching Product/Offer JSON-LD fields.
- Added an accessible direct add-to-cart action that refreshes guide attribution before reusing the existing cart path and analytics behavior.
- Added category-specific comparison criteria and evidence-bounded biscuit-pilot copy for the three verified Olympic catalogue items. The pilot remains in `review`.

## Verification results

- Focused buying-guide suite: 29/29 passing.
- Full customer storefront suite: 83 files and 535 tests passing on the final rerun. An earlier full run had one five-second SEO-test timeout; the isolated rerun and final full rerun both passed.
- Lint: passing with no issues.
- Production build: passing with zero errors and zero warnings.
- Typecheck: still red on pre-existing Vitest matcher declaration errors across existing tests; the changed buying-guide test was adjusted so it adds no new matcher declaration dependency.
- Synthetic rendered fixture: desktop and 390px mobile layouts display the article, three product cards, two comparison tables, and responsive horizontal table overflow. Alt text is present for all three images. Remote fixture images could not load in the local browser, so image delivery remains a staging check.
- Current live state remains unchanged: review-only guide routes return 404/noindex and the guide is absent from the sitemap.

## Release gates and rollback

1. Apply and validate `20261017100000_fix_storefront_catalog_v2_item_filter.sql` in a disposable or staging Supabase environment, including exact-ID and tenant/store isolation checks.
2. Obtain accountable human approval for the pilot's package-label evidence, author, verified/approved timestamps, publication dates, and revision-specific content hash. Do not synthesize these values.
3. Deploy to staging and verify real image delivery, cart behavior, consented analytics receipt, canonical metadata, JSON-LD, responsive layout, accessibility, sitemap/robots behavior, and performance.
4. Only after those gates, publish and verify the exact production deployment. No deployment or publication occurred in this branch.

Rollback is additive and scoped: revert the feature commits to restore the previous guide renderer/loader, and revert the forward migration with a separately reviewed replacement migration if it has been applied. Do not weaken publication validation or tenant isolation during rollback.
