# Competitor Prices Remediation: Final Independent Review

**Review date:** 2026-10-22
**Reviewed branch:** `fix/competitor-prices-gap-and-counts`
**Intended base:** `main` at `fe45478599cb3691326406ced2af1959c2ad8498`
**Production data / deploy:** Not accessed or modified.

## Decision

**Not ready to publish or merge.** The focused local price-gap and KPI changes pass their targeted tests and do not alter authorization code. I did not commit, push, or create a draft PR because the local branch currently points at commit `404c0e31`, which is also the head of unrelated open PR #534 (`codex/admin-audit-remediation`). A PR from the named branch to `main` would include that unrelated 16-file change set. Isolating only the uncommitted price changes requires creating/rebasing a clean branch; this review did not rewrite branch history or alter the existing PR branch.

There is also a known matcher limitation: the existing SQL matcher allows same-name matches when package quantity cannot be extracted from either product, and its quantity parser does not preserve measurement dimension or multipack count. This is a pre-existing commercial data-quality risk and is not fixed by the focused frontend/API changes reviewed here. The manual link flow also allows choosing any inventory result without a size/variant validation gate.

## Price-gap calculation review

The shared function in `apps/admin_web/src/lib/api/domains/competitorPrices.ts:15-30` returns `(ourPrice - referencePrice) / referencePrice`. Its convention is correct: positive means Lucky Store is more expensive; negative means cheaper. It rejects missing/non-finite values, negative Lucky Store prices, and non-positive competitor/reference prices. It permits a zero Lucky Store price, which is mathematically defined and renders as a valid 100% cheaper comparison; there is no local business rule in this patch proving that zero is invalid.

`formatPriceGapPercent` at lines 34-39 treats inputs as fractions, converts to percent once, rounds to two decimals, and does not cap valid values. Tests cover ৳945 vs ৳1,300 → −27.31%, the reverse → +37.57%, equal prices → 0.00%, zero reference, null, negative and non-finite inputs, and an uncapped large value.

Consumers reviewed:

- Competitor table display and sign colors in `apps/admin_web/src/features/competitorPrices/CompetitorPricesPage.tsx:271-281` use the normalized fraction and align green with cheaper / red with more expensive.
- Table sorting at `CompetitorPricesPage.tsx:167-170` sorts on the same derived fraction; there are no price-gap filter controls or aggregate price-gap KPI metrics in this page.
- Alert values are recalculated by `fetchPriceAlerts` in `competitorPrices.ts:162-189`, rather than trusting the stored RPC gap. Alert RPC output is derived from the same effective prices and scoped store checks in `supabase/migrations/20260729000000_competitor_prices_converge_item_id_and_enrich.sql:665-711`.
- The main observations list derives its gap from captured prices and returns null for `item_id == null` at `competitorPrices.ts:94-110`.
- The effective-price RPC requires non-null `item_id`, enforces store authorization, and filters to an optional requested item in `20260729000000_competitor_prices_converge_item_id_and_enrich.sql:376-428`; the client test verifies the ৳945/৳1,300 result.

**Residual finding:** the page’s `matched` tab filter at `CompetitorPricesPage.tsx:123` uses “both `our_price` and `item_id` are null” as the exclusion condition. A row with a non-null but invalid/missing `item_id` relation and a non-null `our_price` could enter the matched view. Its gap will still be null if prices are invalid, but `item_id` is treated as evidence of a product match in the list mapper. This depends on referential/database integrity and was not verified against production data. The direct table query also uses Supabase relationship data but this view does not verify a live matching confidence threshold.

## Product matching review

The existing matcher migration `supabase/migrations/20261018222800_enhance_bilingual_competitor_matcher.sql:4-25, 60-155` extracts a single numeric quantity and allows equal quantities or the case where both quantities are missing. The same numeric extractor maps mass, volume, and piece units into a shared numeric representation. Consequently, 500g and 500ml can collide, multipack count and product variant are not robustly compared, and two names with no parsable size can still match from brand/name fragments and a price-ratio heuristic.

Existing `supabase/tests/competitor_matching_rules.test.ts` only checks that migration SQL contains named matching rules; it does not execute cases for dimension mismatch, pack count, variant mismatch, or missing-size rejection. This is a confirmed limitation of repository logic/tests, not proof that any specific production row is mismatched. The 1-click product linking path in `apps/admin_web/src/features/competitorPrices/LinkProductModal.tsx` lets a user choose a search result but does not compare package size, unit count, or variant before link.

The price gap itself is now arithmetically correct for the linked identity, but that does not make an incorrectly linked identity commercially safe. Before relying on price-gap-based management actions, matcher and manual-link safeguards need focused follow-up tests and implementation.

## KPI counts, cache, and scope

