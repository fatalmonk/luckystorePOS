# SEO Autopilot — Lucky Store

**Website:** luckystore1947.com
**Primary conversion:** Completed online grocery orders (Chawkbazar delivery area)
**Schedule:** Daily @ 08:00 Asia/Dhaka
**Deployment policy:** Pull request — no auto-merge
**Initialized:** 2026-10-14

---

## Current State

```
phase:          baseline-established
last_run:       2026-10-28 (live pages + latest prior-commit monitor; PR #552 localization follow-up)
last_pr:        #552 (draft; pending review)
open_prs:       #552 (draft; no other open PRs at preflight)
next_run:       2026-10-29
```

---

## Baseline Snapshot (2026-10-14)

### Technical SEO — recorded baseline (revalidate live)

| Signal | Status | Evidence |
|--------|--------|----------|
| Sitemap live | ✅ | `/sitemap.xml` — 902 URLs, bilingual alternates (en-BD / bn-BD) |
| Sitemap URL limit | ✅ | 902 URLs; `sitemap.ts` caps products at 24,000 (not total URLs); protocol limit is 50,000 URLs |
| AI bots in robots.txt | ✅ | GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, cohere-ai — all allowed |
| Canonical signals | ✅ | `x-default` + `hreflang` alternates per URL pair |
| Schema: GroceryStore | ✅ | `RootLayoutDocument.tsx` — `['Store','GroceryStore','Organization']` with full NAP, hours, geo, areaServed |
| Schema: WebSite | ✅ | Homepage — `WebSite` + `sitelinks_searchbox`-eligible name |
| Schema: ItemList | ✅ | Homepage — featured products emitted as `ItemList` |
| HTTPS | ⚠️ | 2026-10-15 web fetch followed homepage and `/delivery` to `www`; Hostinger Node.js is the stated host, certificate chain not independently inspected |
| Google Search Console verification | ✅ | `googledd38bcebed6ae845.html` in `public/` |
| llms.txt | ✅ | `/llms.txt` + `/llms-full.txt` present (105-line full doc) |
| AI agent resources | ✅ | `auth.md`, `/.well-known/api-catalog` advertised in llms.txt |

### Content & Entity — mixed / pending verification

| Signal | Status | Gap |
|--------|--------|-----|
| Definition block on homepage | ⚠️ | No explicit 1-2 sentence entity definition in first 200 words |
| FAQPage schema — `/delivery` + `/bn/delivery` | 🛠️ | Both routes render visible FAQs and call their respective FAQPage JSON-LD generators in current main source as checked 2026-10-28. Rendered production JSON-LD was not independently inspected. |
| Homepage buyer FAQ / clarity | ⚠️ | Evaluate whether shoppers need additional visible guidance; schema absence is not a defect |
| Fortune-cookie page buyer guidance | ❓ | Review live content and demand; FAQ markup is optional |
| Blog / content hub | ❓ | Route exists; published post count requires live/CMS verification |
| Author attribution | ❌ | No named author pages |
| Original research / data | ❌ | No proprietary data publications |
| Wikidata / Wikipedia entity | ❓ | Not verified — check manually |

### AI Visibility (Citation Baseline) — NOT YET TESTED

Queries to track (first 10):

| # | Query | Expected intent | Target page |
|---|-------|-----------------|-------------|
| 1 | online grocery delivery Chattogram | transactional | homepage |
| 2 | grocery delivery Chawkbazar | transactional | homepage |
| 3 | online grocery Bangladesh near me | transactional | homepage |
| 4 | Fortune cookies near me Chattogram | local | /fortune-cookies-near-me |
| 5 | Ispahani tea online Bangladesh | product | /category/tea-and-coffee |
| 6 | Aarong dairy online order Chattogram | product | /category/dairy |
| 7 | Lucky Store 1947 Chattogram | brand | homepage |
| 8 | grocery delivery Chawkbazar bKash | transactional | /delivery |
| 9 | rice home delivery Chattogram | category | /category/rice-and-grain |
| 10 | edible oil online Bangladesh | category | /category/oil-and-ghee |

