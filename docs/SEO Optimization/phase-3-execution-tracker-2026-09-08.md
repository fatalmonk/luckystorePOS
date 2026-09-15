---
meta:
  contentType: Reference
  status: Implemented — Deployment Pending
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
- **Meta Description**: `Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.` (147 chars)
- **Canonical**: `https://luckystore1947.com/`

### 2. Rice and Grain (`/category/rice-and-grain`)

- **Title**: `Miniket & Chinigura Rice Price in Chittagong | Lucky Store` (58 chars)
- **Meta Description**: `Shop Miniket, Nazirshail and Chinigura rice in Chittagong at displayed bazaar prices. Order online with Cash on Delivery and doorstep product inspection.` (147 chars)
- **Canonical**: `https://luckystore1947.com/category/rice-and-grain`

### 3. Oil and Ghee (`/category/oil-and-ghee`)

- **Title**: `Soybean & Mustard Oil Price in Chittagong | Lucky Store` (52 chars)
- **Meta Description**: `Check current 1L & 5L soybean and mustard oil prices in Chittagong. Order online for local delivery with Cash on Delivery.` (123 chars)
- **Canonical**: `https://luckystore1947.com/category/oil-and-ghee`

### 4. Cooking Essentials (`/category/cooking-essentials`)

- **Title**: `Daily Bazaar & Pantry Staples in Chittagong | Lucky Store` (55 chars)
- **Meta Description**: `Shop everyday bazaar essentials: lentils, flour, spices, salt & sugar at displayed prices in Chittagong. Free home delivery on orders ৳500+. Order online.` (154 chars)
- **Canonical**: `https://luckystore1947.com/category/cooking-essentials`

### 5. Tea and Coffee (`/category/tea-and-coffee`)

- **Title**: `Ispahani Tea & Coffee Blends in Chittagong | Lucky Store` (58 chars)
- **Meta Description**: `Shop Ispahani Mirzapore, Taaza tea and coffee online from Lucky Store in Chittagong. Cash on Delivery and local delivery available.` (132 chars)
- **Canonical**: `https://luckystore1947.com/category/tea-and-coffee`

---

## Cannibalization Resolution & Query Ownership Separation

1. **Clear Query Ownership Boundaries**:
   - **Homepage (`/`)**: Owns broad local-commercial entity queries (`online grocery chattogram`, `daily bazaar chattogram`, `grocery delivery chittagong`, `Lucky Store`). Strictly free of specific food product terms (Miniket, mustard oil, soybean) in meta description and keywords.
   - **Category Landing Pages**: Authoritatively own specific commodity and product search intents (`/category/rice-and-grain` for Miniket/Nazirshail/Chinigura rice; `/category/oil-and-ghee` for mustard/soybean oil; `/category/tea-and-coffee` for tea/coffee).
   - Anchor rice product intents directly to `/category/rice-and-grain` with descriptive anchor `Miniket & Chinigura Rice`.
   - Anchor edible oil product intents directly to `/category/oil-and-ghee` with descriptive anchor `Edible Oils & Pure Mustard Oil`.

2. **Tea Canonical Slug Consolidation**:
   - Single authoritative canonical slug: `/category/tea-and-coffee`.
   - Legacy aliases `/category/tea-coffee` and `/category/tea-&-coffee` permanently redirect via HTTP 308 to `/category/tea-and-coffee`.
   - Removed duplicate alias entries from `MONEY_PAGE_METADATA` and `BANNER_MAP`.

3. **Policy-Safe Commercial Copy**:
   - Purged all promotional fluff (`Guaranteed weight`, `authentic sealed bottles`, `fast local dispatch`, `handpicked blends`, `garden-fresh`, `finest`).
   - Fallback metadata updated to factual browsing copy without delivery speed promises.

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
