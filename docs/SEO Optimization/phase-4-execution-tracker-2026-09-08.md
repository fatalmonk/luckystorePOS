---
meta:
  contentType: Reference
---

# Phase 4 — Authoritative Chattogram Delivery Hub Tracker

## Purpose

Executes Phase 4 of the SEO Optimization Master Plan: "One authoritative Chattogram delivery hub (`/delivery` covering boundaries, fees, timings, payment, FAQs)".
Consolidates all local delivery policies, operating boundaries, pricing tiers, hours, payment methods, and doorstep inspection guarantees into a single canonical URL (`https://luckystore1947.com/delivery`).
Eliminates URL fragmentation and cannibalization by permanently redirecting legacy sprint aliases (`/delivery/chattogram`, `/delivery/`) via HTTP 308, publishing comprehensive structured data (JSON-LD `FAQPage`, `BreadcrumbList`, `DeliveryChargeSpecification`), and qualifying `/delivery` for search engine sitemaps and AI markdown agents prior to Phase 4B Bengali localization.

---

## Baseline Diagnostics & Target Intent

| Metric / Dimension | Baseline State | Phase 4 Target / Resolution |
| :--- | :--- | :--- |
| **Delivery URL** | None (404 on `/delivery`, `/delivery/chattogram`) | Canonical `/delivery` (HTTP 200, clean self-canonical) |
| **Legacy Alias** | `/delivery/chattogram` proposed in legacy sprint plan | HTTP 308 Permanent Redirect to `/delivery` in middleware |
| **Target Queries** | `grocery delivery chittagong`, `online grocery chattogram`, `staples delivery chattogram`, `chawkbazar grocery delivery` | Direct intent matching with local authority and clear pricing |
| **Operating Boundary** | Fragmented across components | Centralized: 1 km radius from Chawkbazar store (GPS 22.3550° N, 91.8363° E, GeoCircle) |
| **Fee Structure** | Hardcoded in cart | Transparently published: ৳500+ FREE, < ৳500 flat ৳40 fee, no minimum basket |
| **Hours & Fulfillment**| Unclear to search engines | Verified delivery hours: 09:00 AM–12:30 AM daily, direct in-store fulfillment |
| **Payment & Safety** | Not fully crawled | 100% Cash on Delivery, bKash (`01731944544`), 100% doorstep product inspection |
| **Structured Data** | None on delivery | JSON-LD `FAQPage`, `BreadcrumbList`, `OfferShippingDetails`, `DeliveryService` |
| **Sitemap Status** | Excluded | Included in `sitemap.ts` `staticRoutes` (priority: 0.8, changefreq: 'weekly') |
| **AI Content Negotiation**| 404 text/markdown | Formatted markdown in `/api/markdown?path=/delivery` consuming central constants |

---

## Metadata Specification

- **URL:** `https://luckystore1947.com/delivery`
- **Title (59 chars):** `Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store`
- **Meta Description (154 chars):** `Local grocery delivery within 1 km of Chawkbazar, Chattogram. Free delivery on orders ৳500+ with Cash on Delivery and doorstep inspection. View timings & areas.`
- **Robots:** `index, follow`
- **Canonical:** `https://luckystore1947.com/delivery`
- **OpenGraph:**
  - `og:title`: `Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store`
  - `og:description`: `Local grocery delivery within 1 km of Chawkbazar, Chattogram. Free delivery on orders ৳500+ with Cash on Delivery and doorstep inspection. View timings & areas.`
  - `og:url`: `https://luckystore1947.com/delivery`
  - `og:locale`: `en_BD`
  - `og:type`: `website`
- **Twitter:** `summary_large_image`

---

## Verified Operating Policies & Coverage Matrix

### 1. Delivery Boundaries (Authoritative 1 km GeoCircle)
- **Central Store HQ:** Lucky Store, 665 Percival Hill Road, Emdad Park, Chawkbazar, Chattogram 4203.
- **GPS Midpoint:** 22.35500093723366, 91.83628930715629 (1000m GeoCircle).
- **Coverage Policy:** Strict 1 km GeoCircle radius. Only the sections and lanes of the following neighborhoods that fall within this 1 km radius are served; portions outside 1 km are excluded:
  - Chawkbazar (nearby parts within 1 km)
  - Parade Ground (nearby parts within 1 km)
  - Chittagong College Area (nearby parts within 1 km)
  - Government Mohsin College Area (nearby parts within 1 km)
  - Siraj-ud-Daula Road (accessible sections within 1 km)
  - Chandanpura (nearby parts within 1 km)
  - Gani Bakery Circle (nearby parts within 1 km)
  - DC Hill Periphery (nearby parts within 1 km)
  - Subash Bose Road & Emdad Park (immediate storefront vicinity)

### 2. Delivery Fees & Minimum Order Thresholds
- **Standard Orders (৳500+):** **FREE Delivery (৳0)** across the entire 1 km zone.
- **Small Baskets (< ৳500):** **৳40 flat delivery fee**.
- **Minimum Order Requirement:** None. Customers can order single items or daily necessities without restriction.

### 3. Delivery Hours & Dispatch Window
- **Service Days:** 7 days a week (Monday through Sunday).
- **Delivery Hours:** 09:00 AM–12:30 AM daily (explicitly labeled as active delivery hours).
- **Fulfillment Model:** Direct in-store staff fulfillment (no third-party courier delays or damaged packaging).

