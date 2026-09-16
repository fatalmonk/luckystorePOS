# Lucky Store — Product Enrichment Evidence Manifest (2026-09-16)

This document provides machine-enforced evidence-reference integrity and reviewable provenance for all 85 products registered in `apps/customer_storefront/app/lib/products/productEnrichment.ts` (`PRODUCT_ENRICHMENTS`).

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

## 2. Enriched Product Registry & Manifest Index (85 Products)

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
| 23 | `7fd83cfc` | Samyang Buldak Ramen Quattro Cheese 145g | Noodles | 145g | `MFR_PRODUCT_PAGE`, `MFR_COOKING`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 24 | `b79a6606` | Samyang Buldak Ramen 2X Cup 70g | Noodles | 70g | `MFR_PRODUCT_PAGE`, `MFR_COOKING`, `PACK_NUTRITION`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | PACKAGING, MANUFACTURER, CATALOG, POLICY |
| 25 | `5b214258` | Trident Pineapple Twist Sugar Free Gum 14 Pieces | Chocolates & Candies | 14 pieces | `MFR_PRODUCT_PAGE`, `MFR_INGREDIENTS`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 26 | `0c815bf1` | Samyang Buldak Ramen Cheese Cup 70g | Noodles | 70g | `MFR_PRODUCT_PAGE`, `MFR_COOKING`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 27 | `4bbb76d4` | Samyang Buldak Ramen Original Cup 70g | Noodles | 70g | `MFR_PRODUCT_PAGE`, `MFR_COOKING`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 28 | `841b013d` | Samyang Buldak Ramen Rose 140g | Noodles | 140g | `MFR_PRODUCT_PAGE`, `MFR_COOKING`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 29 | `5830390b` | Polar Carnival Butterscotch Cone Ice Cream 120ml | Ice-Cream | 120 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 30 | `e8771528` | Polar Carnival Vanilla Cone Ice Cream 120ml | Ice-Cream | 120 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 31 | `6df59696` | Polar Carnival Vanilla Cone Ice Cream 120ml | Ice-Cream | 120 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 32 | `fc6d963a` | Polar Chocobar Vanilla Ice Cream 72ml | Ice-Cream | 72 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 33 | `2e948079` | Polar Coffee Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 34 | `8f7ce150` | Polar Crunchy Ice Cream Stick 82ml | Ice-Cream | 82 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 35 | `54a7520e` | Polar Doi Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 36 | `604e6bb0` | Polar Ice Lolly Lemon 62ml | Ice-Cream | 62 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 37 | `c1895793` | Polar Kheer Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 38 | `79e0ece1` | Polar Kheer Ice Cream Tub 500ml | Ice-Cream | 500 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 39 | `b77e2fe6` | Polar Malai Ice Cream Stick 40ml | Ice-Cream | 40 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 40 | `f2d567f0` | Polar Mango Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 41 | `bc7de70f` | Polar Red Velvet Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 42 | `2c367e44` | Polar Robusto Salted Caramel Ice Cream 92ml | Ice-Cream | 92 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 43 | `d132ec9d` | Polar Royal Sundae Cup Ice Cream 100ml | Ice-Cream | 100 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 44 | `fe31ca90` | Polar Cool Shell N Core Ice Cream Stick 62ml | Ice-Cream | 62 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 45 | `2233c416` | Polar Shor Malai Ice Cream Stick 55ml | Ice-Cream | 55 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 46 | `fcefa591` | Polar Tornado Strawberry Ice Cream Stick 55ml | Ice-Cream | 55 ml | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 47 | `be49558d` | Polar Zafran Malai Ice Cream Tub 1L | Ice-Cream | 1 Litre | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, CATALOG, POLICY |
| 48 | `64567924` | Vim Dish Washing Liquid 1L | Cleaning Supplies | 1 Litre | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 49 | `88811070` | Vim Dish Washing Liquid 475ml | Cleaning Supplies | 475 ml | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 50 | `cbbc35e5` | Radhuni Biriyani Masala 40g | Spices | 40g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 51 | `218e328e` | Radhuni Kacchi Biriyani Masala 40g | Spices | 40g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 52 | `602a8c45` | Radhuni Roast Masala 35g | Spices | 35g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 53 | `f083e180` | Radhuni Tehari Masala 40g | Spices | 40g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 54 | `c5dc41e8` | Radhuni Gorur Mangsho Masala 100g | Spices | 100g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 55 | `a560ebca` | Radhuni Murgir Masala 100g | Spices | 100g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 56 | `811c65a2` | Radhuni Pure Mustard Oil 1L | Oil & Ghee | 1 Litre | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 57 | `38ee3e1a` | Radhuni Pure Mustard Oil 500ml | Oil & Ghee | 500 ml | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 58 | `1bc11b33` | Close Up Menthol Fresh Gel Toothpaste 145g | Oral Care | 145g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 59 | `e7a5ffa9` | Vim Dish Washing Bar 300g | Cleaning Supplies | 300g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 60 | `46e5d1d5` | Vim Dish Washing Bar 125g | Cleaning Supplies | 125g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 61 | `55a4441c` | Wheel Fabric Solutions Laundry Soap 125g | Cleaning Supplies | 125g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 62 | `b402008b` | Nescafé Classic Instant Coffee Sachet 0.9g | Tea & Coffee | 0.9g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 63 | `a33d73bc` | Nescafé 3 in 1 Instant Coffee Mix 14g | Tea & Coffee | 14g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 64 | `4d85ee2e` | Ispahani Blender's Choice Premium Green Tea 35g | Tea & Coffee | 35g | `MFR_SPEC`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 65 | `31646279` | Nestlé Cerelac Infant Cereal Stage 1 Wheat 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 66 | `2da7133d` | Nestlé Nan Opti Pro 1 Infant Formula 300g | Baby Care | 300g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 67 | `e10173fc` | Nestlé Nan Opti Pro 2 Follow-Up Formula 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 68 | `8d1131ff` | Nestlé Nan Opti Pro 3 Toddler Formula 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 69 | `f15f1337` | Nestlé Nido 1+ Nutritional Toddler Milk Drink 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 70 | `a854ab97` | Nestlé Nido 3+ Growing Up Milk Powder 350g BiB | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 71 | `970ac032` | Nestlé Cerelac Infant Cereal Stage 1 Rice 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 72 | `48da2573` | Nestlé Lactogen 1 Infant Formula 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 73 | `dd95ce58` | Nestlé Lactogen 2 Follow-Up Formula 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 74 | `5678ea38` | Nestlé Lactogen 3 Follow-Up Formula 350g | Baby Care | 350g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 75 | `4dc60601` | Cadbury Dairy Milk Chocolate Bar 10g | Chocolates & Candies | 10g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 76 | `4741d809` | Cadbury Dairy Milk Chocolate Bar 18g | Chocolates & Candies | 18g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 77 | `a4914d84` | Cadbury Dairy Milk Chocolate Bar 40g | Chocolates & Candies | 40g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 78 | `9e70a7e1` | Cadbury Dairy Milk Bubbly Chocolate Bar 46g | Chocolates & Candies | 46g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 79 | `c95cbb89` | Cadbury Dairy Milk Crispello Chocolate Bar 19g | Chocolates & Candies | 19g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 80 | `29211c8b` | Cadbury Fuse Chocolate Bar 21g | Chocolates & Candies | 21g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 81 | `ad0c9915` | Cadbury Dairy Milk Oreo Chocolate Bar 58g | Chocolates & Candies | 58g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 82 | `3953dc9e` | Cadbury Dairy Milk Roast Almond Chocolate Bar 52g | Chocolates & Candies | 52g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 83 | `d7243ca1` | Cadbury Dairy Milk Silk Chocolate Bar 55g | Chocolates & Candies | 55g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 84 | `24eed4b8` | Cadbury Dairy Milk Silk Fruit & Nut Chocolate Bar 55g | Chocolates & Candies | 55g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |
| 85 | `90298cd5` | Cadbury Dairy Milk Hazelnut Chocolate Bar 54g | Chocolates & Candies | 54g | `MFR_PRODUCT_PAGE`, `STORAGE_SPEC`, `CATALOG_RECORD`, `STORE_INSPECTION_POLICY` | MANUFACTURER, LUCKY_STORE_CATALOG, LUCKY_STORE_POLICY |

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
