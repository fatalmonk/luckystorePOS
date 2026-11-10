# Cadbury catalog identity correction — 2026-11-10

## Evidence

- Production catalog item master identifies `items.sku=CC-CDM-GEN`, UUID `4dc60601-5883-4ab4-98a7-d5e8b1ca8adb`, as **Cadbury Dairy Milk Chocolate Bar, 13.2 g**, priced at ৳45.
- The same product’s 132g-slug route was represented by PerfBee as a 10g product. The enrichment registry repeated the unsupported 10g identity and attached manufacturer claims whose evidence URL was a 110g product page.
- Corrected enrichment is limited to catalog-supported identity, package size, category, and a short description. Manufacturer-only claims and their invalid provenance were removed. Existing Lucky Store doorstep-inspection wording retains its policy evidence.

## Regression coverage

- `apps/customer_storefront/app/lib/products/productMetadata.test.ts`: exact catalog identity and no stale 10g claim in summary, specifications, or highlights.
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
