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
last_run:       2026-10-14
last_pr:        none (init run)
open_prs:       none
next_run:       2026-10-15
```

---

## Baseline Snapshot (2026-10-14)

### Technical SEO — PASS ✅

| Signal | Status | Evidence |
|--------|--------|----------|
| Sitemap live | ✅ | `/sitemap.xml` — 902 URLs, bilingual alternates (en-BD / bn-BD) |
| Sitemap URL limit | ✅ | 902 << 24,000 ceiling enforced in `sitemap.ts` |
| AI bots in robots.txt | ✅ | GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, cohere-ai — all allowed |
| Canonical signals | ✅ | `x-default` + `hreflang` alternates per URL pair |
| Schema: GroceryStore | ✅ | `RootLayoutDocument.tsx` — `['Store','GroceryStore','Organization']` with full NAP, hours, geo, areaServed |
| Schema: WebSite | ✅ | Homepage — `WebSite` + `sitelinks_searchbox`-eligible name |
| Schema: ItemList | ✅ | Homepage — featured products emitted as `ItemList` |
| HTTPS | ✅ | Live on Vercel, valid cert |
| Google Search Console verification | ✅ | `googledd38bcebed6ae845.html` in `public/` |
| llms.txt | ✅ | `/llms.txt` + `/llms-full.txt` present (105-line full doc) |
| AI agent resources | ✅ | `auth.md`, `/.well-known/api-catalog` advertised in llms.txt |

### Content & Entity — PARTIAL ⚠️

| Signal | Status | Gap |
|--------|--------|-----|
| Definition block on homepage | ⚠️ | No explicit 1-2 sentence entity definition in first 200 words |
| FAQPage schema — `/delivery` | ✅ | `getDeliveryFaqSchema()` + visible FAQ section — live in production |
| FAQPage schema — homepage | ❌ | No FAQ schema or visible FAQ block on homepage |
| FAQPage schema — `/fortune-cookies-near-me` | ❌ | No FAQ schema on this page |
| Blog / content hub | ❌ | `/blog` route exists but no published posts |
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

### 🔴 HIGH — FAQPage schema + FAQ content block (homepage)
- **Impact:** Directly feeds AI Overview and Perplexity citation for "what is Lucky Store" and "order groceries Chattogram" queries
- **Status:** `/delivery` already has FAQPage schema ✅; homepage and `/fortune-cookies-near-me` do not
- **Pages:** Homepage (`(english)/page.tsx`), `/fortune-cookies-near-me`
- **Action:** Add FAQ JSON-LD + visible Q&A section; target Q&As documented in `runbook.md`

### 🔴 HIGH — Homepage entity definition block
- **Impact:** AI answer engines cite clear, first-200-word definitions; current homepage leads with hero image
- **Pages:** Homepage `HomeShell` component or layout metadata
- **Action:** Add `<meta name="description">` with entity framing + update `llms.txt` "About Lucky Store" block with definition-first copy

### 🟡 MEDIUM — Blog / content hub activation
- **Impact:** Original grocery content earns citations for category-level queries
- **Pages:** `/blog` — route exists, 0 posts
- **Action:** Draft first 3 posts targeting queries #9, #10, #4 (roadmap in `content-calendar.md`)

### 🟡 MEDIUM — Product page schema (Product + Offer)
- **Impact:** Product comparison queries, price-aware AI answers
- **Pages:** `/product/[slug]`
- **Action:** Verify `Product` schema exists and includes `offers.price` and `availability`

### 🟢 LOW — Wikidata entity creation
- **Impact:** Knowledge Graph recognition, entity authority
- **Action:** Create Wikidata item for Lucky Store with NAP + founding year

---

## Metrics Tracked Per Run

```yaml
technical_seo:
  sitemap_url_count: 902          # updated each run
  robots_ai_bots_pass: true       # boolean
  canonical_errors: 0             # from crawl
  broken_links: 0                 # from crawl

content:
  faq_schema_pages: 1             # pages with FAQPage schema (/delivery confirmed)
  blog_posts_published: 0         # total live posts
  llms_txt_last_updated: "2026-10-14"

ai_visibility:
  queries_tested: 0               # of 10
  citations_earned: 0             # times LS cited
  citation_rate: "0%"

competitor_signals:
  chaldal_new_ctg_content: false  # manual flag
  shwapno_new_delivery_area: false
  meena_bazar_online_push: false
```

---

## Changelog

| Date | Run | PRs | Key Action |
|------|-----|-----|------------|
| 2026-10-14 | init | — | Baseline established, seo/ initialized |
