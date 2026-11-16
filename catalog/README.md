# Lucky Store competitor-price pilot — 17 November 2026

**Mode:** offline, read-only catalogue preparation. **No** automatic competitor scraping, production Worker changes, Supabase production writes, price verification or paid AI calls.

## Inputs

- `meta-catalog-2026-11-17.json`: dated Meta Commerce Catalog `1044868008554441` snapshot; 172 fetched items in two pages, 172 distinct `retailer_id` values. The user mentioned 178; **six are not present in this Meta catalog response** and have not been identified or invented.
- The Meta source provides `retailer_id`, name, brand, BDT list price and sometimes sale price, website URL, and stock label. All source `size` fields are null. The source provides neither GTIN/barcode nor verified manufacturer pack size.
- Original source prices are **dated historical Meta catalogue records**, not today's checkout price or independently verified pricing.

## Processing / outputs

- Rebuild with: `npm run pilot:prepare --workspace=@lucky-store/competitor-scraper-worker` (from repo root) or `node --experimental-strip-types cloudflare/workers/competitor-scraper/scripts/prepare-meta-pilot.mjs`
- `meta-normalized-2026-11-17.json`: 172 canonicalized product records. 108 names have one deterministically normalized weight/volume package size without additional pack-count dimensions; 64 require manual pack review. Conversion: kg → g, L/litre → ml; count/pack labels retained separately. Names with no recoverable measurable size are excluded from the automatic comparison cohort.
- `pilot-25-readiness.csv`: 25 packaged Lucky Store SKUs chosen by deterministic input order for a **readiness** pilot; **not** a best-seller ranking. All competitor price cells remain blank; their evidence state is `missing`.
- `pilot-readiness-report.json`: quality counts, 25 synthetic exact-match checks and 25 synthetic wrong-size rejection checks. All use test-only fixture prices, never displayed as competitor observations.
- `source-permissions-2026-11-17.json`: retailer source authorization gates. All competitor automated collection is explicitly unapproved here. This register is **not** wired to and cannot silently reconfigure the existing deployed Worker.

## Scraper forensic findings

The old Cloudflare Worker has no `fetch()` route, **but does have a deployed cron trigger** `0 21 * * SUN` and `scheduled()` enqueues Workflow instances. Cloudflare lists one API-triggered instance, initiated 21 Oct 2026 and terminated during Chaldal extraction; no completed scheduled instances appear in the returned history. Lack of routes is not proof of cron disablement. No runtime change was made.

The original matcher conflates a retailer-specific product identifier with local SKU/barcode identity; version `matcher-v2` fixes this by requiring a separately declared, checksum-valid GTIN, an exact unique local barcode, and package-size agreement. Existing cautious fuzzy matching remains and ambiguous candidates remain unmatched. The scraper's category-first approach, HTML-dependent selectors and per-store full inventory scans still need architectural remediation before production collection is permitted.

## Pilot acceptance gates

1. Reconcile Meta's 172 records against the user's 178-item export (identify six missing IDs and root cause).
2. Manually verify package sizes of the 64 flagged names, and verify manufacturer GTINs when possible.
3. Obtain an authorized, documented feed/API or written permission from each retailer and verify outlet/location, delivery availability, taxes, discounts, and price timestamp.
4. Collect only the 25 explicit pilot SKUs with request and egress caps; stop at a provider's 403/429 or consent blocker; never evade access controls.
5. Review actual source-backed matches and false positives before D1 evidence ingestion. Keep scraped claims separate from accepted prices. No automatic price edits to Lucky Store POS/storefront.
6. Add integration tests using explicitly licensed/owner-provided samples and validate currency, offer/pack sizes, discounts and Chattogram outlet availability.

**No competitor API endpoint has yet been confirmed licensed/approved for unattended price extraction.** Public government commodity-price data can be used as separate context, not as retailer SKU comparisons.
