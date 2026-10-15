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
last_run:       2026-10-15
last_pr:        review PR pending (seo/2026-10-15-bn-delivery-buyer-help)
open_prs:       review PR pending
next_run:       2026-10-16
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
| FAQPage schema — `/delivery` + `/bn/delivery` | 🛠️ | English `/delivery` retains visible FAQ and shared schema in source. Bengali route has English FAQPage JSON-LD but no corresponding visible FAQ; 2026-10-15 review PR proposes visible Bengali buyer FAQs and removal of mismatched Bengali markup. Production verification pending. |
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
- **Status:** Both delivery routes include visible FAQs and the shared `getDeliveryFaqSchema()` source; server-rendered JSON-LD is implemented, with live production verification pending deployment. Missing homepage or fortune-cookie FAQ markup alone is **not** an SEO defect.
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
  sitemap_url_count: null         # 2026-10-15 live XML inaccessible; 902 is the historical 2026-10-14 recorded baseline only
  robots_ai_bots_pass: null       # 2026-10-15 live robots.txt inaccessible; not a confirmed failure
  canonical_errors: null          # no full crawl evidenced; unknown until measured
  broken_links: null              # no full crawl evidenced; unknown until measured

content:
  faq_schema_pages: null          # source now emits on /delivery and /bn/delivery; verify live after deployment
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
- **Not verified:** Live `/robots.txt`, `/sitemap.xml`, `/bn/delivery`, `/blog`; no HTTP status or parsed XML count obtained. A failed fetch is not evidence of a 404, robots block or indexing defect.
- **Repo-confirmed:** English delivery page renders visible FAQ content and `getDeliveryFaqSchema()`; Bengali delivery page in main emits the same English FAQ JSON-LD without corresponding visible FAQ questions. A review PR proposes customer-facing Bengali answers while removing that mismatched markup, not duplicating English FAQ schema.
- **Access:** Search Console and analytics workspace integration returned 403 (not a member); no ranking, click, impression, index coverage, AI citation or order conversion figures were collected.
- **Buyer objective:** Clarify eligibility (1 km Chawkbazar), fees (free on ৳500+, otherwise ৳40), checkout and payment for eligible Bengali shoppers. No change to delivery policy, pricing, stock or fulfillment logic.
- **Next verification:** Inspect deployed `/delivery` and `/bn/delivery` HTML, sitemap and robots from a trusted network; verify GSC/GA access and completed-order events before attributing impact.

---

## Changelog

| Date | Run | PRs | Key Action |
|------|-----|-----|------------|
| 2026-10-14 | init | #458 | Baseline recorded, seo/ initialized |
| 2026-10-14 | review | #460 | Reconciled implementation queue with runbook; removed FAQ markup-only priority and unsupported zero metrics |
| 2026-10-14 | autopilot | pending | Added missing English homepage hreflang alternates; delivery FAQ confirmed single-sourced and unchanged |
| 2026-10-15 | fix | #478 (merged) | Delivery FAQ JSON-LD server-rendering in both locales; production verification pending. |
| 2026-10-15 | manual review | review PR pending | Repo-confirmed Bengali `/bn/delivery` English FAQPage mismatch; propose 4 visible Bengali buyer FAQs and remove unmatched Bengali JSON-LD. English `/delivery` unchanged. Sitemap/robots live checks blocked, GSC/GA access unavailable. |
