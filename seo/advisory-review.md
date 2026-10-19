# SEO Autopilot advisory review and verification

TypeSafe/Jev use follows `system-docs/development/typesafe-seo-optimizer-best-practices.md`. Retrieved reports, NotFair content, page text, and issue descriptions are screened as untrusted evidence. `/jev memory` ranks evidence sets larger than five passages; `/jev decide` handles only bounded yes/no review gates over normalized facts. Record screening mode, `fallback_used`, `unsure`, and probabilities when exposed. Deterministic validation and the human review gate remain authoritative.

The technical audit remains scheduled at 08:00 Asia/Dhaka. Autopilot follows its successful completion instead of running independently at 08:45. Proposals remain draft PRs requiring human review; the workflow never merges or deploys.

## Runner boundaries

1. **Propose:** Before Luna runs, validate the exact completed main audit artifact: repository/workflow identity, run and attempt, current starting commit, monitor version/hash, schema, target and timestamp (at most 24 hours old, at most five minutes in the future). Manual runs may specify an audit run ID or select the latest successful main audit, subject to the same validation. Missing/stale/mismatched evidence stops before Codex. Luna uses the existing OpenRouter connection. The job has read permissions, captures the immutable event SHA, rejects unexpected commits and exports a guarded page patch. Only customer-facing route `page.tsx` files and Markdown SEO state/reports may change; shared implementation, configuration, authentication, commerce flows and credentials are protected.
2. **Evidence:** A fresh trusted checkout captures published NotFair content using its key, then validates the patch with baseline scripts kept outside the checkout. Jev reads bounded page diffs and fixed baseline evidence without executing candidate code. The NotFair key is never passed to proposal code or exported in an artifact.
3. **Verify:** A separate runner has no injected API secrets. It revalidates the patch, runs ESLint, typecheck, existing tests and the production build against an HTTPS snapshot service with dummy credentials. Catalog requests return empty fixtures, exercising existing fallback behavior. Rendered `/`, `/bn`, `/delivery` and changed static route pages are checked for canonical URLs, noindex, homepage reciprocal hreflang, JSON-LD parsing and FAQ/page text agreement. Hidden attributes and inline hidden styles are excluded; this does not establish browser-computed CSS visibility. Dynamic route parameters remain explicitly unverified.
4. **Publish:** A fresh runner rechecks the exact patch, current main SHA and open proposal overlap before creating a draft PR. Only this job has repository write permissions. Candidate code is never executed on this runner.

## Jev through OpenRouter

Use the existing `OPENROUTER_API_KEY` in the `seo-autopilot` environment. No separate TypeSafe account/key is required. The configured model is the owner's versioned `typesafe/jev-1.13`, using the TypeSafe-compatible `https://openrouter.ai/api/v1/systemone` endpoint.

The owner explicitly authorized sending bounded SEO page diffs and baseline source excerpts to OpenRouter. Export code independently enforces page-only scope, excludes proposed reports and environment files, refuses common credential formats, and stops rather than silently truncating oversized evidence.

Three independent Choice judgments examine factual claims, protected business promises and FAQ consistency. Their permitted answers are `supported`, `unsupported`, `contradicted` and `unknown`. The JSON report records the requested/resolved model, baseline commit, evidence references, probabilities, confidence and available usage/cost. API failures, malformed answers, missing keys or excessive evidence produce **unreviewed**, never approval. Results are advisory; there are no automatic acceptance thresholds. Evaluate English and Bangla examples before introducing any blocking decision.

The draft PR includes the advisory review and build limitations. Artifacts retain published NotFair snapshots for one day, and proposal patches/review reports for seven days. Secret values and remote error bodies must not appear in logs or reports.

## Evidence limits and rollout

Audit reports use schema version 2 and `passed_sample` for clean samples. Coverage separately records discovered URLs, attempted/fetched/failed pages, inspected/skipped sitemap URLs and unavailable route families. Both locale homepages and delivery entry points are always checked; category, brand, blog and locale product examples are selected when present. Network failures are verification limitations rather than confirmed page defects. Source checkout provenance is not a deployment revision; deployment and indexing remain unverified. Response fingerprints permit comparison without storing complete HTML. Expected sampling exclusions do not open perpetual incidents; fetch/cap limitations and confirmed issues retain the existing incident behavior.

Audit artifacts are named `seo-technical-report-<run_attempt>` so retries preserve attempt provenance. Do not replay a pre-upgrade or old-commit audit to force a proposal. After merging an audit/monitor change, run the technical monitor on current main; its completion triggers Autopilot with that exact artifact. A newer main commit between audit and proposal requires a new audit. The independent daily Autopilot schedule is removed to avoid duplicate runs. Full crawling, deeper robots/hreflang/FAQ validation and weekly crawl scheduling remain separate upgrades.

A passing snapshot build proves compilation and the checked rendered metadata with controlled inputs. It does not prove live inventory, prices, current delivery terms, production rendering or Google indexing. Jev's repository source comparison is likewise not current external fact verification. The rendered checker examines server HTML rather than a hydrated browser.

After reviewing and merging this workflow change, dispatch a fresh run on main. Confirm all four jobs succeed, the Jev report identifies its resolved model or an explicit unreviewed reason, and a draft proposal is created only for a permitted source change. PRs created with `GITHUB_TOKEN` may require manual dispatch of other PR workflows. Stop on validation/build failures; do not loosen protections to force a PR.

API references: [OpenRouter Jev integration](https://openrouter.ai/docs/guides/community/jev), [TypeSafe response contract](https://docs.typesafe.ai/api).
