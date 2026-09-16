---
meta:
  contentType: Reference
---

# Catalog SEO Audit & Adapter Repair (2026-09-16)

## Purpose & Scope
Diagnoses why product pages such as **Nescafe Classic 90g Jar** (`/product/nescafe-classic-90g-jar--ae09a3ef`) displayed generic delivery boilerplate instead of their rich product information, corrects catalog inventory metrics, documents the adapter repair PR, and establishes an evidence-based protocol for product data enrichment.

---

## 1. Production State Diagnostics

Verified directly against the live Supabase production schema and database:

| Metric | Count | Catalog % | Status & Mechanism |
| :--- | :---: | :---: | :--- |
| **Total Active Products** | **580** | 100.0% | Active items in production PostgreSQL (`is_active = true`) |
| **Active with DB Description** | **532** | 91.7% | High-value descriptions (50–350 chars) stored in DB, previously masked on storefront |
| **Active Missing DB Description** | **48** | 8.3% | `items.description` is null/blank; requires reviewable enrichment dataset |
| *Registry Enriched (Phase 4A cohort)* | *85* | *14.7%* | Independent evidence-backed overlay (`productEnrichment.ts`) |

### Breakdown of 48 Items Missing Database Descriptions
- **Ice-Cream (31 items):** Savoy and Polar varieties (`Savoy Ekdom Aam`, `Polar Carnival Vanilla`, `Polar Doi 1L`, `Savoy iKone Vanilla`, etc.).
- **Noodles (9 items):** Instant noodle packs.
- **Uncategorized & Fresh Staples (7 items):** `Eggs (12 pcs)`, `Fresh Milk 1L`, `Cooking Oil 1L`, `Potatoes 1kg`, `Onions 1kg`, `Katari Atob 25KG`.
- **Confectionery (1 item):** `Trident Pineapple Twist Chewing Gum`.

---

## 2. Root Cause: Product Adapter Projection Defect

