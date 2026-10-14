# SEO Autopilot — Daily Runbook

This file is the operational script for every daily run of the Lucky Store SEO Autopilot.
The scheduled agent reads this file first, executes each phase in order, updates `context.md`, and opens a PR if changes were made.

---

## Pre-Flight

1. `git pull origin main` — sync to latest
2. Read `seo/state.md` — load current state + last-run metrics
3. Check `context.md` (repo root) — note any active PRs or merges since last run

---

## Phase 1: Technical SEO Check (5 min)

### 1a. Sitemap health
```bash
curl -s https://www.luckystore1947.com/sitemap.xml | grep -c '<loc>'
```
- Expect: > 800 URLs
- Flag if count drops >10% from baseline (potential page deletion / build failure)
- Update `sitemap_url_count` in `context.md`

### 1b. robots.txt AI bot access
```bash
curl -s https://www.luckystore1947.com/robots.txt | grep -E "GPTBot|PerplexityBot|ClaudeBot|Google-Extended"
```
- Expect: all four present with `Allow: /`
- If any is missing or `Disallow: /` — STOP, create HIGH-PRIORITY PR immediately

### 1c. Canonical + hreflang spot check
- Fetch homepage and one product page HTML
- Verify `rel="canonical"` present and not self-conflicting
- Verify `hreflang="en-BD"` and `hreflang="bn-BD"` pair emitted

### 1d. Schema validation spot check
- Fetch `https://www.luckystore1947.com` HTML
- Grep for `application/ld+json` — expect ≥3 blocks (GroceryStore, WebSite, ItemList)
- Flag if any block is missing

---

## Phase 2: Ranking Opportunities (10 min)

### 2a. Target query tracking
For each query in the 10-query list in `context.md`:
1. Search Perplexity (if accessible) or note "manual check needed"
2. Record: cited? competitor cited instead? content format winning?
3. Update `ai_visibility.queries_tested` and `ai_visibility.citations_earned`

### 2b. New keyword opportunities
Look for queries where Lucky Store content exists but AI answer goes to a competitor:
- Identify the content gap (definition missing? no FAQ? no schema?)
- Add to opportunity backlog in `context.md` if new

---

## Phase 3: Competitor Signals (5 min)

For each competitor (Chaldal, Shwapno, Meena Bazar):
- Check if they published new Chattogram-specific content
- Note any new delivery area announcements
- Note any new product category pages targeting Lucky Store's keywords
- Store findings in `system-docs/competitive/YYYY-MM-DD.md` (gitignored)
- Update boolean flags in `seo/state.md` metrics block

---

## Phase 4: AI Visibility Improvements (implementation)

Implement one improvement per run from the priority list in `context.md`.

### Current top priority: FAQPage schema

**Target pages (in order):**
1. `/delivery` — FAQ: delivery radius, fees, hours, payment methods
2. Homepage (`(english)/page.tsx`) — FAQ: what is Lucky Store, delivery area, how to order
3. `/fortune-cookies-near-me` — FAQ: what brands, near me context

**FAQ questions to implement on `/delivery`:**

```json
[
  {
    "q": "What areas does Lucky Store deliver to?",
    "a": "Lucky Store delivers within a verified 1 km radius of the store at 665 Percival Hill Road, Emdad Park, Chawkbazar, Chattogram 4203, Bangladesh. Delivery is available to addresses within walking distance of Chawkbazar."
  },
  {
    "q": "How much does Lucky Store delivery cost?",
    "a": "Delivery is free for orders over ৳500. Orders below ৳500 incur a ৳40 delivery fee."
  },
  {
    "q": "What payment methods does Lucky Store accept?",
    "a": "Lucky Store accepts Cash on Delivery and bKash. Payment is collected at the doorstep after you inspect the items."
  },
  {
    "q": "What are Lucky Store's delivery hours?",
    "a": "Lucky Store is open daily from 9:00 AM to 12:30 AM (midnight). Orders placed within delivery hours are dispatched the same day."
  },
  {
    "q": "Can I return groceries from Lucky Store?",
    "a": "Yes. Lucky Store accepts returns within 1 day of delivery at no cost. Items are inspected at the doorstep before payment, so customers may decline any unsatisfactory items."
  }
]
```

**FAQ questions to implement on homepage:**

```json
[
  {
    "q": "What is Lucky Store?",
    "a": "Lucky Store is a neighborhood grocery and daily bazaar store in Chawkbazar, Chattogram, Bangladesh, founded in 1947. It offers online ordering with doorstep delivery within 1 km of the store."
  },
  {
    "q": "How do I order groceries from Lucky Store online?",
    "a": "Browse products at luckystore1947.com, add items to your cart, and place your order. Delivery is available within 1 km of Chawkbazar. You pay with Cash on Delivery or bKash at the doorstep."
  },
  {
    "q": "Does Lucky Store deliver to Chawkbazar?",
    "a": "Yes. Lucky Store's primary delivery area is Chawkbazar and the surrounding 1 km radius in Chattogram. Enter your address at checkout to confirm eligibility."
  }
]
```

### Subsequent priorities (queue)
1. Blog post: "Best rice brands available online in Chattogram" → `/blog/best-rice-brands-chattogram`
2. Blog post: "Grocery delivery in Chawkbazar — what to know" → `/blog/grocery-delivery-chawkbazar`
3. Product schema audit on `/product/[slug]` pages
4. Blog post: "Fortune cookies available near me in Chattogram" → `/blog/fortune-cookies-chattogram`

---

## Phase 5: PR Creation

If any change was made during Phase 4 (or if state metrics changed):

```bash
git checkout -b seo/YYYY-MM-DD
git add -A
git commit -m "seo(autopilot): YYYY-MM-DD run — [summary of change]"
git push origin seo/YYYY-MM-DD
```

PR title format: `seo: [date] — [1-line summary]`
PR labels: `seo`, `autopilot`
PR description template: see `pr-template.md`

---

## Phase 6: State Update

After every run (even if no code changes):
1. Update `seo/state.md` — last_run date, metrics, changelog row
2. Commit state update to the PR branch (if open) or to a separate `seo/state-YYYY-MM-DD` branch

---

## Abort Conditions

Stop the run and notify immediately if:
- `robots.txt` is blocking any AI bot with `Disallow: /`
- Sitemap URL count drops below 400 (possible build failure)
- Homepage schema blocks are missing (possible layout regression)
- Any canonical URL points to a broken/404 page
