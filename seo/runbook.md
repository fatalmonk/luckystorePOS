# SEO Autopilot — Daily Runbook

This file is the operational script for every daily run of the Lucky Store SEO Autopilot.
The scheduled agent reads this file and `seo/autopilot-v2.md` first, executes only phases supported by verified access, updates `seo/state.md` in a review PR, and opens a review PR for verified changes. Never auto-merge. The scheduled GitHub Actions technical monitor is a deterministic evidence collector, not a coding agent.

---

## Pre-Flight

1. Sync to the current default branch and confirm a clean working tree; never overwrite another agent's changes
2. Read `seo/state.md` — load current state + last-run metrics
3. Review recent commits and open PRs; use `seo/state.md` as canonical persisted state. Root `context.md` is gitignored and is not SEO state.

---

## Phase 1: Technical SEO Check (5 min)

### 1a. Sitemap health
```bash
curl -s https://www.luckystore1947.com/sitemap.xml | grep -c '<loc>'
```
- Expect: > 800 URLs
- Flag if count drops >10% from baseline (potential page deletion / build failure)
- Update `sitemap_url_count` in `seo/state.md` only after a successful HTTP response and parsed XML count; otherwise mark unverified.

### 1b. robots.txt AI bot access

Audit the six tracked agents as an **observability check**, not a universal requirement to allow AI crawlers. A missing explicit Allow does not automatically mean blocked. Check effective robots directives, including wildcard rules and longest-match precedence; report intentional policy separately. The simple script below is a diagnostic only:

```bash
ROBOTS=$(curl -s https://www.luckystore1947.com/robots.txt)
REQUIRED_BOTS=("GPTBot" "PerplexityBot" "ClaudeBot" "Google-Extended" "Applebot-Extended" "cohere-ai")
for BOT in "${REQUIRED_BOTS[@]}"; do
  BOT_LINE=$(echo "$ROBOTS" | grep -n "User-agent: $BOT" | cut -d: -f1)
  if [ -z "$BOT_LINE" ]; then
    echo "FAIL: $BOT not in robots.txt"
    continue
  fi
  # Extract directives until the next blank line
  BLOCK=$(echo "$ROBOTS" | tail -n +"$BOT_LINE" | awk '/^[[:space:]]*$/{exit} {print}')
  if echo "$BLOCK" | grep -qE "^Disallow: /$"; then
    echo "FAIL: $BOT has Disallow: / — fully blocked"
  elif echo "$BLOCK" | grep -qE "^Allow: /"; then
    echo "OK:   $BOT"
  else
    echo "WARN: $BOT — no explicit Allow: / (check wildcard block)"
  fi
done
```

- Interpret diagnostic results against effective directives and documented crawler policy. Do not automatically unblock AI bots.
- Record unexpected changes as findings; block deployment only for confirmed critical regressions.

### 1c. Canonical + hreflang spot check
Use the latest Actions artifact as evidence; verify alternate-language routes exist, are indexable, and reciprocate before filing a fix.
- Fetch homepage and one product page HTML
- Verify `rel="canonical"` present and not self-conflicting
- Verify `hreflang="en-BD"` and `hreflang="bn-BD"` pair emitted

### 1d. Schema validation spot check
Treat historical schema counts as hypotheses. The production audit only confirms observed types, not complete schema validity.
- Fetch `https://www.luckystore1947.com` HTML
- Grep for `application/ld+json` — expect ≥3 blocks (GroceryStore, WebSite, ItemList)
- Flag if any block is missing

---

## Phase 2: Ranking Opportunities (10 min)

### 2a. Target query tracking
For each query in the 10-query list in `seo/state.md`:
1. Search Perplexity (if accessible) or note "manual check needed"
2. Record: cited? competitor cited instead? content format winning?
3. Update `ai_visibility.queries_tested` and `ai_visibility.citations_earned`

