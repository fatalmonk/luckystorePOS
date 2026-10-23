# Customer storefront and SEO audit — 23 October 2026

## Scope

Read-only inspection of the local customer storefront at `http://localhost:3000/`, its product page template and enrichment registry, and the related SEO resources. The review combined browser inspection at sampled desktop, tablet, and mobile widths with targeted source checks. It covered home, category, product, deal, editorial, policy, contact, blog, and Bengali routes. No application or catalog data was changed.

## Summary

The storefront has a sound SEO foundation: canonical product URLs, server-rendered product metadata, Product JSON-LD, AI crawler directives, `llms.txt` resources, markdown content negotiation, and a dynamic bilingual sitemap. The sample product page rendered metadata and offer data in HTML.

Three customer-facing issues were observed: low contrast for a dark-mode hero CTA, overlap between mobile reassurance copy and the fixed bottom navigation, and image loading placeholders remaining visible over loaded product images. One store-fact consistency issue also needs clarification: the full LLM document gives a typical 60–90 minute delivery time, while the markdown delivery page promises same-day dispatch. These claims may both be accurate but describe different milestones; make that distinction explicit and consistent.

## Findings

### F01 — Hero CTA contrast fails in dark theme (P1 accessibility)

**Evidence:** On the local home page in dark theme, “Check delivery area” rendered with approximately `#F5F0EB` foreground over `#FFEDB4`, approximately 1.03:1 contrast. The CTA is in [CampaignGrid.tsx](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_storefront/app/components/CampaignGrid.tsx:82).

**Impact:** The action text is difficult to distinguish. The measured contrast is below the 4.5:1 WCAG AA threshold for normal text. Review the theme-specific foreground/background pairing.

### F02 — Mobile reassurance overlaps the bottom navigation (P2 responsive)

**Evidence:** At a 390px-wide home view, “Pay after inspection” occupied approximately y=762–792px while the fixed bottom navigation began at y=784px, an overlap of about 8px.

**Impact:** The reassurance text competes with the navigation and can be obscured. Add sufficient bottom space or account for the fixed navigation in the hero layout.

### F03 — Loaded product images retain shimmer placeholders (P2 visual)

**Evidence:** On sampled deal and category pages, several product images had completed loading with non-zero natural dimensions while their `.animate-pulse` overlays remained visible. The placeholder visibility is controlled by `imageLoaded` and `onLoad` in [ProductImage.tsx](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_storefront/app/components/product/ProductImage.tsx:172).

**Impact:** The shimmer dulls product photography after load. Check the image load state and placeholder lifecycle, including cached image and hydration paths.

### F04 — Delivery timing language is not aligned across AI-readable sources (P2 content consistency)

**Evidence:** `public/llms-full.txt` says delivery is typically within 60–90 minutes during operating hours. The content-negotiated markdown page at `/delivery` says orders placed during active hours are dispatched same day. The markdown route derives current fees and schedule from `DELIVERY_POLICY` in [route.ts](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_storefront/app/api/markdown/route.ts:360).

**Impact:** A reader may interpret these as contradictory delivery promises. Confirm the operational meaning of each and use consistent wording for delivery window versus dispatch timing. This audit did not independently verify store operations.

### F05 — Delivery route falls back to client rendering in deployed HTML (P2 technical SEO)

**Evidence:** The Vercel production deployment `dpl_FJZYiYbyECn4TAgH3yufUUAqodz6` is READY on `main` at commit `c44ed1b9982fd604a0874c9a7ff982c1f7dab21b`. Its `/delivery` response contains a loading skeleton, no delivery H1, and three `BAILOUT_TO_CLIENT_SIDE_RENDERING` templates. The only parseable JSON-LD block describes Store/GroceryStore/Organization; FAQPage appears only in escaped Next Flight data. The delivery route's Header subtree includes unbounded `useSearchParams` calls in `Header` and `LanguageSwitcher`.

**Impact:** Initial HTML omits delivery content and FAQ structured data, leaving crawlers dependent on client rendering. A height-reserving Suspense boundary has been added around Header to contain the bailout. This source-level mitigation is not yet validated: `vitest` and `next` are unavailable in the worktree, localhost:3000 was unavailable, and no deployment was made.

### F06 — “All” category navigation was clipped by the fixed side rail (P2 responsive; resolved locally)