### 4. Payment Methods & Doorstep Inspection Guarantee
- **Cash on Delivery (COD):** 100% supported.
- **bKash Mobile Payment:** Accepted upon delivery to store number `01731944544`.
- **Doorstep Inspection:** Complete right of inspection before payment. Customers may inspect oil seals, rice weights, package condition, and expiry dates. Unsatisfactory items may be returned immediately with the delivery partner at zero fee penalty.

---

## Structured Data Implementation

The page emits validated Schema.org JSON-LD schemas:

1. **`FAQPage` Schema**:
   - Covers 6 comprehensive questions and policy answers regarding coverage, fees, hours, payments, inspection, and damaged items.
2. **`BreadcrumbList` Schema**:
   - Item 1: `Home` (`https://luckystore1947.com`)
   - Item 2: `Delivery Information` (`https://luckystore1947.com/delivery`)
3. **`OfferShippingDetails` & `ShippingRateSettings` Schema**:
   - In accordance with Schema.org vocabulary, `freeShippingThreshold` is modeled inside `ShippingRateSettings` rather than directly on `OfferShippingDetails`:
     - `@type: OfferShippingDetails`
     - `shippingDestination`: DefinedRegion (Chattogram, BD, 4203)
     - `shippingRate`: `@type: ShippingRateSettings`
       - `shippingLabel`: `Lucky Store Standard Local Delivery`
       - `shippingRate`: MonetaryAmount ৳40 BDT
       - `freeShippingThreshold`: DeliveryChargeSpecification ৳500 BDT (`appliesToDeliveryMethod: https://schema.org/DeliveryModeOwnFleet`)
   - Standalone `getDeliveryShippingRateSettingsSchema()` also exported for central policy reuse.
4. **`DeliveryService` Schema**:
   - `@type: DeliveryService` representing the store's in-house fulfillment:
     - `provider`: `@id: https://luckystore1947.com/#grocerystore`
     - `areaServed`: GeoCircle (radius 1000m, midpoint 22.3550° N, 91.8363° E)
     - `hoursAvailable`: OpeningHoursSpecification (09:00 to 00:30 daily)

---

## Technical Routing & Internal Linking

1. **Middleware 308 Redirect Consolidation**:
   - Requests to `/delivery/chattogram` and `/delivery/` are permanently 308-redirected to `/delivery`, preserving all incoming query parameters.
2. **Sitemap Integration**:
   - Added to `apps/customer_storefront/app/sitemap.ts` under `staticRoutes` with priority `0.8` and `weekly` change frequency.
3. **Markdown for AI Agents**:
   - Added `mdDeliveryPage()` handler in `apps/customer_storefront/app/api/markdown/route.ts` responding with structured markdown for LLMs.
   - Added `/delivery` to `SITE_MAP` index.
4. **Natural Internal Linking**:
   - **Footer Navigation:** Added `DELIVERY INFO` (`/delivery`) to `helpLinks` in `Footer.tsx`.
   - **Mobile Drawer:** Added `Delivery Areas & Info` (`/delivery`) in `AppDrawer.tsx`.
   - **Home Shell:** Linked `Free Delivery ৳500+ / Within 1 km of Chawkbazar` and `Cash on Delivery` trust facts directly to `/delivery`.

---

## Automated Acceptance Testing

A dedicated vitest contract test suite is active in `apps/customer_storefront/app/lib/__tests__/delivery-hub-contract.test.ts`:
- [x] Validates title length (59 chars <= 60 chars) and meta description length (154 chars).
- [x] Validates canonical URL matches `https://luckystore1947.com/delivery`.
- [x] Validates strict policy compliance (1 km radius, ৳500+ free, ৳40 fee, 09:00–00:30, COD/bKash, doorstep inspection).
- [x] Rejects all promotional fluff, false speed promises, or unsupported claims.
- [x] Asserts Schema.org property placement (`freeShippingThreshold` inside `ShippingRateSettings`, rejects invented `appliesToDeliveryChargeMethod`).
- [x] Validates HTTP 308 permanent redirect from `/delivery/chattogram` and `/delivery/`.
- [x] Validates query parameter preservation on redirects.
- [x] Validates markdown content negotiation returns 200 with structured policy text.
- [x] 228/228 total vitest storefront tests passing (17/17 in delivery-hub-contract).
- [x] `tsc --noEmit` clean with 0 errors.
- [x] `next build` clean (prerendered `/delivery` static 6.3 kB).

---

## Production Deployment & Live Verification

- **PR Merge:** PR #362 merged to `main` at `bfbe84da`.
- **Vercel Deployment ID:** `dpl_5KnmPS1jpxjVJHX61gYuS3Vk4rYu`
- **Production URL:** `https://lucky-store-do1p4f6il-mac-alvis-projects.vercel.app`
- **Production Alias:** `https://luckystore1947.com`
- **Live Verification Evidence:**
  - `GET https://luckystore1947.com/delivery` → HTTP 200 OK (`x-nextjs-prerender: 1`, `x-vercel-cache: PRERENDER`)
  - `GET https://luckystore1947.com/delivery/` → HTTP 308 (`location: /delivery`)
  - `GET https://luckystore1947.com/delivery/chattogram` → HTTP 308 (`location: /delivery`)
  - `GET https://luckystore1947.com/api/markdown?path=/delivery` → HTTP 200 OK (`content-type: text/markdown`)

---

## Rollback Method

In the event of unforeseen regressions:
1. Revert commit `bfbe84da` on `main`.
2. Redeploy previous known-good deployment `dpl_2gFzNsKX4KqBNvvW2syerFpNFZfJ` (commit `5b15fb4e`).
