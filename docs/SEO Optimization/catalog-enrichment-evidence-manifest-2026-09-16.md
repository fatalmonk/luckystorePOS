# Lucky Store — Product Enrichment Evidence Manifest (2026-09-16)

This document provides machine-verifiable and reviewable provenance for all 22 products registered in `apps/customer_storefront/app/lib/products/productEnrichment.ts` (`PRODUCT_ENRICHMENTS`).

---

## 1. Normalized Relational Evidence Architecture

To guarantee strict provenance and eliminate dangling claims, every enriched SKU carries:
1. `evidenceManifest: Record<string, EvidenceRecord>`: A normalized dictionary of verified packaging, manufacturer, catalog, and store policy evidence objects with exact titles, verified dates, and SKU scopes.
2. `specifications[n].evidenceRefs`: Array of registered evidence manifest keys supporting that exact specification row.
3. `faqs[n].evidenceRefs`: Array of registered evidence manifest keys supporting that exact question and answer.
4. `fieldEvidence`: Direct mappings for `exactName`, `brand`, `netQuantity`, `category`, `summary`, `highlights`, `usageDirections`, and `storageInstructions` to their registered evidence keys in `evidenceManifest`.

### Permitted Evidence Sources:
- **`PACKAGING`**: Directly printed on physical packaging or container label.
- **`MANUFACTURER`**: Published technical specification, product sheet, or formal declaration from the authorized manufacturer/marketer.
- **`LUCKY_STORE_CATALOG`**: Store catalog database attributes (`items.id`, `items.sku`, canonical category, database product name).
- **`LUCKY_STORE_POLICY`**: Verified operational store policies (1 km Chawkbazar delivery radius, ৳500+ free delivery threshold, flat ৳40 fee for smaller orders, 100% doorstep inspection before payment).
- **`CALCULATED_FROM_VERIFIED_FACTS`**: Transparent mathematical derivations where both inputs and formula are verified.

---

## 2. Enriched Product Registry & Manifest Index (22 Products)

