---
meta:
  contentType: Reference
  source: Notion (https://app.notion.com/p/SEO-Optimization-Master-Plan-3d4fe7a68af8810b953feb7701479083)
  lastReviewed: 2026-09-08
  verifiedBaselineDate: 2026-09-07
---

# SEO Optimization - Master Plan

> 🎯 Master SEO operating plan for Lucky Store 1947. This plan is governed by verified Search Console, GA4, repository, and Google policy evidence. Estimates and assumptions may inform research but cannot authorize implementation.

## Decision Status

**Proceed with measurement acceptance and the Phase 4A product pilot; expand only after the gates below pass.** City and neighborhood expansion, citation campaigns, and structured-data enhancements remain gated by evidence and operational verification.

## High-level review — 8 September 2026

The strategic direction is retained: accurate local commerce, useful product pages, reliable measurement, and controlled expansion. This is a documentation review, not a fresh production, GSC, GA4, or GBP audit. Historical figures and deployment claims below retain their original evidence dates.

### Status and decision rules

- Phase 1 is **reported deployed; measurement acceptance pending reconciliation**. The master reports PR #356 complete, but `phase-1-execution-tracker-2026-09-08.md` still requests deployment and GA4 DebugView acceptance. Attach dated production event evidence and reconcile the tracker before declaring measurement complete. This conflict does not prove the deployment failed.
- Distinguish implementation, deployment, live acceptance, and measured SEO outcome. A merged PR or passing test does not establish all four. Preserve Phase 2–4 deployment records as reported history until a new live check is attached.
- September 7 metrics are a historical baseline. Indexed URLs, sitemap-discovered URLs, and recognized structured-data items have different scopes; do not subtract them to infer missing products or use 7 recognized items as the full catalog denominator.
- This review authorizes plan edits only. Implementation, migrations, production changes, and external campaigns follow the existing task-specific authorization gates.

### Next execution priorities

1. **Measurement acceptance — analytics owner (assign before execution):** Confirm property 542881250, consent behavior, one purchase per transaction, currency/value/items, and storefront traffic separation. Use mocked checkout or an isolated test environment; do not create a real production order for validation. Reconcile normal consented order reporting against aggregate order records and document expected consent/attribution gaps. Define placed orders separately from fulfilled revenue, cancellations, and refunds.
2. **Product pilot — SEO/editorial and engineering owners (assign):** Select 10–20 products using query relevance, impressions, stock reliability, verified facts, and business value. Include category-to-product crawlable links. Resolve indexing/rendering defects first; ship useful content and matching Product markup together.
3. **Local trust — business owner:** Maintain truthful GBP details and delivery information alongside the pilot. Chattogram intent must always state the actual 1 km Chawkbazar boundary; it must not imply citywide fulfillment.
4. **Bengali pilot — localization and engineering owners (assign):** Confirm Bengali/Banglish demand and native-review capacity before catalog-scale translation. Start with the homepage, delivery page, and a small demand-backed category set. Phase 4B covers foundation/money pages; Phase 4C covers catalog data/routing. Neither requires waiting for a guaranteed ranking uplift.
5. **Expansion:** Scale products after technical/editorial acceptance and a recorded pilot review. Neighborhood pages remain gated. Separate citation work from Product schema so directory research cannot delay the product pilot.

### Product lifecycle and release gates

- Temporarily out-of-stock products may remain useful, indexable 200 pages with accurate `OutOfStock` availability and relevant alternatives. Do not automatically noindex, remove from the sitemap, or redirect them solely because stock is zero.
- For permanently discontinued items, retain a useful reference page where justified; use a permanent redirect only to a genuinely equivalent replacement, otherwise return 404/410 when removed. Do not redirect unrelated products to the homepage or category.
- Missing optional nutrition, origin, or usage fields does not by itself justify deindexing an accurate product page. Improve existing pages first. Record demand, links, duplication, and the reason for each proposed noindex/consolidation in a URL manifest before changing indexability.
- All pilot URLs must have accurate visible facts, working buying controls appropriate to stock, matching required structured data, a canonical URL, and crawlable internal links. Optional editorial modules are included only when useful; ten sections are not a mandatory content quota.
- Verify initial and rendered mobile HTML, robots access, canonical/redirect behavior, image access, and Google Rich Results Test results. Review field Core Web Vitals where data exists; use lab checks as diagnostics, not proof of ranking impact.
- Bengali alternates must be genuinely translated, published, indexable equivalents with reciprocal hreflang and self-canonicals. Omit missing/untranslated alternates; do not fabricate locale pages. Latin slugs are a project convention, not a Google requirement. Use a deliberate x-default fallback and a working language switcher.

### Scorecard and review cadence

- **Business outcome:** Organic-attributed orders and revenue after measurement acceptance; show fulfilled/cancelled/refunded outcomes separately when reliable. Use one documented attribution definition. Until validated, mark conversion metrics unavailable.
- **Leading indicators:** Non-brand clicks to pilot products/categories, qualified indexed URLs divided by eligible submitted URLs, and valid Product items divided by audited eligible products. Report numerator, denominator, period, country, device, search type, and locale.
- **Diagnostics:** CTR and position for stable query/page cohorts, schema errors, unexpected noindex/canonical changes, and mobile usability. GSC query exports omit some queries; query totals need not equal property totals. Do not interpret a few impressions or a sitewide average position as a ranking win.
- Review technical regressions after release and weekly during rollout. Compare complete 28-day windows, then review at 56/90 days; annotate seasonality, stock changes, promotions, and releases. Use an unchanged comparison cohort where practical. Low volume means directional evidence, not causal proof.
- Pause the affected batch for incorrect product facts, broken buying flows, unexpected deindexing, or invalid required schema. Expansion requires a recorded continue/revise/stop decision with an owner and evidence; no fixed ranking or traffic guarantee.

### Shopping eligibility and source governance

- Assess Merchant Center/free-listing eligibility for Bangladesh, BDT, product types, and the actual delivery model before proposing a feed. Do not assume local availability or a 1 km shipping radius is representable. If eligible, pilot a small feed with stable IDs and price/stock parity; otherwise continue supported on-page Product markup.
- Schema.org validity and Google feature eligibility are separate checks. A GeoCircle or FAQ block does not establish Google shipping coverage or rich-result eligibility.
- Keep shared strategy consistent in this repository master and the Notion master. Detailed trackers own dated execution evidence. Older supporting plans are research/history wherever they conflict with these gates; they cannot independently authorize execution.

Official references checked for this review:
- [Google Product structured data and Merchant Center feeds](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google localized-version guidance](https://developers.google.com/search/docs/specialty/international/localized-versions)

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
2. **Phase 1 — GA4 measurement repair** (Reported deployed — PR #356; measurement acceptance pending reconciliation)
3. **Phase 2 — Indexing, canonical, sitemap, and 404 hygiene** (Completed & Deployed — PR #359 / live)
4. **Phase 3 — Homepage and demonstrated product-demand optimization** (Completed & Deployed — PR #361 / live)
5. **Phase 4 — One authoritative Chattogram delivery hub** (Completed & Deployed — PR #362 / live)
6. **Phase 4A — Product Page SEO and Content Enrichment** (Completed & Tested — Pilot Implemented)
7. **Phase 4B — Bengali Storefront Track (`/bn` Dual-Surface SEO)** (Active / Immediate Next)
8. **Phase 5 — Truthful GBP completeness and customer usefulness**
9. **Phase 6 — Structured data and citations**
10. **Phase 7 — Neighborhood expansion only if gates pass**

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
- [ ] Close live acceptance for the reported commerce funnel implementation: view_item, add_to_cart, begin_checkout, purchase (Phase 1)
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

- [x] **Phase 4A:** Enrich every eligible, indexable product page with verified product information, unique search-focused metadata, complete Product structured data, useful customer guidance, and image-search support. Roll out by demonstrated GSC demand first, then catalog coverage. (Pilot complete & tested)
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

### 2A. Phase 4A — Product Page SEO and Content Enrichment

> 🛒 Make every eligible product URL the most accurate and useful local result for its exact product query. A top-five organic position is the measurement objective, not a guarantee; rankings remain dependent on demand, competition, authority, indexing, and Google systems.

#### Current repo-confirmed baseline

- Product URLs already use descriptive canonical slugs and permanently redirect stale slugs.
- Product pages already expose name, unit, current BDT price, stock state, image, description, category, brand inference, and Product/Offer JSON-LD.
- Current visible content is thin: one generic description block, an optional nutrition string, and related products.
- Current metadata can fall back to unsupported generic copy such as “Fast home delivery,” and schema can incorrectly fall back to `Lucky Store` as the product brand. Both require correction before scaled enrichment.

#### Page content contract — every eligible indexed product

1. **Exact product identity:** Verified brand, full product name, variant/flavour, net quantity or pack size, category, and GTIN/barcode when it is a manufacturer identifier. Never expose an internal Lucky Store barcode as a GTIN.
2. **Unique search snippet:** Product-specific title and meta description using the exact name, size, current price where stable, Lucky Store, and Chattogram intent without stuffing or unsupported superlatives.
3. **Answer-first summary:** A concise opening paragraph stating what the product is, its verified pack size, intended product category/use, current availability, and local purchase context.
4. **Useful facts:** Structured facts for ingredients, nutrition, allergen statements, dietary or storage instructions, country of origin, manufacturer/importer, preparation or usage directions, and package information—but only when confirmed from packaging or an authoritative manufacturer source.
5. **Buying information:** Live price, unit-price context where calculable, stock state, delivery boundary and fees linked to `/delivery`, payment methods, returns/inspection policy, and a clear add-to-cart action.
6. **Product guidance:** Two to four genuinely useful, product-specific sections such as taste/profile, common uses, preparation, serving or storage. Do not create medical, nutritional, comparative, or quality claims without an attributable source.
7. **Direct questions:** Add concise visible Q&A only for questions the verified data can answer. Do not mass-produce identical FAQs or rely on FAQ rich-result eligibility.
8. **Images:** Use a clear primary pack image with accurate alt text containing product name and size; add additional views only when owned or licensed. Keep descriptive filenames and stable, crawlable image URLs.
9. **Internal discovery:** Link to the canonical category, closely related alternatives, complementary products, and relevant delivery information with natural anchors.
10. **Structured data parity:** Product JSON-LD must exactly match visible name, image, description, SKU/GTIN, brand, price, currency, stock, canonical URL, seller, shipping, and return information. Omit unknown properties instead of inventing fallbacks.

#### Approved product-page information architecture

Use the supplied Fortune Mustard Oil result and Shwapno product page as structural references, not as copy or factual sources:

1. **Buying panel:** Breadcrumbs; primary and secondary pack images; exact product H1; pack size; current and previous price only when a real comparison-price record exists; stock state; quantity control; add-to-cart; verified delivery and payment summary.
2. **Overview:** A short, unique answer-first summary written from verified facts.
3. **Specifications:** Scannable name/value rows for brand, product type, variant, net quantity, origin, manufacturer/importer, ingredients, allergens, dietary flags, storage, and preparation/usage, omitting fields that are unknown.
4. **Benefits or key features:** Packaging- or manufacturer-supported product characteristics only. Never convert marketing language, competitor text, or model inference into a factual benefit.
5. **Product details:** Original explanatory content that helps the customer choose the correct item; avoid repeating the overview or padding the page to a word count.
6. **How to use:** Practical directions only where suitable and verified. Food-safety, medical, infant-feeding, dosage, and health guidance require authoritative sourcing and heightened review.
7. **Questions and answers:** Product-specific customer questions with concise factual answers. Show reviews or AggregateRating schema only after genuine first-party review collection exists and the visible page displays the same data.
8. **Similar products:** Same-category alternatives selected by product type, size, price band, or verified substitution logic.
9. **Frequently bought together:** Complementary products based on privacy-safe aggregate Lucky Store order evidence; until sufficient evidence exists, label the module as editorial suggestions rather than purchase behavior.
10. **Related products:** A broader, non-duplicative discovery set. Avoid three visually separate carousels returning substantially the same items.

Do not reproduce the reference page's countdown timer, false scarcity, copied descriptions, decorative keyword repetition, unsupported delivery-speed claims, or manufacturer claims that cannot be verified for the exact variant.

#### Data provenance and publishing workflow

- Create a field-level catalog audit for all active storefront products: `verified`, `missing`, `conflicting`, or `not applicable`, with source and review date.
- Authoritative sources are product packaging/photographs, manufacturer or importer pages, and owner-verified store facts. Competitor copy may reveal coverage gaps but must never be copied or treated as proof.
- Separate merchant-controlled facts (price, stock, delivery) from manufacturer-controlled facts (ingredients, nutrition, origin, pack claims).
- Require editorial review and a duplicate-content check before a product becomes index-eligible. Products lacking sufficient unique verified information remain purchasable but should not be promoted for indexing solely to increase URL count.
- Generate content from structured facts and reusable layouts, not unreviewed free-form AI copy. Preserve a human approval state and `last_verified_at` timestamp.

#### Rollout order

1. **Inventory and benchmark:** Export active canonical products; join GSC query+page evidence; record indexation, current position, impressions, CTR, recognized Product/Merchant status, content completeness, and image coverage.
2. **Pilot:** Enrich 10–20 products with demonstrated exact-name impressions, starting with queries such as branded oil, rice, tea, and other high-intent stocked goods. Use the Fortune Mustard Oil SERP screenshot as a layout/content-pattern reference only, not evidence of wording or ranking causation.
3. **Template and data contract:** Approve the visible section structure, verified fields, metadata rules, Product schema mapping, image requirements, and editorial workflow.
4. **Catalog rollout:** Publish in category-sized batches; validate each batch before expanding. Apply the product lifecycle gates above; do not automatically deindex temporarily unavailable products or pages missing optional fields.
5. **Bengali extension:** Reuse reviewed facts for Phase 4B/4C translations; translations require their own review and reciprocal hreflang/canonical rules.

#### Acceptance and measurement gates

- Server-rendered HTML contains the unique H1, summary, useful facts, buying information, canonical, and crawlable primary image without requiring client interaction.
- One canonical 200 URL per product; stale names redirect 308; invalid products return a genuine 404; indexable products alone enter the sitemap.
- Product structured data passes validation and matches visible price, stock, brand, image, and identifier values.
- No copied descriptions, fabricated benefits, keyword stuffing, hidden text, internal-barcode GTINs, review markup without first-party reviews, or unsupported health claims.
- Track exact query+page pairs at 28, 56, and 90 days: indexed state, impressions, clicks, CTR, average position, top-10/top-5 query count, Merchant listing coverage, image-search impressions, engagement, add-to-cart, and purchase events.
- Success is improved eligible-page coverage and sustained query-level gains. A top-five result is a target for qualified product queries, never a promised outcome or a release gate.

#### Rollback

- Keep enrichment releases batch-bounded and reversible. Roll back the affected content/template release, remove invalid sitemap entries or schema properties, restore the last verified facts, and request revalidation where necessary.

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
- **Chattogram Delivery Hub**: One comprehensive resource covering the actual 1 km Chawkbazar delivery area within Chattogram (coverage, ordering, fees, timings, payment, FAQ).
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