### Defect Mechanism
1. [SupabaseProductAdapter.ts](file:///Users/mac.alvi/Desktop/Projects/Lucky%20Store/apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.ts) attempted a direct table query in `getByIdPrefix`:
   - Requested `items.category` (nonexistent column; only `items.category_id` exists).
   - Attempted `.ilike('id', ...)` on a UUID column (PostgreSQL error `42883: operator does not exist: uuid ~~* unknown`).
2. The query failed silently and fell back to `search_items_pos` RPC.
3. `search_items_pos` is optimized for POS transactions and strictly returns:
   `id, sku, barcode, short_code, name, brand, mrp, price, cost, group_tag, image_url, category, category_id, qty_on_hand`.
   **`description` is omitted from `search_items_pos`.**
4. Storefront received `description: ""` for all 532 products not hardcoded in the pilot registry.
5. In `ProductClient.tsx`, empty descriptions triggered the local delivery fallback text:
   `"Order ${displayName} for local doorstep delivery in Chattogram..."` across 91.7% of the catalog.

---

## 3. Step 1: Adapter Repair Implementation

### Architectural Fix
- **Single Source of Truth (`getById`):**
  `getById(id)` directly queries `items` by primary key UUID (`eq('id', cleanId)`) and `eq('is_active', true)`. Resolves `category` name via category cache and `stock` from `stock_levels`. Preserves `description`.
- **Clean Prefix Resolution (`getByIdPrefix`):**
  Uses `search_items_pos` to map the 8-character hex slug prefix to the full UUID within the active catalog (`storeId` and `is_active = true`), then delegates to `this.getById(createProductId(fullId))` for the complete product projection.
- **Zero Database Writes:**
  Does not execute database migrations, range hacks, or SQL text casts on UUIDs.
- **Regression Testing:**
  Created [SupabaseProductAdapter.test.ts](file:///Users/mac.alvi/Desktop/Projects/Lucky%20Store/apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.test.ts) covering:
  - Full projection retrieval with DB description.
  - Null/empty DB description handling.
  - Inactive product exclusion.
  - Malformed (<4 chars) and nonexistent prefix rejection.
  - 6/6 adapter tests passing, 268/268 vitest suite passing, 0 tsc errors.

---

## 4. Evidence-First Protocol for Product Enrichment

Before expanding `productEnrichment.ts` or modifying structured data, the following guidelines govern catalog content:

### Evidence Gate
1. **Packaging / Manufacturer Authority Only:**
   Facts must be confirmed directly against physical SKU packaging or official manufacturer declarations (e.g. Nestlé Bangladesh).
2. **Prohibited Speculative Claims:**
   Do not introduce unverified bean species ("Robusta"), roast intensity ("Medium-Dark"), brew temperatures ("80–85°C"), cup yields, or origin claims without packaging evidence.
3. **Concise Length Standard:**
   Reject arbitrary word-count targets (e.g. ">350 words"). Aim for 120–250 genuinely useful, SKU-specific words plus structured attributes.
4. **Structured Data Hierarchy:**
   - Focus on Google Merchant / Product schema: `name`, `brand`, `sku`, `image`, `description`, `offers` (`price`, `priceCurrency`, `availability`, `shippingDetails`, `hasMerchantReturnPolicy`).
   - GTIN Validation:
     - 13 digits → `gtin13`
     - 12 digits → `gtin12`
     - 8 digits  → `gtin8`
     - Internal SKU → `sku` (never stuffed into `gtin` or `mpn`).
   - FAQPage schema is treated as optional content enrichment, not a primary search ranking driver.

---

## 5. Execution Roadmap

| Phase | Action | Status |
| :--- | :--- | :---: |
| **Step 1: Adapter Repair** | Fix `SupabaseProductAdapter.ts` + add regression tests | **COMPLETE** |
| **Step 2: Catalog Validation** | Validate representative products live, verify sitemap invariance | **COMPLETE** |
| **Step 3: Nescafé 90g Evidence Pack** | Assemble packaging facts from physical SKU / Nestlé Bangladesh | **Manufacturer Source Verified** |
| **Step 4: Coffee Enrichment Cohort** | Scale verified attributes to 45g, 180g, 200g lines without copying unsupported claims | **Source Verified; Registry Review Complete** |
| **Step 5: Structured Data Repair** | Add verified GTIN-13/12/8 validation to `ProductJsonLd.tsx` | **Complete** |
| **Step 6: 48 Missing Descriptions** | Build reviewable dataset for 48 blank items before any DB update | **Intake Registered; Pending Evidence** |
| **Step 7: Search Console Measurement** | Track impressions, indexation, and position post-crawl | Ongoing |

### Next execution gate

The evidence intake register now enumerates all 48 active items with blank
`items.description` values, including their production UUID, SKU, current name,
and category. No catalog copy or database backfill should be authored until each
candidate has either a packaging capture or an official manufacturer declaration
that identifies the exact SKU, pack size, and supported claims. Source URL/capture
date and field-level claim status remain required before promotion; unresolved
fields stay `PENDING_EVIDENCE`. This keeps registry expansion separate from
unsupported inference.

### Manufacturer source intake (2026-09-16)

- **[Nestlé Bangladesh — NESCAFÉ Classic](https://www.nestle.com.bd/nescafe-classic):** The official product page identifies
  medium-dark roasted 100% natural Robusta coffee and lists the Bangladesh pack
  sizes and barcodes for 1g, 24g, 45g, 90g, 180g, and 200g. These claims are
  recorded as manufacturer-source support for the existing 90g/45g/180g/200g
  registry cohort; the 1g and 24g products still require exact catalog matching
  before registry promotion.
- **[Polar Bangladesh](https://polarbd.com/en/):** The official English catalogue exposes 58 unique product detail
  links, including the two Carnival cone pages supplied for this audit. These
  pages provide exact names, pack/carton details, nutrition, ingredients,
  allergens, and package imagery. The complete link index is recorded in
  `polar-product-source-index-2026-09-16.md`; barcode transcription and exact
  Lucky Store SKU matching remain required before a row is marked
  `READY_FOR_REVIEW`.
- **[Savoy Bangladesh product catalogue](https://www.savoybd.com/products):** The rendered catalogue confirms
  the names **Ekdom Aam**, **iKone Vanilla**, **Ice Lolly Orange**, and **Red Velvet
  Temptation** under Savoy categories. It does not expose Lucky Store SKU or
  pack-size mappings, so these rows receive name/category source support only and
  remain `PENDING_EVIDENCE` for enrichment.
- **[Trident Pineapple Twist product page](https://www.tridentgum.com/products/trident-pineapple-twist-14-pieces):** The exact 14-piece product page supports the Trident brand, pineapple flavour, sugar-free formulation, xylitol, individually wrapped sticks, and ingredient/allergen declarations. The `CC-TRI-14` row is now `READY_FOR_REVIEW` and represented in the enrichment registry; no database backfill has been applied.
- **[Buldak Quattro Cheese](https://buldak.com/us/product/buldak-ramen-quattro-cheese/) and [Buldak 2X Cup](https://buldak.com/us/product/buldak-ramen-2x-cup/):** Official Samyang pages support the 145g Quattro Cheese pouch and 70g 2X Cup, including product format, spicy-level information, and preparation instructions. The supplied 2X Cup Nutrition Facts panel supports the 70g serving, 300 calories, and 640mg sodium. `NOO-BUL-QTC` and `NOO-BUL-2XS` are now `READY_FOR_REVIEW` and represented in the registry.
- **[Buldak Cheese Cup](https://buldak.com/us/product/buldak-ramen-cheese-cup/), [Buldak Original Cup](https://buldak.com/us/product/buldak-ramen-original-cup/), and [Buldak Rose](https://buldak.com/us/product/buldak-ramen-rose/):** Official Samyang manufacturer pages support the 70g Cheese Cup, 70g Original Cup, and 140g Rose pouch, including spicy and flavor profiles, format, and cooking instructions. `NOO-BUL-CHE-CUP`, `NOO-BUL-ORG-CUP`, and `NOO-BUL-ROS` are now represented in the enrichment registry.
- **[Polar Ice Cream Cohort (19 Products)](https://polarbd.com/en/):** Official Polar manufacturer pages support 19 active products across cones, sticks, cups, and family tubs: Carnival Butterscotch 120ml (`IC-POL-CAR-2`), Carnival Vanilla 120ml (`IC-POL-CAR`, `IC-POL-CAR-3`), Chocobar Vanilla 72ml (`IC-POL-CHO`), Coffee 1L (`IC-POL-COF`), Crunchy 82ml (`IC-POL-CRU`), Doi 1L (`IC-POL-D1L`), Ice Lolly Lemon 62ml (`IC-POL-ICE`), Kheer 1L (`IC-POL-K1L-2`), Kheer 500ml (`IC-POL-K1L`), Malai 40ml (`IC-POL-MAL`), Mango 1L (`IC-POL-MAN-2`), Red Velvet 1L (`IC-POL-RV1`), Robusto Salted Caramel 92ml (`IC-POL-ROB`), Royal Sundae 100ml (`IC-POL-ROY`), Cool Shell N Core 62ml (`IC-POL-SNC`), Shor Malai 55ml (`IC-POL-SHO`), Tornado Strawberry 55ml (`IC-POL-TOR`), and Zafran Malai 1L (`IC-POL-ZM1`). All 19 are now verified and live in the enrichment registry (`productEnrichment.ts`) with zero database mutations applied.
