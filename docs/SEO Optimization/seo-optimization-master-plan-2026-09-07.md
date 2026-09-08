---
meta:
  contentType: Reference
  source: Notion (https://app.notion.com/p/SEO-Optimization-Master-Plan-3d4fe7a68af8810b953feb7701479083)
  lastEdited: 2026-09-07T17:40:00.000Z
  verifiedBaselineDate: 2026-09-07
---

# SEO Optimization - Master Plan

> 🎯 Master SEO operating plan for Lucky Store 1947. This plan is governed by verified Search Console, GA4, repository, and Google policy evidence. Estimates and assumptions may inform research but cannot authorize implementation.

## Decision Status

**Conditionally approved after correction.** Execute Phases 0–3 first. City and neighborhood expansion, citation campaigns, and structured-data enhancements remain gated by evidence and operational verification.

## Verified Baseline — 7 September 2026

| Metric | Verified value | Source |
| --- | --- | --- |
| GSC clicks | 97 | Live Search Console, 24 Jun–5 Sep 2026 |
| GSC impressions | 6,090 | Live Search Console |
| CTR | 1.6% | Live Search Console |
| Average position | 15.1 | Live Search Console |
| Indexed / not indexed | 1,230 / 391 | Live Search Console |
| Sitemap URLs discovered | 621 | Live Search Console |
| GA4 active users | 3.2k | Live GA4, 9 Jun–6 Sep 2026 |
| GA4 commerce events | 0 recorded | Tracking gap, not proof of zero sales |
| Recognized Product / Merchant items | 7 / 7 | Live Search Console |

## Evidence Rules

Every task and claim must carry one status:

- **Verified live** — reproduced in the named platform with date and period.
- **Repo-confirmed** — verified in current application code.
- **Third-party estimate** — includes provider, locale, database, export date, and attachment.
- **Assumption** — cannot authorize publishing or production changes.
- **Needs verification** — blocked until evidence is attached.

Do not present estimates as GSC data. Do not publish delivery, payment, price, availability, service-area, timing, return, accessibility, review, or competitor claims until the business owner verifies them.

## Execution Order

1. **Phase 0 — Evidence and policy verification** (Completed & Verified)
2. **Phase 1 — GA4 measurement repair** (Completed & Deployed — PR #356 / live)
3. **Phase 2 — Indexing, canonical, sitemap, and 404 hygiene** (Completed & Deployed — PR #359 / live)
4. **Phase 3 — Homepage and demonstrated product-demand optimization** (Completed & Deployed — PR #361 / live)
5. **Phase 4 — One authoritative Chattogram delivery hub** (Completed & Deployed — PR #362 / live)
6. **Phase 4B — Bengali Storefront Track (`/bn` Dual-Surface SEO)** (Active / Immediate Next)
7. **Phase 5 — Truthful GBP completeness and customer usefulness**
8. **Phase 6 — Structured data and citations**
9. **Phase 7 — Neighborhood expansion only if gates pass**

## Program Gates

### Phase 0 exit gate

- [x] Operating policies verified by owner (1km Chawkbazar delivery radius, ৳500 min for free delivery, COD + bKash)
- [x] GSC query+page export attached
- [x] Third-party keyword export attached or estimates removed
- [x] Canonical URL taxonomy selected (clean trailing slashless, 308 permanent redirect consolidation)
- [x] All unsupported competitor claims removed or sourced

### Production change gate

Each implementation task must name:
- Owner
- Evidence status and source
- Dependencies
- Exact URLs
- Acceptance test
- Rollback method
- Baseline metric
- Observation window
- Final result

## Completed Foundation Work (Phases 0–3)

- [x] Rebind NotFair to Lucky Store GA4 property 542881250 (Phase 1)
- [x] Inventory production, preview, admin, and POS analytics hostnames (Phase 1)
- [x] Validate tag sources and duplicate firing (Phase 1)
- [x] Implement and verify the commerce funnel: view_item, add_to_cart, begin_checkout, purchase (Phase 1)
- [x] Classify indexing exclusions and errors; deploy 308 redirect taxonomy (Phase 2)
- [x] Sanitize sitemap.xml to clean canonical URLs only (Phase 2)
- [x] Optimize homepage title/description for local commercial intent without promotional claims (Phase 3)
- [x] Optimize snippet metadata for top money category landing pages (Rice & Grain, Oil & Ghee, Cooking Essentials, Tea & Coffee) (Phase 3)
- [x] Consolidate tea category slug to `/category/tea-and-coffee` with 308 canonical redirects (Phase 3)
- [x] Harden Next.js middleware and category routing against malformed percent-encoded URIs (Phase 3)
- [x] Deploy comprehensive adversarial SEO automated test suite (Phase 3)
- [x] Launch authoritative Chattogram delivery hub at `/delivery` covering boundaries (1 km GeoCircle), transparent fees (৳500+ free, ৳40 below), delivery hours (09:00 AM–12:30 AM daily), payment (COD & bKash), and doorstep inspection (Phase 4)
- [x] Deploy 308 canonical redirect consolidation from `/delivery/chattogram` and `/delivery/` to `/delivery` (Phase 4)
- [x] Integrate `/delivery` into static sitemap and AI markdown content negotiation (Phase 4)
- [x] Deploy delivery hub contract test suite (Phase 4)

## Active & Upcoming Work

- [ ] **Phase 4B (PR 1 & 2):** Bengali Storefront Foundation (`app/lib/i18n`, `/bn` layout, language toggle, `/bn` homepage, `/bn/delivery`, money categories)
- [ ] **Phase 4C (PR 3–5):** Bengali Catalog Data Architecture (`item_translations`), dynamic product routing, Banglish search index, sitemap qualification
- [ ] **Phase 5:** Truthful Google Business Profile completeness and customer usefulness
- [ ] **Phase 6:** Expanded Product Schema coverage beyond recognized 7 items; citation validation

## Deferred

- Five neighborhood pages
- Competitor-alternative pages
- Mass exact-match internal linking
- Directory submissions without live verification
- Review keyword coaching
- EXIF/geotag ranking tactics
- Ranking guarantees and fixed time-to-rank promises

## Source Documents

Repository paths:
- `docs/SEO Optimization/search-console-audit-2026-09-07.md`
- `docs/SEO Optimization/google-analytics-audit-2026-09-07.md`
- `docs/SEO Optimization/` supporting plans

Official guidance:
- [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Business Profile local ranking](https://support.google.com/business/answer/7091)
- [Google review policy](https://support.google.com/business/answer/7400114)
- [Google Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)

---

## Child Workstreams & Detail Pages

### 1. GBP Optimization — Policy-Safe Workstream
*(Page ID: `3d4fe7a68af88124b94de5ad7b38a2c4`)*

> 🏪 Policy-safe GBP plan focused on accurate profile completeness and customer usefulness. No tactic below guarantees ranking.

#### Preconditions
- [ ] Owner verifies current categories, services, hours, service areas, payment methods, pickup, delivery, and accessibility
- [ ] Current GBP screenshots/export attached with date
- [ ] Each competitor observation includes location, query, date, and screenshot
- [ ] No attribute is enabled unless it accurately describes current operations

#### Categories
- Keep the most specific truthful primary category
- Consider Delivery service only if Lucky Store itself provides delivery and GBP offers the category
- Consider Produce market only if it accurately represents the business
- Do not add categories solely because competitors use them

#### Attributes and Services
- Enable Delivery, same-day delivery, pickup, mobile payments, organic products, and accessibility only when factually true
- Publish service descriptions in plain customer language
- Remove unsupported “HIGH ranking impact” labels
- Verify profile changes on mobile and desktop

#### Reviews
- Ask every eligible customer neutrally for an honest review; no incentives, no keyword coaching
- Personalize replies around the reviewer's actual experience; no keyword quotas
- Track request count, completed reviews, rating, and response time

#### GBP Posts & Photos
- Publish only current products, prices, hours, events, and verified offers with UTM tagging
- Authentic storefront, interior, team, products, packing, and real delivery photos (consent required)
- Do not alter GPS metadata/EXIF

---

### 2. On-Page SEO — Homepage, Products, and Delivery Hub
*(Page ID: `3d4fe7a68af8815e965ff75a9d96b257`)*

> 🌐 Optimize verified demand first. Build one authoritative Chattogram delivery hub before considering neighborhood variants.

#### Priorities
- **Homepage (Verified live: 2,088 imp, 48 clicks, 2.3% CTR)**: Improve title/description for local commercial intent; display visible delivery areas, fees, minimums, timing, payments, ordering, and returns.
- **Product pages**: Backed by GSC query+page demand; exact brand, unit, live BDT price, stock, truthful delivery status, matching Product JSON-LD.
- **Category pages**: Parameterized category URLs already emit `noindex,follow` (repo-confirmed). Replace generic metadata only where verified query data supports it.
- **Chattogram Delivery Hub**: One comprehensive resource covering service across Chattogram (coverage, ordering, fees, timings, payment, FAQ).
- **Neighborhood Expansion Gate**: Blocked until distinct GSC/research demand and unique local service information are established. Deferred: `/chaldal-alternative-chattogram`, `/supermarket-delivery-chattogram`, 5 neighborhood pages.

---

### 2B. Phase 4B — Bengali Storefront Track (`/bn` Dual-Surface SEO)
*(Architecture Spec: [`docs/plan/bengaliversion.md`](file:///Users/mac.alvi/Desktop/Projects/Lucky%20Store/docs/plan/bengaliversion.md))*

> 🇧🇩 Capture Bengali-script and Banglish commercial query demand across Chattogram through a native `/bn` subpath architecture without risking existing English rankings.

#### Architecture Mandates
- **Shared Codebase:** Unified storefront component tree parameterized by typed dictionaries (`app/lib/i18n`). Zero parallel cloned pages.
- **Stable Latin Slugs:** Slugs remain English across both trees (`/bn/category/rice-and-grain`). No percent-encoded Bengali URLs.
- **Strict Self-Canonicals:** Every `/bn/*` page canonicalizes to itself. Never point a Bengali canonical to an English URL.
- **Reciprocal Hreflang:** Bidirectional annotations (`en-BD`, `bn-BD`, `x-default`) on every bilingual page.
- **Correct Document Root:** Dynamic `<html lang="bn">` for Bengali routes and `<html lang="en">` for English routes.

#### Phased Rollout Gates
1. **Prerequisite:** Phase 4 (English Delivery Hub `/delivery`) must be completed first to establish canonical delivery policies before translating.
2. **PR 1 (Foundation):** Locale config, typed dictionaries, navigation helper, plain text switcher (`বাংলা | English`), `<html lang>`.
3. **PR 2 (Money Pages & Delivery):** `/bn` homepage, `/bn/delivery`, and 5 high-intent money category landing pages.
4. **PR 3 (Data Architecture):** Supabase `item_translations` relational schema with review status (`draft` | `reviewed` | `published`).
5. **PR 4 (Product Routing & Search):** `/bn/product/[slug]`, Bengali/Banglish tri-lingual search indexing, sitemap qualification.
6. **PR 5 (Checkout & Indexation):** Localized cart/checkout strings, GA4 `locale` tracking dimension, phased GSC indexation rollout.

---

### 3. GSC Evidence Sprint — Corrected Plan
*(Page ID: `3d4fe7a68af881b4b24de544a636702f`)*

> 🔥 The previous “Page 2 Goldmine” figures are not approved as GSC evidence. Rebuild this sprint from a reproducible query+page export.

- **Data Correction**: Remove former 1,750/1,100/910-impression claims; remove +350% to +500% projection; remove top-3 rank guarantees.
- **Sprint Schedule**:
  - Week 1: Evidence and technical validation (inspect canonicals, indexability, schema).
  - Week 2: High-impact changes (homepage local intent, top-impression canonical product pages).
  - Week 3: Natural internal linking (varied descriptive anchors, no forced exact matches).
  - Week 4: Validation (rendered metadata/schema inspection, URL inspection, 28/56-day observation).

---

### 4. Structured Data and Citations — Gated Plan
*(Page ID: `3d4fe7a68af881c7ad41c6a6effbdc1a`)*

> 🔗 Structured data must match visible, verified business and product information. Citation work requires live verification.

- **Current State**: Root layout emits WebSite & GroceryStore; products have canonical descriptive URLs and price metadata; filter URLs emit `noindex,follow`.
- **Priorities**:
  1. Expand valid Product/Merchant coverage beyond the 7 items recognized by Search Console.
  2. Ensure Product markup matches visible name, price, stock, image, URL, seller.
  3. Publish truthful shipping and return-policy pages before adding schema.
  4. BreadcrumbList only where visible navigation supports it.
  5. Coordinate values: establish one verified canonical coordinate set (remove duplicate contradictory coordinates).
- **Corrections**: Remove retired Sitelinks Search Box goal; do not add external GBP reviews to on-site schema; do not invent a Google Maps CID without verification.
- **Citation Gate**: Defer 15-directory list until each directory resolves, is indexed, reputable, and NAP is owner-verified. Focus on Bing Places and Apple Business Connect first.

---

### 5. Phase 1 — Google Analytics Measurement Repair
*(Page ID: `3d4fe7a68af881d3a77ad7651f8f6d3d`)*

> 🚨 Measurement repair is the first implementation phase. Existing GA4 data is not yet dependable for commercial optimization.

- **Baseline**: Correct property is `lucky-store-1947` (`542881250`). NotFair was mistakenly bound to `KTL` (`507528108`).
- **Immediate Fixes**:
  - [x] Rebind NotFair to property 542881250.
  - Inventory hostnames & tag sources (direct gtag, Zaraz, GTM, etc.).
  - Implement full ecommerce funnel: `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `purchase`, `refund`.
  - Ensure purchase event fires only once on successful order with unique `transaction_id`.
  - Separate POS/admin measurement from customer storefront.

---

### 6. Keyword Intelligence — Evidence-Controlled
*(Page ID: `3d4fe7a68af8818baeb5f18133151bae`)*

> 🔑 Keyword intelligence is a research input, not verified demand.

- Differentiate GSC query+page exposure from third-party tool search volume estimates.
- Prioritize: Homepage local intent → GSC product queries → Indexing/canonical hygiene → Chattogram delivery hub → Category expansion.
- Removed from Backlog: Unsourced "Top 25" scores, competitor rankings, and immediate alternative/neighborhood doorways.

---

### 7. Review Strategy — Policy-Safe Templates
*(Page ID: `3d4fe7a68af88173aa57c7226d8d6961`)*

> ⭐ Ask for genuine, unbiased customer feedback. Never coach customers on keywords or ratings.

- **Approved WhatsApp Template**:
  > Assalamu Alaikum [Name]. Thank you for ordering from Lucky Store. If you have a moment, we would appreciate an honest Google review about your experience. Your feedback helps us improve and helps other customers make informed choices: [review link]. Thank you.
- Transparent responses without disclosing personal customer info or forcing SEO keywords.
- Realistic targets based on completed order volume (retiring the uncalibrated 150 reviews in 90 days target).