Citation test status: **Pending — schedule first test for 2026-10-15 run**

### Competitor Landscape (Initial)

| Competitor | Domain | Notes |
|-----------|--------|-------|
| Chaldal | chaldal.com | National leader; Dhaka-first, expanding CTG |
| Shwapno | shwapno.com | Retail chain with online ordering |
| Meena Bazar | meenabazar.com.bd | Physical chain, growing digital |

Detailed competitive teardowns → `system-docs/competitive/` (gitignored)

---

## Open Opportunities (Priority-Ordered)

### 🔴 HIGH — Verify buyer-facing homepage and delivery clarity
- **Outcome sought:** Help eligible Chawkbazar shoppers understand what Lucky Store sells, whether delivery reaches them, and how to complete an order.
- **Status:** Both delivery routes include visible FAQs and call locale-specific FAQPage generators in current main source as of 2026-10-28. Earlier Bengali schema removal was superseded by subsequent code; rendered JSON-LD verification remains pending. Missing homepage or fortune-cookie FAQ markup alone is **not** an SEO defect.
- **Pages:** Homepage and `/delivery`; assess `/fortune-cookies-near-me` only when its actual content and search demand justify work.
- **Action:** Audit rendered copy, checkout flow and current delivery policies; add or clarify **visible** buyer-helpful content only when a specific verified gap exists. Do not add FAQ JSON-LD solely for AI citations or unsupported Google rich-result expectations. Any structured data must reflect visible, accurate content.
- **Evidence gate:** Record the user question, source of truth, expected conversion benefit and validation method before implementation.

### 🔴 HIGH — Homepage entity definition block
- **Impact hypothesis:** A concise, accurate introduction may help shoppers understand the store and delivery scope; AI citation gains are unproven.
- **Pages:** Homepage `HomeShell` component or layout metadata
- **Action:** Inspect existing visible introduction and metadata first; improve verified customer-facing clarity if needed. Treat `llms.txt` changes as optional documentation, not a ranking tactic.

### 🟡 MEDIUM — Blog / content hub activation
- **Impact hypothesis:** Useful, differentiated content may attract relevant shoppers; citation and conversion effects require measurement.
- **Pages:** `/blog` — publication count must be verified against live routes and CMS before work.
- **Action:** Audit already published articles, Search Console queries and catalog availability; commission new posts only for supported gaps (see `seo/content-calendar.md`).

### 🟡 MEDIUM — Product page schema (Product + Offer)
- **Impact hypothesis:** Accurate product and offer details can help search engines and shoppers interpret listings; no AI citation guarantee.
- **Pages:** `/product/[slug]`
- **Action:** Verify `Product` schema exists and includes `offers.price` and `availability`

### 🟢 LOW — Wikidata entity creation
- **Impact:** No guaranteed Knowledge Graph outcome; third-party entity creation is not a priority without independent notability and policy eligibility.
- **Action:** Do not create a Wikidata item solely for SEO. Assess notability and sourcing requirements first.

---

## Metrics Tracked Per Run

```yaml
technical_seo:
  sitemap_url_count: 917          # 2026-10-27 GitHub monitor log: complete sitemap count; 15 pages sampled, not a full crawl
  robots_ai_bots_pass: null       # 2026-10-15 live robots.txt inaccessible; not a confirmed failure
  canonical_errors: null          # no full crawl evidenced; unknown until measured
  broken_links: null              # no full crawl evidenced; unknown until measured

content:
  faq_schema_pages: null          # both locale routes call FAQPage JSON-LD generators in source; live rendered JSON-LD not inspected
  blog_posts_published: null      # not verified; count live published posts before setting
  llms_txt_last_updated: "2026-10-14"

ai_visibility:
  queries_tested: 0               # of 10
  citations_earned: 0             # times LS cited
  citation_rate: null             # no queries tested; avoid treating unknown as 0%

competitor_signals:
  chaldal_new_ctg_content: false  # manual flag
  shwapno_new_delivery_area: false
  meena_bazar_online_push: false
```

