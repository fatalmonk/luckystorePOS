---
meta:
  contentType: Reference
---

# Phase 3 — Homepage & Demonstrated Product-Demand Optimization Tracker

## Purpose

Executes Phase 3 of the SEO Optimization Master Plan: "Homepage & Demonstrated Product-Demand Optimization (Money Pages & CTR Repair)".
Improves search snippet metadata (titles & descriptions) on high-impression money URLs, eliminates keyword cannibalization between Homepage and core category landing pages, strengthens verified on-page localized copy, and enforces strict SEO metadata test contracts.

---

## Baseline Diagnostics (GSC 24 June – 5 September 2026)

| Target URL | Baseline Clicks | Baseline Impressions | Baseline CTR | Primary Query Intent | Strategy / Solution |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `/` (Homepage) | 48 | 2,088 | 2.3% | `online grocery chattogram`, `grocery delivery chittagong` | Lead with core brand value: Daily Bazaar in Chattogram, free delivery ৳500+, COD, Est. 1947 |
| `/category/rice-and-grain` | High demand | High demand | Sub-optimal | `miniket chal price in bd`, `chinigura chal 1kg price` | Intent-matched title/meta: Miniket, Nazirshail, Chinigura varieties & bazaar rates |
| `/category/oil-and-ghee` | High demand | High demand | Sub-optimal | `mustard oil price in bangladesh`, `soybean tel price in bd` | Intent-matched title/meta: Teer, Rupchanda 1L & 5L soybean & pure mustard oil |
| `/category/cooking-essentials` | High demand | High demand | Sub-optimal | `daily bazaar online chittagong`, `masoor dal price in bangladesh` | Intent-matched title/meta: Daily bazaar staples, lentils, flour, spices, salt & sugar |
| `/category/tea-and-coffee` | High demand | High demand | Sub-optimal | `ispahani mirzapore tea 500g price`, tea blends | Intent-matched title/meta: Ispahani Mirzapore, Taaza tea, coffee blends |

---

## Snippet Optimization Matrix

### 1. Homepage (`/`)

- **Title**: `Lucky Store | Online Grocery & Daily Bazaar in Chattogram` (56 chars)
- **Meta Description**: `Order daily bazaar & groceries in Chattogram. Fresh Miniket rice, pure mustard oil, dairy & spices with free delivery on ৳500+ and 100% Cash on Delivery.` (154 chars)
- **Canonical**: `https://luckystore1947.com/`

### 2. Rice and Grain (`/category/rice-and-grain`)

- **Title**: `Miniket & Chinigura Rice Price in Chittagong | Lucky Store` (58 chars)
- **Meta Description**: `Buy fresh Miniket, Nazirshail, and Chinigura rice in Chittagong at fair bazaar rates. Guaranteed weight, doorstep quality check, and dependable Cash on Delivery.` (156 chars)
- **Canonical**: `https://luckystore1947.com/category/rice-and-grain`

### 3. Oil and Ghee (`/category/oil-and-ghee`)

- **Title**: `Soybean & Pure Mustard Oil Price in Chittagong | Lucky Store` (57 chars)
- **Meta Description**: `Check today's 1L & 5L Teer, Rupchanda soybean and pure mustard oil prices in Chittagong. Authentic sealed bottles, fast local dispatch, and Cash on Delivery.` (155 chars)
- **Canonical**: `https://luckystore1947.com/category/oil-and-ghee`

### 4. Cooking Essentials (`/category/cooking-essentials`)

- **Title**: `Daily Bazaar & Pantry Staples in Chittagong | Lucky Store` (55 chars)
- **Meta Description**: `Shop everyday bazaar essentials: lentils, flour, spices, salt & sugar at local market prices in Chittagong. Free home delivery on orders ৳500+. Order online.` (155 chars)
- **Canonical**: `https://luckystore1947.com/category/cooking-essentials`

### 5. Tea and Coffee (`/category/tea-and-coffee`)

- **Title**: `Ispahani Tea & Coffee Blends in Chittagong | Lucky Store` (58 chars)
- **Meta Description**: `Order fresh Ispahani Mirzapore, Taaza tea, and coffee in Chittagong. Handpicked blends from local gardens with fast delivery to Chawkbazar & Panchlaish.` (152 chars)
- **Canonical**: `https://luckystore1947.com/category/tea-and-coffee`

---

## Cannibalization Resolution

1. **Homepage Rice/Oil De-stuffing**:
   - Strip generic rice keyword stuffing from Homepage section headers.
   - Anchor rice product intents directly to `/category/rice-and-grain` with descriptive anchor `Miniket & Chinigura Rice`.
   - Anchor edible oil product intents directly to `/category/oil-and-ghee` with descriptive anchor `Edible Oils & Pure Mustard Oil`.

2. **Dedicated Category Banners**:
   - In `CategoryShell.tsx`, add distinct hero titles and subtitles for `rice-and-grain` and `oil-and-ghee` rather than generic category fallback names.

---

## On-Page Verified Local Trust Copy

- **Delivery Area & Threshold**: Within 1 km of Chawkbazar store; free delivery on orders ৳500+ (৳40 for orders under ৳500).
- **Payment**: 100% Cash on Delivery with doorstep product inspection; bKash (`01731944544`) supported.
- **Operating Hours**: 09:00–00:30 daily.
- **Heritage**: Established 1947 (75+ years of trusted service).

---

## Verification & Rollback

- **Acceptance Tests**:
  - `npm --prefix apps/customer_storefront run test`
  - `npm --prefix apps/customer_storefront run typecheck`
  - `npm --prefix apps/customer_storefront run build`
  - Built-server smoke curl assertions verifying HTTP 200, title, description, and canonicals on all 5 money URLs.
- **Rollback Method**: `git revert` or checkout prior commit `3c7481a5`.
