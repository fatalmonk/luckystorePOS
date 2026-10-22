# Competitor Prices Remediation: Final Independent Review

**Review date:** 2026-10-22
**Reviewed branch:** `fix/competitor-prices-matching` (PR #535)
**Intended base:** `origin/main` at `cd1b61632f0bfc83a484ffac326677522f46a6fd`
**Production data / deploy:** Production project metadata and system catalogs were queried read-only. No production table rows were read or changed; no migration, rematch, scraper job, deployment, or merge was run.

## Decision

**BLOCKED.** Local PostgreSQL verification and PR checks pass, but the mandatory hosted Supabase migration/RPC verification could not be completed safely: the only nonproduction project is populated with active functions, and creating an isolated hosted branch requires explicit cost approval. The PR preview exposes only the authentication screen, so competitor-dashboard browser regression could not be completed without an authorized test session and verified nonproduction backend. No hosted migration, production data change, or deployment was performed.

Before production deployment, run the migration in an isolated Supabase branch with PostgREST enabled, capture a focused browser smoke using authorized local fixtures, and plan store-scoped rematching with a read-only dry run. The persisted `price_gap_percent` column is `numeric(5,2)`; the dashboard client recalculates exact gaps from the source prices, but direct raw-column readers receive the lower precision stored value.

## Initial review snapshot (historical; superseded by the implementation and database verification below)

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

## Initial recommendation (historical; superseded by the final audit below)

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
- supabase/tests/competitor_matching_confirmed_rematch_test.sql
- supabase/tests/competitor_matching_variant_conflict_test.sql

The migration changes functions and uses the existing competitor-price metadata/version fields; it adds no tables or columns and does not rewrite stored observations during migration. Its link RPC uses a defaulted optional brand argument so existing four-argument calls remain valid. No production migration, rematch RPC, scraping job, or data write was executed.

### Verification evidence

- Test-first regressions reproduced the inferred-brand verification failure (VERIFIED returned where PROBABLE was expected), reversed-multipack failure, and stale metadata overriding a rejection. Each was corrected and rerun.
- Full admin suite: **25 files, 175 tests passed** (rerun after final code changes).
- Focused price/matching/migration contract checks: **5 files, 47 tests passed** (rerun after final code changes).
- TypeScript check: passed.
- ESLint: **0 errors, 3 existing react-hooks/incompatible-library warnings** in data-table.tsx, InventoryCardFeed.tsx, and InventoryListTable.tsx; no changed competitor-pricing file was reported.
- Production admin build: passed; Vite emitted its existing large-chunk warning.
- Staged git diff --check against origin/main: passed after final documentation and review staging.
- The current worktree is a clean, isolated branch from the current origin/main base; the original fix/competitor-prices-gap-and-counts worktree at 404c0e31 remains untouched. The diff paths are limited to competitor-pricing implementation/tests/migration, this audit, and its narrow ignore exception.

### Remaining risks and verification limits

- A database-backed migration and RPC test was run in isolated local PostgreSQL 17.11, but not in a full local Supabase/PostgREST stack. Docker and Podman are unavailable. The existing `supabase status` env parsing issue was not revisited; no environment file was read or changed.
- Jev Browser Use MCP tools were unavailable. CUA inventory found Chrome closed with no browser tabs; no local browser smoke or screenshots were captured.
- Existing observations are not re-matched by applying the migration. Any rollout needs an authorized, store-scoped review of proposed outcomes before writes; probable and ambiguous matches must remain non-actionable.
- `competitor_prices.price_gap_percent` is `numeric(5,2)`. New SQL writes store a fractional gap rounded to four decimal places, but the column persists only two decimal places. The admin data layer recalculates from `our_price` and `competitor_price` before display, preserving the expected −27.31% and +37.57%; raw-column consumers retain the schema precision limitation.
- Automated matching intentionally becomes more conservative without explicit brand evidence; this can increase manual review work.

No production data was modified, no production migration or deployment was run, and no PR was merged.

## Database verification and final audit — 2026-10-22

### Environment and safety gate

- Production project `hvmyxyccfnkrbxqbhlnm` was identified as **Lucky Store**, PostgreSQL 17.6. Only `pg_proc`, `pg_class`, `pg_attribute`, `pg_constraint`, `pg_indexes`, and permission metadata were queried. No application rows were read or changed.
- Test project `grxxenvdhfwzafzyykgo` was identified as **Lucky Store Security Tests**, `ACTIVE_HEALTHY`, PostgreSQL 17.6. Its read-only inventory showed 2 stores, 2 tenants, populated audit/metrics/stock/order tables, and four active Edge Functions (`extract-receipt-vision`, `canva-connect`, `canva-social`, `jev-model-metrics`). It is not an empty disposable database and may have active dependencies; no migration or write was attempted there.
- Docker and Podman are unavailable. PostgreSQL 17.11 tools are installed. The existing Homebrew cluster at `/opt/homebrew/var/postgresql@17` was stopped and left untouched. A separate empty cluster was initialized at `/private/tmp/ls-pr535-pg-20261022`, port `55435`; test databases were created from `template0` using a fixture matching the relevant production columns, helper, and legacy RPC signatures.
- The fixture is a real PostgreSQL execution environment, not a full Supabase clone. It reproduces the production `get_current_user_store_id()` mapping via `auth.uid()` and `public.users`, plus the migration's required tables/columns. Production RLS is enabled on `stores`, `items`, `users`, and `competitor_prices`; this migration does not change those policies. Full PostgREST HTTP and policy execution were not available locally.

### Migration and RPC compatibility matrix

| RPC | Production signature before migration | Migration signature | Compatibility and security result |
|---|---|---|---|
| `match_competitor_price_item` | `p_store_id uuid, p_scraped_product_name text, p_scraped_barcode text DEFAULT NULL, p_scraped_url text DEFAULT NULL` | Adds trailing `p_scraped_brand text DEFAULT NULL`; same table return shape | Existing named four-argument calls resolve; verified in local PostgreSQL. `SECURITY DEFINER`, empty search path, store check. |
| `link_competitor_price_item` | Four args; trailing product URL defaults null | Adds trailing `p_confirmed_product_identity boolean DEFAULT false`; returns boolean | Existing four-argument calls resolve; verified. Uncertain links require confirmation; attribute conflicts remain rejected. `SECURITY DEFINER`, empty search path, store and tenant checks. |
| `rematch_competitor_prices` | `p_store_id uuid`; table return of three integer counts | Same signature and return | Replaced body only. `SECURITY DEFINER`, empty search path, authenticated store check. |
| `rematch_unmatched_competitor_prices` | Production had one- and two-argument overloads; two-arg key is `p_batch_size DEFAULT 1000` | One two-argument function with the same names/defaults; bounded `p_batch_size` | The first draft used `p_max_attempts`, which would break existing PostgREST JSON argument names. It was corrected and a named `p_batch_size` call passed locally. `SECURITY DEFINER`, empty search path, authenticated store scope or service role. |
| `get_effective_competitor_prices` | `(p_store_id uuid, p_item_id uuid DEFAULT NULL)`; 15-column table return | Same identity args, defaults, column names and types | Catalog shape matches production; tenant join and VERIFIED filter pass local tests. `SECURITY DEFINER`, empty search path, explicit store authorization. |
| `classify_competitor_product_match` | No production RPC in the inspected catalog | Seven args; trailing `p_previously_verified DEFAULT false`; returns status text | New helper RPC restricted to authenticated/service roles. `IMMUTABLE`, empty search path. |
| Matching helpers | Not present as production RPCs | `extract_product_pack_signature(text)`, `extract_product_variant(text)`, `is_valid_product_gtin(text)` | No table access. Explicitly revoked from PUBLIC/anon and granted to authenticated/service_role; confirmed `anon=false` and authenticated/service_role=true locally. |

The migration creates/replaces the three matching helpers, classifier, matcher, both rematch RPCs, effective-price RPC, and link RPC. It drops the old 4-arg matcher, both old rematch-unmatched overloads, and old 3-/4-arg link overloads before creating the defaulted replacements. Production catalog inspection found no normal `pg_depend` dependents on the replaced overloads. Dependencies include `auth.jwt()`, `auth.uid()` through `get_current_user_store_id()`, `public.stores`, `public.users`, `public.items`, `public.competitor_prices`, and `public.normalize_bilingual_product_name()`. Actual production columns `items.tenant_id`, `items.price`, `items.brand`, `items.barcode`, and `stores.tenant_id` match the migration. No tables or columns are created or altered.

All `SECURITY DEFINER` functions set `search_path = ''` and schema-qualify table/function references. Store operations check `get_current_user_store_id()` unless the JWT role is `service_role`. Production already grants authenticated access to store-scoped rematch RPCs; current effective-price/link/matcher grants also match the migration. The migration does not alter table grants, RLS policies, or stored rows. Anonymous execution is revoked on every database RPC/helper exposed by this migration.

### Database execution results

On isolated local PostgreSQL 17.11, the migration applied successfully over a synthetic pre-migration schema with the production legacy RPC signatures. Both committed SQL regression files and an additional transaction-rolled-back integration script passed:

- Variant tests: explicit `Mint` vs `Original` is REJECTED; a generic family word does not mask the later qualifier; previously verified sparse evidence remains VERIFIED.
- Matching tests: same valid GTIN and compatible attributes, exact brand/package evidence, conflicting GTIN, brand/size/dimension, single vs multipack, variants, missing quantity, ambiguous names, and prior verification.
- Tenant/security tests: a store-A user cannot match or link a store-B catalog item or call store B's effective-price RPC; the effective-price RPC omits cross-tenant links, PROBABLE rows, stale metadata claiming VERIFIED, and zero/negative comparisons; anonymous helper/link execution is denied.
- Manual-link tests: uncertain identity fails without confirmation; user-confirmed identity succeeds, survives a rematch while attributes remain compatible, and is unlinked after the observed package changes from 500g to 1kg.
- Compatibility tests: existing four-named-argument matcher and link calls still resolve; `p_batch_size` named invocation succeeds; effective RPC retains its production result columns.
- Math: `(945−1300)/1300` rounds to fractional `−0.2731` (−27.31%); `(1300−945)/945` rounds to `+0.3757` (+37.57%); equal prices yield zero. Zero competitor price produces no effective comparison.
- The production `price_gap_percent` column is `numeric(5,2)`, so the stored fractional value is rounded to `−0.27`. The dashboard fetch layer recomputes the fraction from `our_price` and `competitor_price`, so its display remains −27.31%. Raw-column consumers do not retain that precision; widening the column or changing the stored convention is a separate schema/data decision and was not added here.

Migration and test commands (all database commands targeted the isolated local cluster/database `pr535_release`, never a Supabase project):

```sh
/opt/homebrew/opt/postgresql@17/bin/initdb -D /private/tmp/ls-pr535-pg-20261022 --auth-local=trust --auth-host=trust --no-instructions
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /private/tmp/ls-pr535-pg-20261022 -o "-F -p 55435 -k /private/tmp" -l /private/tmp/ls-pr535-pg-20261022.log start
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f /private/tmp/ls-pr535-fixture-auth.sql
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f /private/tmp/ls-pr535-legacy.sql
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f supabase/migrations/20261022120000_conservative_competitor_matching.sql
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f supabase/tests/competitor_matching_variant_conflict_test.sql
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f supabase/tests/competitor_matching_confirmed_rematch_test.sql
psql -h /private/tmp -p 55435 -U mac.alvi -d pr535_release -v ON_ERROR_STOP=1 -f /private/tmp/ls-pr535-integration.sql
```

### Safe rematching dry-run procedure

After the migration is separately reviewed and deployed by the owner, a store-authorized operator can preview auto-matcher outcomes with a read-only, single-store query before invoking any write-capable rematch RPC:

```sql
SELECT cp.id,
       cp.store_id,
       cp.product_name,
       cp.item_id AS current_item_id,
       proposed.item_id AS proposed_item_id,
       proposed.matcher_version AS proposed_status
FROM public.competitor_prices AS cp
CROSS JOIN LATERAL public.match_competitor_price_item(
  cp.store_id,
  cp.product_name,
  cp.raw_data ->> 'barcode',
  cp.competitor_product_url,
  cp.raw_data ->> 'brand'
) AS proposed
WHERE cp.store_id = '<authorized-store-uuid>'::uuid
  AND cp.source = 'scraper'
ORDER BY cp.id;
```

This query does not mutate rows. Review VERIFIED, PROBABLE, AMBIGUOUS, and REJECTED counts and sample mappings. For `safe-v2:VERIFIED:user-confirmed` rows, preview the linked item through `classify_competitor_product_match(..., true)` as the migration does; the matcher-only call above does not include that preservation branch. Keep execution store-scoped, obtain separate authorization before running `rematch_competitor_prices`, and review affected rows afterward. Non-service callers must provide their authorized store ID to `rematch_unmatched_competitor_prices`; only service-role operations may use a null/global store scope.

### Final code/test review

Additional confirmed defects found and fixed during DB testing:

1. The SQL variant parser previously returned the first regex term, causing “Chocolate Mint” and “Chocolate Original” to both parse as `chocolate`. The SQL and TypeScript matchers now treat chocolate as a family word and preserve explicit qualifiers; the regression passes.
2. A confirmed manual link on a scraper observation with no URL was discarded by the next rematch. Rematching now revalidates the linked catalog item under the same tenant and retains the mapping only while the current attributes remain VERIFIED. The regression proves both persistence and unlink-on-conflict.
3. `p_max_attempts` renamed the production PostgREST parameter `p_batch_size`; the migration now retains the production argument name/default and its named call passes.
4. New pure helper functions inherited PostgreSQL's default PUBLIC execute grant. The migration now revokes PUBLIC/anon and grants authenticated/service_role; a failing-before/fixed-after SQL permission test verifies this.

Fresh checks after these changes:

- Focused admin tests: **5 files, 47 tests passed**.
- Full admin suite: **25 files, 175 tests passed**.
- TypeScript: passed (`rtk npm run typecheck --workspace admin_web`).
- ESLint: 0 errors; 3 existing `react-hooks/incompatible-library` warnings in `data-table.tsx`, `InventoryCardFeed.tsx`, and `InventoryListTable.tsx`, none in changed competitor-pricing files.
- Production build: passed; Vite emitted the existing >1 MB chunk warning.
- `git diff --check`: passed.
- GitHub checks for pushed commit `44d9ee6497f6670f1cf84a822d84b5281992e1d3`: 12 passed, 0 failed, and 2 skipped (Android packaging and Supabase Preview). `admin_web_check`, E2E Tests, Project Health & Security Audit, Lint & Typecheck, `lint`, and `secret_scan` passed. CodeRabbit, Vercel preview statuses, preview comments, and Workers Builds also reported success. Supabase Preview being skipped means no hosted migration preview was run.
- Browser smoke: incomplete. Jev Browser Use tools were absent; CUA found Chrome closed and no tabs. The local PostgreSQL fixture has no PostgREST service or authenticated browser session.

**Remaining merge conditions:** verify the pushed commit's GitHub checks; run PostgREST/browser smoke in an isolated Supabase preview or authorized local session; keep production read-only until the repository owner approves deployment. No production data, migration, rematch, scraper, deployment, or merge was touched by this review.

### Query-volume review

- The competitor observation list uses the existing direct store-scoped query and has no application-level pagination or explicit row limit. This behavior predates the focused database fixes and was not changed here; it remains a scale risk for stores with large histories and should be addressed separately with server-side pagination and a UX for loading additional rows. The existing Supabase/PostgREST maximum response row cap can also truncate large histories without explicit pagination.
- The new KPI query issues three exact-count `head: true` requests in parallel, all constrained by `store_id` and split by `item_id` nullability. It runs on normal query activation and explicit invalidation; no polling/refetch interval or invalidation loop was found. This is bounded response volume but incurs three count operations per refresh.
- The linked-product mutation invalidates both list and store-count keys, so the linked/unlinked split refreshes after successful linking. Search and competitor filtering are client-side over the loaded list; they do not trigger repeated network requests.
- These findings do not establish the reported 1.9 TB incident’s cause. No broad Supabase traffic investigation was performed.

### Publish state

The local branch is `fix/competitor-prices-matching`, based on `origin/main` `cd1b61632f0bfc83a484ffac326677522f46a6fd`; PR #535 remains a draft targeting `main`. Before the remediation push, the PR head was `95dbffa648013ea699d3073b5395059d8f8cc7c5` and its then-current required checks had passed; Supabase Preview and Android packaging were skipped. The original PR #534 worktree was inspected read-only and not modified. The remediation commit SHA and refreshed post-push checks should be recorded below after publication.

Post-push GitHub evidence was refreshed on 2026-10-22 with `gh pr view 535 --json statusCheckRollup` and `gh pr checks 535`. PR #535 remains open and draft, targets `main`, and currently reports mergeable at the GitHub graph level. This is not a merge approval: a real Supabase/PostgREST migration preview and browser smoke are still absent. GitHub’s push response also reported 15 Dependabot alerts on the default branch (1 critical, 3 high, 9 moderate, 2 low); these are repository-level alerts and are not established as introduced by this PR. The PR `secret_scan` passed. No production deployment or migration was run; the Vercel statuses are the PR automation preview checks.

## PR #535 final merge-readiness verification — 2026-10-22

Expected PR head at the start of this verification was `fb865cbe553117e571b0569f5158efe2b02ed303`; GitHub and the local feature branch matched that SHA, with base `main` at `cd1b61632f0bfc83a484ffac326677522f46a6fd`. A local migration-retry defect was found and fixed during this audit; the PR branch head therefore changes when this audit/fix is pushed. No production mutation or deployment was performed.

### Verification matrix

| Test | Environment | Result | Evidence | Remaining risk |
|---|---|---|---|---|
| PR head and base check | GitHub PR #535 | PASS at start | `gh pr view 535 --json ...` returned expected head `fb865cbe...`, base `cd1b6163...`; branch was clean before targeted changes. | Recheck head and required CI after publishing the follow-up commit. |
| Hosted project isolation | Supabase organization `vercel_icfg_yshQzTyd2wTs2JpVo3y2SKF3` | BLOCKED | Read-only project listing found only `Lucky Store` (`hvmyxyccfnkrbxqbhlnm`, production) and `Lucky Store Security Tests` (`grxxenvdhfwzafzyykgo`). The test project is active, populated, has active app/telemetry functions, has 277 migration entries versus production's 265, and has no development branches. Production has only its default `main` branch (same production project ref). | The test project is not established as empty or isolated from production data/dependencies. Do not apply this migration there. |
| Create isolated hosted branch | Supabase branch tool | BLOCKED before creation | A branch request against the production project returned a requirement for a cost confirmation ID; the tool requires user agreement to the branch's recurring hourly cost. No branch was created and no charge incurred. | Need explicit cost approval before requesting a cost confirmation and creating the isolated branch. |
| Migration first application and repeatability | Isolated local PostgreSQL 17.11, database `pr535_repeat_20261022b`, fixture based on relevant production schema/RPC signatures | PASS after fix | The updated migration applied twice successfully with `ON_ERROR_STOP=1`. First retry attempt against the pre-fix migration failed at plain `CREATE FUNCTION ... match_competitor_price_item` because the function already existed. The three replacement RPCs now use `CREATE OR REPLACE FUNCTION`; the migration contract test catches plain `CREATE FUNCTION`. | Local PostgreSQL is not hosted Supabase and does not validate PostgREST HTTP schema cache behavior. |
| SQL matching/security regressions | Same isolated local PostgreSQL database | PASS | `competitor_matching_variant_conflict_test.sql`, `competitor_matching_confirmed_rematch_test.sql`, and `/private/tmp/ls-pr535-integration.sql` passed. Coverage included variant rejection, confirmed-link survival and unlink on size conflict, role grants, store scoping, cross-tenant denial, manual confirmation, effective-price exclusion, and named RPC args. | This fixture exercises function authorization logic but is not a full Supabase Auth/RLS/PostgREST stack. |
| PostgREST signature discovery and HTTP RPC calls | Hosted Supabase | NOT RUN | No safe hosted branch was available. Local named PostgreSQL calls and production catalog metadata were reviewed in the previous audit; no live PostgREST request was made in this verification. | Mandatory gate remains. |
| Browser dashboard smoke | PR preview in Chrome, route `/competitor-prices` | BLOCKED | CUA Chrome and configured Jev helper were available. The admin preview rendered the unauthenticated “Admin Management Portal” sign-in form; no dashboard rows or price data were present, and 0 browser console errors were observed. Jev returned `needs_verification`, confirmed the login gate, and executed 0 actions. No credentials were entered. | Dashboard functionality, rematching, price gaps, empty/loading/error states, and mobile layout were not accessible; use an authorized test account only after verifying a nonproduction backend. |
| Full admin tests | Local PR worktree | PASS | `rtk npm test --workspace admin_web -- --run` — 25 files, 176 tests passed. The additional migration-repeatability contract test was red before the fix (1 failed), then green (9/9 migration contract tests). | None identified in this run. |
| TypeScript, ESLint, production build | Local PR worktree | PASS with existing warnings | `rtk npm run typecheck --workspace admin_web` passed. `rtk npm run lint --workspace admin_web` had 0 errors and 3 existing incompatible-library warnings in unrelated inventory/table files. `rtk npm run build --workspace admin_web` passed with the existing large-chunk warning. | Existing lint/build warnings are unrelated to this migration change. |
| GitHub CI and security checks after retry fix | PR head `a187a80c79b08fb89d59a224fb54ff7a02d1f50b` | PASS with skips | `gh pr checks 535` reported 12 passed, 0 failed, 2 skipped. Supabase Preview and Android packaging were skipped; `secret_scan`, Project Health & Security Audit, admin, lint/typecheck, E2E, Flutter, lint, and worker checks passed. | Supabase Preview was skipped, so the hosted database migration remains unverified. |
| Migration/security/performance diff review | Local PR worktree | PASS for reviewed change | The fix changes only function creation semantics and adds one migration-contract test; it does not add tables/columns, change matcher logic, grants, RLS, or query paths. `git diff --check` passed after the final local updates. | No hosted role/RLS/PostgREST verification. |

### Repeatability root cause and remediation

The migration dropped old RPC overloads, then used plain `CREATE FUNCTION` for the new matcher, unmatched-rematch, and link signatures. Applying the file a second time failed because the replacement signatures already existed. This is a retry/partial-application hazard. The migration now uses `CREATE OR REPLACE FUNCTION` for all three definitions; a fresh local fixture accepted two consecutive applications, and both SQL regression files plus the tenant/security integration script passed afterward.

### Final gate

**BLOCKED.** The code-level migration retry defect is fixed and local checks pass, but two mandatory runtime gates remain unverified: (1) migration and PostgREST RPC behavior in a safe hosted Supabase branch, which requires explicit approval of recurring branch cost; and (2) authenticated browser regression against a verified nonproduction backend. Keep PR #535 unmerged until those gates are completed. No production data, production schema, or deployment was changed.

At this report update, PR #535 remains open and draft, targets `main`, and has head `a187a80c79b08fb89d59a224fb54ff7a02d1f50b`; required GitHub checks are green except the documented skipped jobs. No merge was performed.