---

## 2026-10-15 evidence and verification status

- **Verified live (limited):** Public web fetches of `https://luckystore1947.com/` and `/delivery` resolved to `https://www.luckystore1947.com/` and `/delivery`, with page titles. The available extractor exposed only a cart fragment, so homepage body content, rendered JSON-LD, canonical tags and checkout behavior were **not** verified.
- **Verified 2026-10-23 (immutable Vercel deployment, `/bn/delivery`):** HTTP 200, prerender header present, Bengali document language and expected title/description/canonical/hreflang metadata. The returned HTML contained no literal `<h1>`, three `BAILOUT_TO_CLIENT_SIDE_RENDERING` markers, FAQ text in the response (rendered-DOM visibility not confirmed), and no `FAQPage` markup. This is a server-rendering verification concern for the deployed build; it does not establish the current branch behavior because the deployment predates these local changes. FAQ schema absence alone is not treated as an SEO defect.
- **Not verified:** Live `/robots.txt`, `/sitemap.xml`, `/delivery`, `/blog`; no status or parsed XML count obtained in this run. A failed fetch is not evidence of a 404, robots block or indexing defect.
- **Repo-confirmed:** PR #480 is merged and the current Bengali delivery page renders visible buyer FAQs without FAQPage JSON-LD; English `/delivery` retains matching visible FAQ content and schema. PR #481 was based on the pre-#480 version, so its Bengali schema removal is already present in current `main`.
- **Access:** Search Console and analytics workspace integration returned 403 (not a member); no ranking, click, impression, index coverage, AI citation or order conversion figures were collected.
- **Buyer objective:** Clarify eligibility (1 km Chawkbazar), fees (free on ৳500+, otherwise ৳40), checkout and payment for eligible Bengali shoppers. No change to delivery policy, pricing, stock or fulfillment logic.
- **Next verification:** After an authorized deployment of the scoped branch, inspect `/delivery` and `/bn/delivery` HTML for server-rendered headings/content, bailout markers, and matching visible FAQ/schema; inspect sitemap and robots; verify GSC/GA access and completed-order events before attributing impact. Browser verification remains restricted to localhost:3000.

---

## 2026-10-17 evidence and verification status