**Evidence:** A tablet-width local browser view showed the “All” category link clipped beneath the fixed left rail while the accessibility tree still exposed it. The later local audit recorded that the link was moved outside the horizontally scrolling category strip and the tablet strip offset beyond the rail; its focused Header test passed (3 tests). This is recorded as a resolved local finding, not a claim of exhaustive device coverage.

**Impact:** Shoppers could miss the control that returns them to the full catalog. The stash’s audit evidence says the local layout and focused test addressed the issue; deployed and cross-device verification were not established by that evidence.

## Product-page SEO verification

- The sampled `/product/igloo-cake-1-l--fa698e2d` route returned HTTP 200 HTML with a title, canonical link, matching H1, and Product JSON-LD containing product name, SKU, brand, current price, BDT currency, availability, canonical offer URL, and image.
- Product metadata is generated from the catalog record and available enrichment in [page.tsx](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_storefront/app/(english)/product/[slug]/page.tsx:19). Noncanonical product slugs redirect to the canonical slug.
- The product schema is emitted by [ProductJsonLd.tsx](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_storefront/app/components/seo/ProductJsonLd.tsx:56). This confirms implementation and rendered structure for one sample, not the factual accuracy or rich-result eligibility of every product.
- A second sampled product path returned HTTP 308, so it did not provide a second rendered-product check.

## AI SEO and crawlability verification

- The local server returned HTTP 200 for `/robots.txt`, `/llms.txt`, `/llms-full.txt`, and `/sitemap.xml`.
- `robots.txt` explicitly allows GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, and cohere-ai to crawl public pages, and disallows account, checkout, order, search, admin, and API paths.
- `llms.txt` links to core pages, policies, popular shopping routes, and the full reference document. The full reference contains store identity, contact, hours, service radius, and delivery policy facts.
- The sitemap implementation supplies English/Bengali alternates and caps dynamic product collection below the protocol URL limit. The locally served sitemap was approximately 452 KB.
- The homepage returns a markdown representation when requested with `Accept: text/markdown`. That representation is a separate content form; it is not expected to contain the HTML JSON-LD script.
- These checks confirm local serving behavior. They do not prove that public bots can crawl the deployed site or that ChatGPT, Perplexity, or Google AI answers cite Lucky Store.

## Enrichment evidence-pipeline review

The registry contains 584 product enrichment entries. A lightweight static scan found 538 `STORE_INSPECTION_POLICY` references in per-product evidence references without a same-entry manifest key. The registry imports shared policy constants, and the pipeline contract explicitly permits the shared inspection policy. Therefore this scan alone does **not** establish a contract defect; the existing `product-enrichment-contract.test.tsx` is the authoritative deterministic check. It was not run as part of this read-only audit.

This audit did not validate individual product identities, package claims, ingredients, images, or manufacturer evidence against public brand sources or packaging. No product-specific enrichment is certified by this report.

## Coverage and limitations

- Browser coverage was sampled rather than exhaustive. Category routes were enumerated and visited, but loading states and viewport overrides varied across navigation; findings are limited to directly observed states.
- Desktop, tablet, and mobile layout was inspected in browser emulation. No physical iPad/iPhone certification, assistive-technology traversal, full keyboard audit, or device-specific rendering test was performed.
- Sampled browser console logs were clear, and sampled routes had no broken images or document-level horizontal overflow at inspected widths.
- The live Impeccable detector could not launch its browser. A scoped static detector completed and reported mostly advisory design-token drift; it is not a substitute for visual review.
- Jev Browser Use could not reach its TypeSafe provider because DNS resolution failed in the runtime. Browser inspection continued directly through CUA as a fallback; no Jev-assisted research verdict is claimed.
- No application tests, production crawler checks, Rich Results validation, or AI answer-platform query checks were run.
- Existing Impeccable context files are out of date relative to their linked project guidance, so static design-system findings may be incomplete.

## Suggested next steps

1. Fix and recheck dark-theme CTA contrast and mobile hero clearance.
2. Investigate why loaded images keep their shimmer overlays.
3. Clarify and align delivery-time statements across `llms-full.txt`, markdown delivery output, and customer-facing delivery content.
4. Run the product enrichment contract test before relying on registry-wide evidence integrity.
5. For product-specific enrichment, select target SKUs and collect dated, source-linked packaging or official manufacturer evidence before proposing catalog changes.