`fetchCompetitorPriceCounts` in `apps/admin_web/src/lib/api/domains/competitorPrices.ts:128-153` runs three exact-count, `head: true` queries using the same `store_id`, split by `item_id IS NULL` / `IS NOT NULL`. The list query uses the same store id and optionally matched/unmatched predicates; local list loading is capped by the existing API behavior while exact KPI counts cover all visible rows under the same RLS. Therefore KPI cards and visible list rows intentionally have different cardinality scopes. The UI now labels the KPI values store-wide and says list filters do not change them (`CompetitorPricesPage.tsx:371-389, 497-500`), while showing the loaded row count at lines 525-528.

React Query keys include the store id. Adding a manual observation and clearing an override already invalidated count keys. The reviewed change adds count invalidation after linking a scraped product in `LinkProductModal.tsx:50-58`, which changes the matched/unmatched split. The exact-count test confirms store scoping and split predicates. No shared query abstraction was introduced. Separate concurrent queries are not a proven data-integrity defect; they can observe concurrent writes at slightly different instants, but no evidence establishes that as the source of a prior discrepancy.

RLS query review was read-only. The direct queries continue to include explicit `store_id`; effective price and alert RPCs check `get_current_user_store_id()` except service-role execution. No authorization policies, grants, RPC SQL, or Supabase configuration are changed by the local diff. No data-leakage regression was found in the reviewed diff. This is code review, not a production RLS integration test.

## Actual Git scope

The working tree contains five modified tracked files and one untracked component test, all within competitor pricing. The committed ancestry from `main` is unrelated: `404c0e31` is shared with `origin/codex/admin-audit-remediation` and open PR #534, which has 16 files and 372 insertions / 43 deletions relative to `main`. Creating a PR from the current branch as-is would include those changes.

`docs/audits/competitor-prices-remediation.md` is ignored by `.gitignore` rule `docs/*`; it is not tracked and would not be included in a PR by ordinary staging. This review is saved at `docs/audits/competitor-prices-final-review.md` and is also ignored by that rule. No force-add was performed.

`git diff --check` passed. No branch/history changes, staging, commit, push, PR creation, merge, or deployment were performed.

## Test and warning evidence

- Focused tests: **2 files, 13 tests passed** using `npm test -- --run src/lib/api/domains/competitorPrices.test.ts src/features/competitorPrices/CompetitorPricesPage.test.tsx` from `apps/admin_web`.
- An initial test command used repo-relative paths from inside the workspace and matched no tests; it was immediately rerun with workspace-relative paths and passed. This is a command-path error, not a test failure.
- Earlier implementation-session notes report a full admin test suite, typecheck, changed-file lint, and production build passed, with a Vite warning about a large minified chunk. These earlier results were not rerun as part of this independent review and are not treated as fresh verification.
- User asked to classify ten terminal warnings. The Terminal app was unavailable to Codex Computer Use (safety restriction). Repository/test outputs do not identify the referenced ten warnings as a discrete set. Consequently they cannot be classified from evidence. Separately observed tool warnings: Vercel CLI says it is outdated (tooling maintenance, not a dashboard defect); Vite reported an oversized chunk in the earlier run (actionable performance follow-up, not a price correctness failure); the test-path warning was command usage only.

## Priorities before publication

1. Create an isolated feature branch from current `main` and transfer only the six competitor-price working-tree files; do not reuse or rewrite the branch/head associated with PR #534.
2. Add matcher tests and safeguards for measurement dimension, missing package quantities, unit count/multipacks, and variants. Add equivalent validation or confirmation to manual linking.
3. Add tests proving zero Lucky Store price behavior and list behavior for dangling/mismatched item identity; decide whether a free product should count as a valid comparable.
4. Capture the exact ten terminal warning lines in a readable terminal/log output and classify each; current evidence is insufficient.
5. Rerun full admin tests, TypeScript, ESLint, and production build on the isolated branch; include fresh outputs in the draft PR.

## Final recommendation

The arithmetic/count presentation patch appears focused and its targeted tests pass, but **the requested conditional commit/push/draft PR step was not taken** because the branch ancestry would pollute the PR with unrelated work and the package/variant matching risk remains unaddressed. No PR URL was created. No production data or deployment was touched.

## Implementation follow-up — 2026-10-22

This addendum records the remediation performed after the review above. The earlier recommendation describes the review snapshot; the implementation work below uses a clean branch based on the then-current origin/main commit cd1b61632f0bfc83a484ffac326677522f46a6fd.

### Confirmed root causes and fixes