- **Verified live (limited):** Public web fetch of English homepage returned title, hero grocery CTA, delivery boundary (1 km Chawkbazar), ৳500+ free delivery, and pay-after-inspection messaging. Observed redirect to `www.luckystore1947.com`.
- **Not verified:** Live `/robots.txt`, `/sitemap.xml`, canonical headers, hreflang tags, and rendered FAQPage JSON-LD were inaccessible via public fetch tool; marked unverified.
- **Source defect fixed:** `/bn/delivery` rendered `Footer` without locale prop, causing fallback to English text/links. Explicitly set `locale="bn"` on Header, Footer, and BottomNav (PR #497).
- **Access:** Search Console / Ryze returned 403. No ranking, impression, or conversion claims made.
- **Competitor intelligence:** Shwapno bKash checkout promotion verified as existing campaign (2026-09-10 to 2026-10-31), not a new Chattogram launch. Maintained Lucky Store ৳500 free delivery positioning.

---

## 2026-10-24 evidence and verification status

- **Verified buyer-facing issue:** The public homepage footer claimed delivery `across Chattogram` despite the same live page and current `DELIVERY_POLICY` publishing a 1 km Chawkbazar delivery area. Proposed bilingual clarification directs customers to check eligibility; this does **not** verify or change backend geofencing. Operational delivery-zone settings require reconciliation.
- **Measured technical SEO:** 2026-10-23 technical monitor run [39912732784](https://github.com/fatalmonk/luckystorePOS/actions/runs/39912732784) printed 916 discovered sitemap URLs, 15/15 sampled pages fetched, 0 sampled issues, 1 warning and 0 verification limitations. Its artifact upload failed, so the full JSON report was not available. This is not a 916-page crawl.
- **Confirmed CI/deployment blocker:** GitHub Actions artifact storage quota hit. 2026-10-24 [Hostinger CI/CD run 40028053592](https://github.com/fatalmonk/luckystorePOS/actions/runs/40028053592) packaged a 45.81 MB build but failed to upload it; staging/production deployment skipped. SEO monitor/report uploads also failed. Restore artifact storage without bypassing verification gates.
- **Public checks:** Apex homepage redirected to `www`; `/robots.txt`, `/sitemap.xml`, and rendered `/delivery` schema/hreflang were not independently inspectable via available public fetch. English `/delivery` already calls `getDeliveryFaqSchema()` in current source.
- **Analytics/AI:** Connected Ryze workspace returned HTTP 403; no fresh Search Console, GA4, verified completed-order, indexing, or AI-answer citation results. Competitor public scan yielded no verified new Chawkbazar-specific launches.
- **Review:** Bilingual footer copy, regression tests, and `seo/reports/2026-10-24.md` proposed in draft PR #543; no automatic merge/deployment.

---

## 2026-10-26 evidence and verification status

- **Canonical state:** Existing `seo/state.md` and PR #458 implementation retained; no duplicate setup or alternate state created. Current-main starting SHA `f23adb026effae10f95e98646805750213f2a8c2`.
- **Live public checks (partial):** Apex homepage redirected to `www`; public homepage showed 1 km Chawkbazar coverage and free delivery on ৳500+. Public web extractor could not independently retrieve robots.txt/sitemap XML or full delivery-page HTML; no full crawl, rendered FAQ verification or indexing conclusion. The homepage/footer and Deal of the Week extractor still showed older copy, but their current-main source already contains fixes; production revision and cache state require independent verification.
- **Measured technical monitor:** [2026-10-25 run 40171277725](https://github.com/fatalmonk/luckystorePOS/actions/runs/40171277725) printed **915 complete sitemap URLs, 15/15 sampled pages fetched, 0 sampled issues, 1 warning, 0 reported limitations**. Artifact upload failed due quota, so no full JSON artifact was available. This is not a 915-page crawl. Dependent [Autopilot run 40171332786](https://github.com/fatalmonk/luckystorePOS/actions/runs/40171332786) skipped proposal and verification.
- **Partial infrastructure recovery:** [2026-10-26 Hostinger run 40257484453](https://github.com/fatalmonk/luckystorePOS/actions/runs/40257484453) passed build, staging validation and production deployment. SEO monitor artifact recovery still requires a new current-main run; [issue #544](https://github.com/fatalmonk/luckystorePOS/issues/544) remains open.
- **Read-only operational mismatch:** `public.delivery_zones` for MAIN is active with 5 km radius and coordinates 22.3569, 91.7832; storefront policy states 1 km centered at 22.3550, 91.8363. Checkout accepts free-text addresses with no route-level geographic validation. No production data or policy changed. Tracked in [issue #551](https://github.com/fatalmonk/luckystorePOS/issues/551). Validate physical hub and backend function before geofencing.
- **Orders:** For MAIN, 28 days ending 2026-10-26 08:00 Asia/Dhaka: `orders` 5 cancelled / 0 delivered; `online_orders` 0 records. Prior 28 days: 7 cancelled / 0 delivered in `orders`. These are database status counts, not proof of zero actual fulfilled orders. GA4 `purchase` event reconciliation remains unavailable.
- **Verified code-copy defect:** Checkout sidebar said “Free delivery on orders over ৳500”, contradicting the inclusive `>= 500` threshold in `app/api/checkout/route.ts` and `DELIVERY_POLICY`. Review PR updates only buyer-facing copy using central constants; no checkout price, order, payment or geofencing logic changed.
- **Schema:** English `/delivery` already emits `getDeliveryFaqSchema()` in source and visible FAQs; no duplicate markup added. Live rendered schema still unverified.
- **Search Console / GA4 / AI visibility:** Ryze workspace connector returned HTTP 403; no fresh analytics, indexing, rankings, AI citations or conversion attribution measured. Competitor public scan confirmed existing Chattogram service/fees, not a new launch.
- **Review:** Existing PR #543 and #549 are merged; no automatic merge or deployment for this review proposal.

## 2026-10-28 evidence and verification status

- **Main:** `3b10ba9669fd9c4b2bc45985d01167fe10ab8914`; the most recent available technical monitor is from 2026-10-27 on older commit `99888b578e89d2ffb074f98abfbceb3b4fae5757`, not a current-main deployment audit.
- **Measured prior-commit audit:** [run 40463980596](https://github.com/fatalmonk/luckystorePOS/actions/runs/40463980596): 917 complete sitemap URLs, 15/15 sampled pages fetched, 14 sitemap URLs inspected, 903 skipped, 0 sampled issues, 1 warning, 0 limitations. Report artifact upload succeeded. The [dependent Autopilot](https://github.com/fatalmonk/luckystorePOS/actions/runs/40464118406) intentionally skipped coding because draft SEO PR #552 remains open.
- **Live public checks:** Homepage and both delivery pages expose published 1 km Chawkbazar boundary and free delivery on ৳500+. Apex homepage redirected to `www`. The public fetch could not read robots.txt, sitemap XML, checkout, or rendered FAQ JSON-LD; these remain unverified. Neither a full crawl nor indexing can be inferred.
- **FAQ source correction:** Both `/delivery` and `/bn/delivery` now call FAQPage generators in current main, with visible FAQ content; the older current-state claim that Bengali markup is absent is superseded. Do not add duplicate FAQ markup.
- **PR #552 follow-up:** Correct the already-proposed inclusive-threshold checkout notice for Bengali and English locales, preserving central policy constants and adding source regression assertions. This is a **draft PR update only**; no checkout logic, pricing, geofencing, deployment, or merge.
- **Business P0:** [issue #551](https://github.com/fatalmonk/luckystorePOS/issues/551) still documents unresolved published 1 km versus active 5 km production zone. No new production order reconciliation was available; completed eligible orders remain unverified.
- **External access:** Ryze connection discovery required interactive authorization in this unattended run. No fresh GSC, GA4, AI citation, or order metrics were retrieved. Competitor search found no verified new Chawkbazar-specific launch.

---

## Changelog

| Date | Run | PRs | Key Action |
|------|-----|-----|------------|
| 2026-10-14 | init | #458 | Baseline recorded, seo/ initialized |
| 2026-10-14 | review | #460 | Reconciled implementation queue with runbook; removed FAQ markup-only priority and unsupported zero metrics |
| 2026-10-14 | autopilot | pending | Added missing English homepage hreflang alternates; delivery FAQ confirmed single-sourced and unchanged |
| 2026-10-15 | fix | #478 (merged) | Delivery FAQ JSON-LD server-rendering in both locales; production verification pending. |
| 2026-10-15 | manual review | #480 (merged) | Added 4 visible Bengali buyer FAQs; English `/delivery` unchanged. Sitemap/robots live checks blocked, GSC/GA access unavailable. |
| 2026-10-15 | autopilot | #481 (merged) | Removes the Bengali FAQPage JSON-LD from the pre-#480 route; current `main` already has visible Bengali FAQs and no Bengali FAQPage JSON-LD. Production verification pending. |
| 2026-10-17 | fix | #497 | Kept Bengali delivery Header, Footer, and BottomNav localized (`locale="bn"`); documented verified Oct 17 findings in `seo/reports/2026-10-17.md`. |
| 2026-10-24 | autopilot | #543 (draft) | Clarified bilingual footer delivery scope based on public site; documented 916-URL audit sample and GitHub artifact-quota blocker. |
| 2026-10-26 | autopilot | #552 (draft) | Correct checkout free-delivery threshold wording to inclusive ৳500+ and explicitly scope 1 km; production delivery-zone mismatch tracked separately as #551. |
| 2026-10-28 | follow-up | #552 (draft) | Localized the proposed checkout notice for Bengali and English, added bilingual source assertions, and reconciled FAQ source state; no new PR. |