| # | SKU Prefix | Product Name | Category | Net Qty | Manifest Keys | Evidence Sources |
|---|---|---|---|---|---|---|
| 1 | `b8a7c6c6` | Fortune Kachi Ghani Mustard Oil 5L | Oil & Ghee | 5 Litres | `PACK_FRONT`, `PACK_BACK`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 2 | `029b62d8` | Radhuni Holud Gura (Turmeric Powder) 100g | Spices | 100g | `PACK_FRONT`, `PACK_INGREDIENTS`, `PACK_STORAGE`, `PACK_BACK`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 3 | `1f4650a7` | Radhuni Dhoniya Gura (Coriander Powder) 500g | Spices | 500g | `PACK_FRONT`, `PACK_INGREDIENTS`, `PACK_STORAGE`, `PACK_BACK`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 4 | `4d20b020` | Bellame Chocolate Digestive Biscuits 135g | Biscuits & Cookies | 135g | `PACK_FRONT`, `PACK_BACK`, `PACK_STORAGE`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 5 | `3448ed8a` | Ama Classic Instant Coffee Sachet 1g | Tea & Coffee | 1g | `PACK_FRONT`, `PACK_SERVING`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 6 | `70a322a1` | Polar Double Sundae Ice Cream 1L Tub | Ice-Cream | 1 Litre | `PACK_FRONT`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 7 | `ac68b2c3` | Aril Assorted Fruit Flavoured Lollipops | Chocolates & Candies | 1 Piece | `PACK_WRAPPER`, `PACK_BACK`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 8 | `ae09a3ef` | Nescafé Classic Instant Coffee 90g Jar | Tea & Coffee | 90g | `PACK_FRONT`, `PACK_BACK`, `PACK_PREP`, `PACK_STORAGE`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 9 | `be803387` | Nescafé Classic Instant Coffee 180g Jar | Tea & Coffee | 180g | `PACK_FRONT`, `PACK_BACK`, `PACK_PREP`, `PACK_STORAGE`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 10 | `6dbf8f0e` | Nescafé Classic Instant Coffee 45g Jar | Tea & Coffee | 45g | `PACK_FRONT`, `PACK_BACK`, `PACK_PREP`, `PACK_STORAGE`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 11 | `b8d96d50` | Nescafé Classic Instant Coffee 200g Refill Pouch | Tea & Coffee | 200g | `PACK_FRONT`, `PACK_BACK`, `PACK_PREP`, `PACK_STORAGE`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 12 | `8058c111` | Ispahani Blender's Choice Premium Black Tea 200g | Tea & Coffee | 200g | `PACK_FRONT`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 13 | `4d004a30` | Ispahani Blender's Choice Premium Black Tea 400g | Tea & Coffee | 400g | `PACK_FRONT`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 14 | `1dd3e411` | Ispahani Mirzapore Tea Bags (50 Count) | Tea & Coffee | 50 Tea Bags | `PACK_FRONT`, `PACK_BACK`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 15 | `b3e78fa4` | Rupchanda Fortified Soyabean Oil 5L | Oil & Ghee | 5 Litres | `PACK_FRONT`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 16 | `b39aa5cc` | Rupchanda Fortified Soyabean Oil 1L PET Bottle | Oil & Ghee | 1 Litre | `PACK_FRONT`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 17 | `c0fe29c0` | Radhuni Morich Gura (Chilli Powder) 100g | Spices | 100g | `PACK_FRONT`, `PACK_INGREDIENTS`, `PACK_STORAGE`, `PACK_BACK`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 18 | `045df58d` | Radhuni Jira Gura (Cumin Powder) 100g | Spices | 100g | `PACK_FRONT`, `PACK_INGREDIENTS`, `PACK_STORAGE`, `PACK_BACK`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 19 | `7d931484` | Maggi Swad-e Magic Seasoning Sachet 4g | Spices | 4g | `PACK_FRONT`, `PACK_BACK`, `PACK_PORTION`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, CATALOG, POLICY |
| 20 | `8169739f` | Samyang Buldak Hot Chicken Flavour Ramen 140g | Noodles | 140g | `PACK_FRONT`, `PACK_BACK`, `PACK_COMPONENTS`, `PACK_PREP`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 21 | `f49fa080` | Samyang Buldak 2x Spicy Hot Chicken Flavour Ramen 140g | Noodles | 140g | `PACK_FRONT`, `PACK_BACK`, `PACK_COMPONENTS`, `PACK_PREP`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 22 | `e04a2efd` | Samyang Buldak Cream Carbonara Hot Chicken Flavour Ramen 130g | Noodles | 130g | `PACK_FRONT`, `PACK_BACK`, `PACK_COMPONENTS`, `PACK_PREP`, `PACK_STORAGE`, `MFR_SPEC`, `CATALOG_RECORD`, `STORE_DELIVERY_POLICY`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |

---

## 3. Quarantined & Removed Claims

During the adversarial evidence re-audit, the following unverified statements were systematically removed:
1. **Nescafé 1.5–1.8g Serving Count Derivations:** Removed calculated "~50-60 servings" from all Nescafé SKUs because serving mass range was not declared on physical packaging.
2. **Nescafé Negative & Fluff Claims:** Removed "with no added chicory or fillers", "manufactured under Nestlé quality standards", and "distributed through authorized retail channels".
3. **Polar Cold-Chain SOP Claims:** Removed "Dispatched in temperature-controlled insulated carriers" and "Lucky Store uses insulated cold-storage bags".
4. **Bellame Packaging Handling Claims:** Removed "Lucky Store packs delicate bakery items in protective outer bags during dispatch".
5. **Radhuni Absence Claims:** Removed "without artificial colors" and unverified "roasted and ground" cumin modifier.
6. **Ispahani Promotional Claims:** Removed "authentic tea aroma" and unverified "3–5 minute brewing" times.
7. **Store Multi-Pack Statements:** Removed "Lucky Store offers single-sachet sales alongside multi-pack options" from Ama coffee.
8. **Promotional Audience Adjectives:** Removed "Suitable for regular coffee drinkers and family households", "for personal use or travel", "family-size", "for family consumption", "for convenient single-cup brewing in homes and offices", and "Suitable for all daily frying...".
