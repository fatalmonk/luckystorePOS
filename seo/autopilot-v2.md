# Lucky Store SEO Autopilot v2 — execution contract

Site: https://www.luckystore1947.com
Product: Lucky Store online and neighbourhood grocery shopping for eligible Chattogram customers.
Primary conversion: completed online grocery order within the verified delivery area.
Competitors: Chaldal, Shwapno, Meena Bazar.
Ship mode: PR for review only. Never auto-merge.

## Canonical state and evidence
Read `seo/state.md`, `seo/runbook.md`, `seo/content-calendar.md`, and `seo/pr-template.md` from main before each agent run. `seo/state.md` remains the **only canonical operational state**. Do not create `seo/context.md` or duplicate state. Read the most recent machine-readable technical report from the Actions artifact and the latest GitHub incident. Cite source URLs, commit hashes and measurement dates; report inaccessible sources as unverified.

## Daily agent execution
1. Reconcile the latest technical report against the previous verified baseline. Distinguish report status, coverage and sampling from a full crawl. Never assume all sitemap URLs were crawled.
2. Read changes since the previous recorded commit. Check changed prices, delivery promises, stock, fees, payment and availability against production sources before proposing copy changes.
3. Check GitHub issues and open PRs; avoid duplicate work. Select **one** evidence-backed, conversion-relevant opportunity. Record the query, affected URL, observed defect, source, proposed change and verification criteria.
4. If the code and environment are accessible, implement the smallest safe change on a new branch, run applicable tests, lint, typecheck and build, inspect rendered output, and open a review PR. If any verification is unavailable, disclose it in the PR. Never claim a code change shipped merely because a PR exists.
5. Update `seo/state.md` and a dated report in the **same review PR** when source changes exist. Do not modify main directly. If nothing actionable is verified, report that and do not fabricate a change.

## Weekly (at least 7 days since verified weekly report)
- Search Console queries in positions 8–20 with impressions, only with actual GSC access; compare time windows and source.
- Review index coverage only for URLs actually verified via GSC; do not claim every URL indexed.
- Compare competitor sitemap snapshots, observing crawl permissions and source dates.
- Track AI answer citations only from genuine provider results, with model/provider, timestamp, answer and cited sources.
- Produce a short sourced weekly report; do not invent ranking, AI citations or orders.

## Monthly (at least 30 days since verified keyword map)
- Rebuild keyword map with `query,intent,monthly_volume,difficulty,target_url,status,current_position,last_checked`. Leave unavailable numeric fields empty.
- Audit query cannibalization, evaluate content gaps and buyer usefulness. Do not manufacture articles or comparisons to satisfy quotas.
- Draft outreach and social copy only; never post, email or submit automatically.
- Propose a free tool only if search demand, maintenance costs and actual customer usefulness justify it.

## Safety and permissions
No unattended merges, deployment, schema changes, price edits, unverified delivery claims, directory submissions or social posting. A deterministic GitHub Actions runner is **not** an LLM coding agent. It may collect evidence and create triage issues, but producing implementation PRs requires an explicitly configured coding-agent runtime with scoped repo permissions. Never claim that such an agent is connected unless verified.

## Current integration boundary
The GitHub Actions technical monitor creates artifacts and incidents. `seo/autopilot-v2.md` is the execution contract for a coding agent; it does not itself provision an agent or grant Search Console, analytics or AI-answer API access.