### 2b. New keyword opportunities
Look for queries where Lucky Store content exists but AI answer goes to a competitor:
- Identify the content gap (definition missing? no FAQ? no schema?)
- Add a sourced opportunity to `seo/state.md` if new

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

Implement one verified, conversion-relevant improvement per run from `seo/state.md`. Do not ship markup solely to chase AI citations or unsupported rich-result expectations.

### Current priority: validate existing FAQ and improve buyer-facing content

- **/delivery already has visible FAQ content and `getDeliveryFaqSchema()`.** Do not add duplicate FAQ markup. Verify it matches rendered text and current delivery rules.
- Homepage: assess whether a short, visible explanation of Lucky Store, delivery eligibility and ordering answers genuine customer questions. Add useful text only when supported by code and live policy.
- `/fortune-cookies-near-me`: inspect actual page content, stock and query intent before deciding whether any FAQ is useful.
- Google's FAQ rich results are generally limited to well-known authoritative government and health sites; FAQPage markup is **not** a promised rich result or AI-citation boost. If used, markup must exactly match visible, accurate Q&A.
- Verify store address, radius, fees, payment methods, hours, return policy and fulfillment promises against the current production source of truth. Do not reuse unverified example answers from prior runbooks.
- Check existing live blog URLs and publication status before planning new articles; a route existing does not mean zero published posts.

### Subsequent priorities (queue)
1. Blog post: "Best rice brands available online in Chattogram" → `/blog/best-rice-brands-chattogram`
2. Blog post: "Grocery delivery in Chawkbazar — what to know" → `/blog/grocery-delivery-chawkbazar`
3. Product schema audit on `/product/[slug]` pages
4. Blog post: "Fortune cookies available near me in Chattogram" → `/blog/fortune-cookies-chattogram`

---

## Phase 5: PR Creation

### Automated Codex Autopilot Execution
In scheduled GitHub Actions runs:
- Codex operates strictly within the worktree and **must never execute Git commands** (`git checkout`, `git commit`, `git push`).
- The GitHub Actions workflow manages dedicated branch `seo/codex-autopilot` and opens a **draft PR** for human review via `peter-evans/create-pull-request`.
- Direct pushes to `main` are strictly blocked by repository permissions and diff policies.
- Automatic merging is prohibited; human review and passing CI checks are mandatory.

### Manual Operator Mode (Human Only)
When an operator manually implements a verified SEO improvement:
```bash
git checkout -b seo/YYYY-MM-DD
git add <explicit-reviewed-paths>
git commit -m "seo(autopilot): YYYY-MM-DD run — [summary of change]"
git push origin seo/YYYY-MM-DD
```

PR title format: `seo: [date] — [1-line summary]`
PR labels: `seo`, `autopilot`
PR description template: see `seo/pr-template.md`. Run applicable lint, typecheck and build; inspect affected rendered pages before proposing code changes. If unavailable, disclose that verification was not run.

---

## Phase 6: State Update

- Update `seo/state.md` (`last_run`, metrics block, changelog row) **only when bundled with an accompanying storefront source change**.
- **No state-only PRs**: Diff guard policy strictly blocks metadata-only or state-only PRs (`seo/state.md` without corresponding route page edits).
- Never commit or push directly to `main`.

---

## Abort Conditions & Production Safeguards

Stop deployment and notify immediately if:
- Production robots directives unexpectedly block an important crawler, after verifying effective directives and intended policy (not every AI bot must be allowed).
- Verified complete sitemap URL count drops below 400 on a successful 200-OK complete traversal.
- Homepage schema blocks are confirmed missing from live production HTML across multiple verified requests.
- Any verified canonical URL points to a confirmed broken/404 page.

> **Production Safeguard Rule**: Abort conditions must be confirmed by verified live production evidence. Transient network timeouts, transport failures, runner DNS errors, or HTTP 5xx responses from the Actions runner must be classified as unverified audit limitations, **never** as confirmed production defects.