## Implementation and follow-up — 23 October 2026

- Fixed the dark-theme hero delivery CTA text contrast and reduced mobile hero height/spacing so the reassurance row clears the fixed navigation in the inspected narrow browser view. Dark-theme text/background contrast measured 16.88:1.
- Fixed the product-image shimmer race for cached images by checking `complete` and `naturalWidth` after mount. The product image fallback remains in place for failed images.
- Removed the unsubstantiated 60–90 minute arrival estimate from `llms-full.txt`. The shared delivery policy supports same-day dispatch during active delivery hours but does not state an arrival estimate.
- Added Product JSON-LD to Bengali product pages using the shared schema component. Bengali Open Graph/Twitter image metadata now follows a curated product gallery image when one exists.
- Rechecked local English and Bengali pages for enriched and unenriched products. Product title, H1, canonical URL, JSON-LD identity/offer/image, metadata image and alt, and visible image alt were consistent in the sampled cases. A sampled out-of-stock English item emitted `https://schema.org/OutOfStock`.
- The checked catalog samples did not expose a barcode/GTIN value. Valid GTIN-13 output is covered by component tests, but no live catalog GTIN case is claimed.
- Focused tests passed: `CampaignGrid.test.tsx` and `ProductImage.test.tsx` (8 tests), plus enrichment contract, SEO routing, product metadata, and Product JSON-LD tests (111 tests).

The mobile browser viewport override did not confirm an exact 390 CSS-pixel viewport; mobile clearance is reported only for the narrow view inspected. Deployed crawler endpoints and AI answer-platform visibility remain unverified at this point.

## Production follow-up — 23 October 2026

- A public content fetch indexed `robots.txt`, `llms.txt`, `llms-full.txt`, `sitemap.xml`, and `/delivery`; it exposed crawl directives but did not return exact HTTP status/content type for each resource.
- A fresh browser navigation to `https://www.luckystore1947.com/` failed with `ERR_TOO_MANY_REDIRECTS`. The subsequent apex retry was blocked by the browser after the navigation error; a separate public page fetch timed out for both homepage hosts. Therefore the canonical host and redirect chain are unresolved, and no canonical mismatch is confirmed.
- No production hosting or DNS settings were changed. Exact crawler response metadata and AI answer-platform citation checks remain open.
- A later local SEO test rerun was blocked before tests started: Vitest could not resolve `@vitest/utils` (`ERR_MODULE_NOT_FOUND`). The previously recorded focused test run passed before the latest Bengali social metadata adjustment; rerun after restoring the local dependency install.

## Storefront SEO and image review — 23 October 2026

### Product route coverage

- Enumerated 36 current Polar product sitemap URLs (the previous checklist says 29, but its source URL list was not present). All 36 returned HTTP 200 with one H1, canonical URL, Product JSON-LD, unique title and meta description, and at least one internal link. The Polar brand page links 24/36 directly; all routes are also represented in related-product links. Eight have category-page links and five are linked from the homepage.
- The exact historic 29-URL set cannot be reconciled without its source list. The current 36-route scan found no missing/broken product route.
- A production catalog record contains barcode `8941104021007`, but that value fails GS1 Modulo-10 GTIN-13 validation. The shared schema correctly omits it as a GTIN; no valid GTIN-bearing live product was verified.
- `ProductJsonLd` accepted relative image paths verbatim. This branch normalizes relative and protocol-relative Product `image` values to absolute HTTPS URLs while preserving already absolute CDN URLs; a regression test covers both cases.

### Polar image evidence

