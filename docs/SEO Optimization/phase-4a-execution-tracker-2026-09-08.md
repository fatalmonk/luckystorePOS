---
meta:
  contentType: Reference
---

# Phase 4A — Product Page SEO & Content Enrichment Tracker

## Purpose

Executes Phase 4A of the SEO Optimization Master Plan: "Product Page SEO and Content Enrichment".
Transforms thin, generic product pages into authoritative, factual, and locally relevant search results for exact product queries in Chattogram.
Resolves baseline technical and content issues:
1. Eliminates generic, unsupported metadata fallbacks (e.g. `"Fast home delivery and cash on delivery"`) in favor of verified store policies.
2. Fixes Schema.org `ProductJsonLd` brand fallback that previously misattributed third-party products to `'Lucky Store'`.
3. Establishes a typed, evidence-backed Product Enrichment Registry (`productEnrichment.ts`) for high-demonstration GSC pilot queries.
4. Enhances product detail page UX (`ProductClient.tsx`) with an answer-first overview, verified specifications table, key features, kitchen guidance, and factual product Q&As.
5. Surfaces single-source delivery policies and 100% doorstep inspection reassurance directly on the product detail page, linking to the canonical delivery hub (`/delivery`).
6. Enforces Schema.org Offer parity with verified `shippingDetails` (1 km GeoCircle, ৳500+ free / ৳40 below) and `hasMerchantReturnPolicy` (doorstep inspection).

---

## Baseline Diagnostics & Demonstrated GSC Demand

Data verified from live Search Console query+page export (24 June – 5 September 2026):

| Demonstrated Query | Target Product / URL | Baseline Clicks | Baseline Impressions | Baseline Position | Phase 4A Action |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `fortune mustard oil 5 litre price in bangladesh` | `/product/fortune-mustard-oil-5l--b8a7c6c6` | 0 | 20 | 6.50 | Enriched 5L pack facts, cold-pressed Kachi Ghani extraction, tamper-proof seal, doorstep inspection, free delivery qualification |
| `radhuni holud gura price 100gm` | `/product/radhuni-holud-gura-100gm--029b62d8` | 0 | 65 | 8.54 | Enriched 100g turmeric powder specs, pure dried turmeric root sourcing, barrier pouch, weekly factory batch rotation |
| `radhuni dhonia gura price 500gm` | `/product/radhuni-dhoniya-gura-500gm--1f4650a7` | 0 | 23 | 9.30 | Enriched 500g coriander powder specs, culinary spice blending, packaging inspection guarantee |
| `bellame chocolate digestive` | `/product/bellame-chocolate-digestive-135g--4d20b020` | 1 | 31 | 9.77 | Brand parser recognition (`Bellame`), 135g net weight, chocolate digestive pairing, melt-free delivery assurance |
| `ama classic coffee` | `/product/ama-classic-coffee-1gm--3448ed8a` | 0 | 26 | 8.38 | Brand parser recognition (`Ama`), 1g single-serve sachet, 100% soluble coffee, no-minimum basket delivery (flat ৳40) |
| `polar double sundae ice cream` | `/product/polar-double-sundae-1-liter--70a322a1` | 1 | 25 | 6.04 | Brand parser recognition (`Polar`), 1L tub, vanilla/chocolate swirl specs, freezer-to-door thermal bag fulfillment |
| `aril lollipop` | `/product/aril-assorted-lollipop--ac68b2c3` | 1 | 114 | 4.50 | Brand parser recognition (`Aril`), assorted fruit candy, individually wrapped hygiene |

---

## Metadata Specification & Anti-Slop Contract

### Search Title (`formatProductMetaTitle`)
- **Max length**: Strictly <= 60 characters.
- **Pattern**: `${name} – ${price} | Lucky Store` (truncating gracefully with `… – ${price}` if exceeding 60 characters).
- **Target intent**: Specific product name + current live BDT price + store brand.

### Meta Description (`formatProductMetaDescription`)
- **Length**: Strictly 120–160 characters.
- **Pattern**: `Order ${name} online at Lucky Store in Chattogram (${price}). Free delivery on ৳500+ within 1 km, Cash on Delivery & doorstep inspection.`
- **Policy adherence**:
  - Rejects generic fluff: no `"Fast home delivery"`, no unproven superlatives (`"best"`, `"cheapest"`).
  - Explicitly states verified operating bounds: Chattogram, 1 km GeoCircle, ৳500+ free threshold, Cash on Delivery, doorstep inspection.

---

## Structured Data Parity & Brand Protection

