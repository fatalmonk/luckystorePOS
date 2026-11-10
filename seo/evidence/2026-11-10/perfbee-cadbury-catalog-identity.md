# Cadbury catalog identity correction — 2026-11-10

## Evidence

- Production catalog item master identifies `items.sku=CC-CDM-GEN`, UUID `4dc60601-5883-4ab4-98a7-d5e8b1ca8adb`, as **Cadbury Dairy Milk Chocolate Bar, 13.2 g**, priced at ৳45.
- The same product’s 132g-slug route was represented by PerfBee as a 10g product. The enrichment registry repeated the unsupported 10g identity and attached manufacturer claims whose evidence URL was a 110g product page.
- Corrected enrichment is limited to catalog-supported identity, package size, category, and an exact-identity summary. Manufacturer-only claims and their invalid provenance were removed. Existing Lucky Store doorstep-inspection wording retains its policy evidence.
- The summary was reduced to `Cadbury Dairy Milk Chocolate Bar, 13.2 g.` after review confirmed that the catalog record does not verify flavor or texture descriptors.

## Regression coverage

- `apps/customer_storefront/app/lib/products/productMetadata.test.ts`: exact catalog-backed summary and no stale 10g claim in specifications or highlights. The review finding reproduced RED before the summary correction and passed GREEN afterward.
- `apps/customer_storefront/app/(english)/product/[slug]/ProductClient.test.tsx`: generated metadata, H1, Product JSON-LD name, and unchanged ৳45 offer price.

## Verification

- `npm run typecheck` — passed.
- Focused Vitest suites — 2 files, 64 tests passed.
- Full storefront Vitest — 114 files, 861 tests passed.
- `npm run lint` — passed.
- Independent diff review — no findings.
- `npm run build` — blocked during prerender of `/blog`: local Supabase environment variables and `NOTFAIR_SEO_API_KEY` are unavailable; build attempted placeholder Supabase host and failed DNS resolution.
- `npm run test:html-contract` — failed because the unsuccessful build did not produce `.next/server/preview-props.json`.

## Limits

The recorded 2026-11-10 PerfBee scan predates the #614 production deployment. No post-release comparable crawl or score change is claimed. No merge or deployment was performed.

## Follow-up — bilingual identity and description correction

- Read-only production GETs on 2026-11-10 showed `/product/cadbury-dairy-milk-chocolate-bar-132-g--4dc60601` with English title/H1 `Cadbury Dairy Milk Chocolate Bar 10g`, while `/bn/product/cadbury-dairy-milk-chocolate-bar-132-g--4dc60601` used `Cadbury Dairy Milk Chocolate Bar, 13.2 g`. Both use the same product UUID and route slug; the English enrichment override caused the mismatch.
- The published Bengali description currently says “100% sustainably sourced cocoa,” for which no SKU-matching packaging or manufacturer evidence was found. This PR does not write to the translation table; for published translations, the route now uses the code-reviewed Bengali enrichment summary instead. Unpublished translations remain excluded from that override and from indexable alternates.
- English and Bengali enrichment now use the catalog name/weight and localized, fuller descriptions. Cadbury's Dairy Milk range page supports the “classic creamy taste” brand-family wording; the evidence note explicitly excludes SKU-level formulation, ingredients, origin, and cocoa-sourcing claims. The local copy targets Cadbury Dairy Milk / Cadbury chocolate searches with Chawkbazar and Chattogram context, without claiming nationwide service or promising ranking gains.
- `productMetadata.ts` now keeps decimal pack sizes such as `13.2 g` intact during sentence extraction. The previously failing regression showed that the decimal point caused the enriched local description to be discarded for generic metadata.
- Focused follow-up verification: 4 Vitest files, 92 tests passed, including exact SKU name, English and published-Bengali metadata, metadata length/local context, rendered English H1/overview, Product JSON-LD identity, evidence-manifest integrity, and the decimal-size description regression. Full storefront verification: 115 files / 862 tests passed; typecheck, targeted ESLint, and `git diff --check` passed.