- **Brand evidence was overstated.** The link UI and SQL matcher treated the first word of a competitor title as a verified brand. Identical title tokens and size could therefore be promoted to VERIFIED without a structured brand field. Name-inferred brand matches now remain PROBABLE; the UI requires an explicit operator confirmation before linking. Structured scraped brand values are passed when available.
- **Match status could be contradicted by metadata.** The client read match_metadata.match_status before a safe-v2 rejection, while the effective-price RPC allowed a generic metadata VERIFIED value to bypass matcher status. The explicit matcher version now takes precedence, and actionable SQL comparisons require a trusted safe-v2:VERIFIED or previously user-verified URL mapping. Active manual overrides remain explicitly allowed.
- **Package parsing missed reversed multipacks.** Labels such as 500g x 2 could leave pack count at one. Both TypeScript and SQL parsers now recognize quantity-first multipack notation and compare pack counts.
- **The new SQL/UI paths used fields absent from the repository schema.** items is tenant-scoped and uses price; it has no store_id or selling_price. Matching and linking now resolve the store tenant, constrain catalog queries by tenant_id, and use items.price. The modal's candidate search is tenant-scoped and its cache key includes tenant/store scope. Effective-price SQL joins the linked item through the store tenant; the list API hides stored Lucky Store prices when that catalog relation is not visible.
- **A stored item price could be mistaken for proof of a match.** The page now classifies linked/unlinked tabs by item_id presence, the same basis as the exact store-wide counts. KPI and tab labels say “Linked” to distinguish an association from a VERIFIED comparison.
- **Price gaps and matching statuses are shared and gated.** Only VERIFIED matches can produce actionable gaps. Non-positive, missing, invalid, unmatched, or unverified comparisons display as unavailable. The sign convention remains positive for Lucky Store more expensive and negative for Lucky Store cheaper.

### Implemented files

- .gitignore — narrow exception for this specific audit document under docs/audits/.
- apps/admin_web/src/features/competitorPrices/AddPriceModal.tsx
- apps/admin_web/src/features/competitorPrices/CompetitorPricesPage.tsx
- apps/admin_web/src/features/competitorPrices/CompetitorPricesPage.test.tsx
- apps/admin_web/src/features/competitorPrices/LinkProductModal.tsx
- apps/admin_web/src/features/competitorPrices/scrapeHealth.ts
- apps/admin_web/src/features/competitorPrices/scrapeHealth.test.ts
- apps/admin_web/src/lib/api/domains/competitorPrices.ts
- apps/admin_web/src/lib/api/domains/competitorPrices.test.ts
- apps/admin_web/src/lib/api/domains/priceGap.ts
- apps/admin_web/src/lib/api/domains/productMatching.ts
- apps/admin_web/src/lib/api/domains/productMatching.test.ts
- apps/admin_web/src/lib/api/domains/productMatchingMigration.test.ts
- apps/admin_web/src/lib/api/types.ts
- supabase/migrations/20261022120000_conservative_competitor_matching.sql

The migration changes functions and uses the existing competitor-price metadata/version fields; it adds no tables or columns and does not rewrite stored observations during migration. Its link RPC uses a defaulted optional brand argument so existing four-argument calls remain valid. No production migration, rematch RPC, scraping job, or data write was executed.

### Verification evidence

- Test-first regressions reproduced the inferred-brand verification failure (VERIFIED returned where PROBABLE was expected), reversed-multipack failure, and stale metadata overriding a rejection. Each was corrected and rerun.
- Full admin suite: **25 files, 171 tests passed**.
- Focused price/matching/migration contract checks: **4 files, 41 tests passed**. The final full suite above includes the brand-evidence, reversed-multipack, stale-status, tenant-schema, visible-item, and verified-only gating regressions.
- TypeScript check: passed.
- ESLint: **0 errors, 3 existing react-hooks/incompatible-library warnings** in data-table.tsx, InventoryCardFeed.tsx, and InventoryListTable.tsx; no changed competitor-pricing file was reported.
- Production admin build: passed; Vite emitted its existing large-chunk warning.
- Staged git diff --check against origin/main: passed after final documentation and review staging.
- The current worktree is a clean, isolated branch from the current origin/main base; the original fix/competitor-prices-gap-and-counts worktree at 404c0e31 remains untouched. The diff paths are limited to competitor-pricing implementation/tests/migration, this audit, and its narrow ignore exception.

### Remaining risks and verification limits

- The SQL migration has only static contract coverage in this environment. Local Supabase integration could not be run: Docker and Podman are unavailable, and supabase status cannot parse the workspace .env.local. The file was not read, changed, or disclosed. A database-backed migration dry run and function-call tests are still required before production rollout.
- Jev Browser Use tools are not available in this session, so no local browser smoke test or screenshots were captured.
- Existing observations are not re-matched automatically by applying the migration. After review and a separate authorized rollout, operators will need a planned, store-scoped rematch and should review PROBABLE/AMBIGUOUS records before relying on pricing recommendations.
- Automated name matching intentionally becomes more conservative when source brand data is absent. This may increase manual verification work, but it prevents title similarity alone from producing actionable price gaps.

No production data was modified, no migration or deployment was run, and no PR was merged.