### `ProductJsonLd` Contract
1. **Brand Omission vs. Fallback**:
   - When manufacturer brand is known (e.g. `Fortune`, `Radhuni`, `Polar`, `Ama`, `Bellame`): emits `@type: 'Brand'` with the verified name.
   - When brand is unknown / unbranded: property is **omitted**. Never defaults to `'Lucky Store'` for third-party products.
2. **Offer Parity**:
   - `price`: live BDT numeric value.
   - `priceCurrency`: `'BDT'`.
   - `itemCondition`: `'https://schema.org/NewCondition'`.
   - `availability`: `'https://schema.org/InStock'` or `'https://schema.org/OutOfStock'`.
   - `url`: absolute canonical URL (`https://luckystore1947.com/product/${slug}`).
3. **Shipping Details (`shippingDetails`)**:
   - Sourced from central `getDeliveryOfferShippingDetailsSchema()` in `deliveryData.ts`.
   - Destination: Chattogram DefinedRegion (4203).
   - Standard fee: ৳40 BDT.
   - Free shipping threshold: ৳500 BDT via `DeliveryModeOwnFleet`.
4. **Merchant Return Policy (`hasMerchantReturnPolicy`)**:
   - Models the store's 100% doorstep inspection guarantee:
     - `applicableCountry`: `'BD'`.
     - `returnFees`: `'https://schema.org/FreeReturn'`.
     - `refundType`: `'https://schema.org/FullRefund'`.
     - `description`: 100% doorstep inspection before payment with immediate zero-penalty return.

---

## Product Detail Page Information Architecture

The visible product page (`ProductClient.tsx`) renders the following structured sections:
1. **Hero / Buying Panel**: Breadcrumbs, product imagery with category-aware fallback, exact H1, pack size and brand, live price with strikethrough original price if on sale, stock badge, quantity counter, Add-to-Cart CTA, and updated `TrustStrip` linking to `/delivery`.
2. **Answer-First Overview**: Concise factual summary answering what the item is, pack size, intended culinary or snack use, and local purchase context.
3. **Verified Specifications**: Scannable tabular grid (Brand, Net Quantity, Packaging Type, Origin, Storage, Dietary suitability).
4. **Key Features & Guidance**: Packaging-verified bullet highlights plus practical usage/preparation and storage instructions.
5. **Direct Store Fulfillment Callout**: Local delivery card explaining 1 km Chawkbazar delivery radius, 09:00 AM–12:30 AM hours, free delivery on ৳500+, COD + bKash, and 100% doorstep inspection with link to `/delivery`.
6. **Factual Product FAQs**: Expandable questions and policy answers covering seal inspection, delivery qualification, and freshness.
7. **Discovery & Cross-Sell**: `ProductCarousel` showing related products from the same category.

---

## Automated Acceptance Testing

All contracts are verified by automated tests in `apps/customer_storefront/app/lib/__tests__/product-enrichment-contract.test.tsx`:
- [x] Brand parser extracts `Fortune`, `Radhuni`, `Bellame`, `Ama`, `Aril`, `Polar` from diverse product names.
- [x] Title formatter strictly caps at <= 60 characters for short, normal, and very long product names.
- [x] Description formatter produces 120–160 characters adhering to Chattogram, 1 km, ৳500+, and doorstep inspection.
- [x] Rejection of generic `"Fast home delivery"` copy.
- [x] Schema.org `brand` is omitted when unbranded; never defaults to `'Lucky Store'`.
- [x] Schema.org `brand` correctly attributes manufacturer brand when present.
- [x] Schema.org `shippingDetails` matches the 1 km / ৳500+ free delivery policy.
- [x] Schema.org `hasMerchantReturnPolicy` matches doorstep inspection.
- [x] Enrichment registry resolves data by 8-char prefix and full slug.
- [x] Pilot items contain complete contracts (summary, specifications, FAQs).
- [x] `TrustStrip` renders active links to `/delivery`.
- [x] 243/243 total storefront vitest tests passing (15/15 in product-enrichment-contract).
- [x] `tsc --noEmit` clean with 0 errors.

---

## Rollout Status

- **Phase 4A Pilot Code**: Complete and tested.
- **Enriched Catalog Cohort**: 22 evidence-backed product records live in the registry.
- **Rollout Gate**: Expand enrichment across catalog categories following GSC query+page evidence.

## Post-merge continuation gate

The next cohort is the 48 active catalog items with blank database descriptions.
Their exact production UUIDs, SKUs, names, and categories are now registered in
`catalog-enrichment-evidence-intake-2026-09-16.md`. Expansion is gated on
exact-SKU packaging or manufacturer evidence; unresolved fields remain
`PENDING_EVIDENCE` and are not copied from neighboring products. Source URL or
capture reference, capture date, and field-level claim status are required before
any database backfill is considered.