- The Kheer asset URL and Vanilla assets return HTTP 200. Visual inspection shows the Kheer and Vanilla “500 ml” files present a tub labeled `Net Volume: 1 Liter` with an added `1/2L` badge. Official Polar manufacturer pages list the Kheer and Vanilla tubs as 1000 ml: [Kheer](https://polarbd.com/en/product/tub-kheer/) and [Vanilla](https://polarbd.com/en/product/tub-vanilla/).
- Current CDN availability is not proof of a missing-image defect; the problem is package-size accuracy. No verified official 500 ml package image was found. No image, catalog, or R2 data was changed. Keep these product fixes open until an authenticated product package source confirms the correct pack.

### Image SEO sample (not a sitewide score)

Representative sample: homepage (115 `<img>`), Polar brand page (34), three Polar product pages (23 each), and Aarong milk product page (23). This is a sampled template-level review; it did not capture byte sizes because the image CDN responses omitted `Content-Length`.

| Image group | Findings | Action |
| --- | --- | --- |
| Home and brand pages | No missing `alt`; 7 home and 1 brand images use empty alt, consistent with decorative usage in the sampled markup. 107/115 home and 26/34 brand images lack element width/height attributes. No sampled `srcset`. | Confirm meaningful/decorative intent; prefer responsive candidates and reserve dimensions/aspect ratio. |
| Product detail primary and related images | No missing or empty alt in sampled pages; primary images load eagerly and related images lazily. 17/23 images per sampled page have no width/height attributes. `sizes` is present on product images but has no `srcset`, so no candidate selection benefit. | Add responsive variants where available and ensure frame aspect-ratio reserves layout space. Preserve eager loading for the primary image and lazy loading below the fold. |
| Sampled assets | Product photos use WebP, with a PNG for the Polar Vanilla “500 ml” asset. Filenames are generally product-specific or SKU-based. Byte weight unavailable. | Convert large photographic PNGs only after checking their actual weight and visual quality; do not infer optimization need from extension alone. |
| Product discoverability | Product JSON-LD includes `image`; rendered product images are reachable in HTML. Sitemap has 916 URLs and no image entries. | Consider image sitemap only if image search coverage justifies it; it is not a current blocker. |

**Sample image SEO score: 5/10, using an explicitly scoped 10-point checklist (alt quality 2, naming/format 2, responsive candidates 2, layout reservation 2, loading priority 1, discoverability 1).** The sample earns full alt and loading points, partial naming/format and layout points, and partial discoverability; it loses responsive-candidate points. This score is a diagnostic summary of the sampled HTML, not a Google ranking metric. Missing CDN byte sizes and no Search Console image-performance data limit confidence.

Expected CWV impact: adding reliable responsive variants can reduce transferred bytes on narrow viewports; explicit image dimensions or stable parent aspect ratios can reduce layout shifts. No numeric improvement is claimed without measurement.

### AI-readable resources and host behavior

- Fresh public requests returned HTTP 200 for `robots.txt`, `llms.txt`, `llms-full.txt`, `sitemap.xml`, and `/delivery`; the sitemap contains 916 `www` URLs and no image sitemap entries. `robots.txt` allows named AI crawlers on public pages and disallows private paths.
- `/delivery` returned `text/html` even when the request preferred Markdown. The site’s `/api/markdown` route emits `text/markdown`, but rewrites only expose `/auth.md` and `/.well-known/auth.md`; a generic public content-negotiation route was not verified by this check.
- A fresh HTTP redirect-chain request showed apex `luckystore1947.com` issuing one 301 to the corresponding `www` URL, then 200. CUA navigation to `www` continued to fail with `ERR_TOO_MANY_REDIRECTS`; retain the browser/session discrepancy as unresolved. No hosting or DNS changes were made.
- OpenSEO has no AI visibility tracker configured. A one-off 2-prompt × 4-engine check is estimated at $0.14; it has not been run and requires the user’s explicit approval.

### Validation status

- The Sol 6.1 code review approved the final code diff after two fixes: Bengali metadata/schema now respect an explicitly empty gallery, and the hero CTA keeps readable paired colors on hover in dark theme. No remaining critical or important findings were reported. The reviewer suggested route-level Bengali coverage for empty galleries, translated Product schema, and canonical URLs.
- `git diff --check` passed. The focused Vitest command exited 127 because `vitest` is not installed/resolvable in this worktree (`sh: vitest: command not found`). The storefront typecheck also could not complete: TypeScript definitions for `@testing-library/jest-dom` and `vitest/globals` are missing, and writing `tsconfig.tsbuildinfo` returned `EPERM`.
- Pending: restore the local dependency installation, add/execute the Bengali route regression test, then rerun the focused test suite, typecheck and build.
- No production deploy, catalog mutation, image upload, or host configuration change was made.

### Manufacturer catalogue images and product facts — 23 October 2026

- Reviewed the saved Polar catalogue capture (`social-media/catalogue-images/jev-findings/catalogue.json`) and reconciliation report. The capture lists 60 products, descriptions, ingredients, allergens, nutrition per 100 g, 720 image URL variants, and 472 downloaded image files (464 WebP and 8 PNG; the folder also contains `.DS_Store`).
- The storefront already curates 23 local Polar image files across 23 gallery references, plus one external gallery URL. The Chocodelight asset visually matches its cone product. Royal Sundae has four existing gallery URLs; no R2/Supabase image write was needed. The reconciliation report's Royal image gap is stale relative to the current registry.
- Kept the four edited half-liter badge images out of product galleries because their on-image size claim conflicts with the underlying 1 L package artwork.
- Added manufacturer-backed ingredient and allergen specifications and an explicitly labeled per-100-g energy panel for the 15 exact Polar product matches in the current enrichment registry. Chocodelight now uses the live `IC-POL-CHD` product ID and SKU after a corrected read-only catalog lookup; the earlier probe queried a different SKU string. Its image remains local and no live image URL changed.
- Corrected Royal Sundae's variant handling: the storefront now labels separate caramel (246.23 kcal) and chocolate (243.95 kcal) values per 100 g, and identifies caramel ingredients as variant-specific. Other nutrition values besides energy remain unexposed because the capture's salt units are inconsistent.
- Removed Chocodelight's unsupported cool/dry storage copy; the saved manufacturer evidence did not verify frozen-storage instructions for that SKU.
- The selected catalogue facts were not submitted to Jev research guard because Jev's provider was unavailable in this session. Manufacturer URLs remain attached to enrichment evidence records. No catalog write, image upload, R2/Supabase sync, or deployment was made.
- Added regression coverage for evidence-backed Polar ingredients, allergens, nutrition values, and the product-page nutrition measurement basis. Execution is pending because this worktree lacks Vitest dependencies; `git diff --check` passed.
- Corrected the Coffee 1 L and Doi 1 Liter enrichment records so volume claims cite the dated Lucky Store catalog records; the corresponding manufacturer pages do not state tub volume. Updated their net-quantity fields, summaries, specification rows, quantity highlights, and FAQ evidence references, and added regression assertions for the provenance boundary. A static provenance check passed for both records. The focused test command could not start because `vitest@5.0.5` is absent (`npm exec --no -- vitest run app/lib/__tests__/product-enrichment-contract.test.tsx`); dependencies were not installed.

## Production verification update — 24 October 2026

- **Delivery policy confirmed by the owner:** delivery remains limited to 1 km. The previously reported 5 km `delivery_zones` value is not the operating policy. Keep the checkout boundary enforcement question separate from that stale database value; do not describe this as a policy mismatch. The reviewed order records are accurate: the referenced orders were cancelled because delivery could not be completed on time. Remove the earlier attribution concern for those records; late delivery is an operational issue.
- **Canonical host verified on the public domain:** requests to `https://luckystore1947.com/` and `/delivery` returned one 301 to the corresponding `https://www.luckystore1947.com/` URL, which returned 200. Both destination pages declare `www` canonicals. The public sitemap returned 916 URLs, all on `www.luckystore1947.com`. This supersedes the earlier unresolved redirect note for these sampled routes and sitemap. The check does not establish redirect behavior for every URL or resolve Google-selected canonicals in Search Console.
- **FAQ JSON-LD remains absent from the public delivery response:** repository source includes `getDeliveryFaqSchema()` on the English delivery page, but the fetched public `/delivery` HTML contained no `FAQPage` in its `application/ld+json` script. The FAQ object appeared in Next.js Flight/hydration data, which is not itself an emitted JSON-LD script. The Bengali `/bn/delivery` response likewise had no `FAQPage` JSON-LD. Therefore source presence is not evidence that FAQ structured data is live.
- The public responses identified Cloudflare and Next.js headers; these do not identify the origin host. No Hostinger control-panel or origin-level deployment evidence was available in this check. The Lighthouse `noindex` finding discussed separately was from the Vercel deployment and is not treated as a Hostinger production finding.
- **Follow-up:** when GitHub Actions usage is available and the intended build can be deployed to Hostinger, fetch the public English and Bengali delivery pages again and confirm `FAQPage` appears in actual `application/ld+json` blocks. If it remains absent after deployment, debug the route/component rendering rather than adding duplicate schema. No code, hosting configuration, production data, or deployment was changed in this follow-up.
