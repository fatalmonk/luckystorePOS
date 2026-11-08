# Supabase Egress Follow-Up Task List

Plan: [plan.md](plan.md). Baseline: `main` / `d6c50dc5`, 8 November 2026.

## Planning

- [x] Reconcile the historical investigation with already-merged PRs #598, #599, #600, and #601.
- [x] Record the user's final-PR-review migration release rule, exact target safeguards, and no-execution planning scope.
- [x] Save the dependency graph, vertical tasks, acceptance criteria, verification, and phase checkpoints.
- [x] Verify scoped Markdown/links and review the final diff; record the repository secret-scan failure below.
- [ ] Human review of this plan. No execution approval is inferred from writing these files.

## Evidence and Release Foundation

- [ ] E6-M: Verify authorized read-only log access; record access/retention/field coverage or the exact blocker.
- [ ] E6-M: Complete equal one-hour pre/post counts with explicit UTC/release/method filters and unknown status/length coverage.
- [ ] E6-M: Complete comparable 24-hour periods after the post period ends; record intervening releases, traffic, and available provider usage. Do not claim billed savings without evidence.
- [x] E6-R: Implemented reviewed migration manifest/hash/target/RPC/provenance gate helpers (`scripts/ci/release-migrations.mjs` + tests), asserted smoke-test build SHA verification, and packaged standalone provenance inside the artifact before ZIP. Workflow now passes `EXPECTED_SHA` to packaging; no production migration/deploy performed.
- [x] E6-R Phase 2: migration manifests bind reviewed Git commit bytes, version, filename, and SQL SHA-256; an explicit reason is required for no-migration releases. The verifier CLI fetches fresh read-only Management API identity/history before classifying `APPLIED`, `PENDING`, `DRIFT`, or `UNVERIFIED`.
- [~] E6-R Phase 2 live evidence: test history is reconciled as 23 authorized remote-only and nine `PENDING` local-only versions; resolver schema is `EQUIVALENT` with history metadata `INCOMPLETE`. Production resolver schema is `EQUIVALENT` with complete history metadata, while full 276-version set equality remains `UNVERIFIED` because the complete set is not persisted. No database write, history repair, workflow activation, or deployment occurred.
- [x] E6-R Phase 2 authorized test-only ledger: the ledger exactly matches the persisted 23-version remote-only observation (8 security-test-only, 5 ledger-snapshot-only, 10 historical duplicates), including the two previously omitted preview-image versions. Version/name equality and dormant entries are tested; authorization cannot apply to production.
- [~] E6-R Phase 2 review: all seven reported findings are fixed, covered by 43 focused tests, and replied to; two threads auto-resolved. Five addressed threads remain unresolved because the available GitHub token lacks thread-resolution permission. All required checks pass.
- [ ] E6-B: Classify runtime/fallback/scheduled/test/historical/external callers and pin consumer contracts.
- [ ] E6-B: Run redacted, budget-limited cold/warm/cache-disabled complete-path fixtures, including SSR and browser costs separately.
- [ ] Checkpoint 1: Review measurement limits, release readiness, caller inventory, and optimization priorities.

## Storefront Paths

- [ ] E6-C: Align semantic keys, nested freshness, client isolation, and verified invalidation paths; retain shipped dedupe/race protections and TTLs.
- [ ] E6-D: Ship one bounded anonymous detail/identity/published-BN operation with real-role and complete-path parity. Depends on E6-R, E6-B, E6-C.
- [ ] E6-L: Ship bounded localized card/search filtering and projection with before-pagination parity. Depends on E6-R, E6-B, E6-C.
- [ ] E6-H: Migrate EN/BN/markdown brand selection after alias/assortment proof; no silent truncation or UI contract change. Depends on E6-L and its schema/release gates.
- [ ] Checkpoint 2: Review D/L/H separately with actual-role output, complete-path cost, degradation, and exact migrations.
- [ ] E6-P: Reduce unchanged-membership cart refetches; preserve 30-second campaign freshness, time boundaries, visibility, and checkout authority. Depends on E6-B.
- [ ] E6-K: Prove deployed runtime/shared-boundary support and early HTTP statuses. Depends on E6-D, E6-C, E6-B.
- [ ] Checkpoint 3: Select supported reuse transport or record the architecture blocker before changing canonical routing.
- [ ] E6-K: Implement/test canonical/PDP reuse only after that proof; count alias/worker misses and transport overhead honestly.
- [ ] E6-V: Migrate confirmed residual callers, especially sitemap v1, preserving compact consumer contracts. Depends on E6-R and E6-B.
- [ ] E6-V: Observe the complete caller/job/client rollout cycle; document deprecation. Revoke/drop only in a separate final-reviewed migration when dependencies permit.

## Separate Stock Integrity Track

- [ ] E6-S1: Inventory installed writers/overloads and add actual-role tests for trusted tenant derivation without inventory/audit changes. Depends on E6-R.
- [ ] E6-S1: Release/verify the future-write guard; do not backfill or add NOT NULL yet.
- [ ] E6-S2: Recount fresh null/conflict/orphan/quantity evidence; review exact total budget, 100-row batch contract, and private journal. Depends on E6-S1.
- [ ] E6-S2: Execute only reviewed null-only batches after final PR review; verify every batch, preserve quantities/reservations/non-null values/audits, and report partial repairs.
- [ ] Checkpoint 4: Review writer coverage and complete bounded repair evidence before enforcement.
- [ ] E6-S3: Validate non-null enforcement and tenant consistency under real writer/role/lock tests. Depends on complete E6-S1/E6-S2 evidence.

## Per-Task Release Checklist

- [ ] Focused red/green tests, applicable installed-SQL/real-role tests, app tests/typecheck/lint/build, diff and secret scan.
- [ ] Final review of full branch, exact reviewed commit/migration hashes, permissions, test/benchmark evidence, and rollback compatibility.
- [ ] Recheck commit and verified target; apply matching test-validated production migrations without another conversational approval request. Stop on drift, failed checks, missing access, or configured provider protection.
- [ ] Promote only the verified immutable app artifact when applicable; record production schema and artifact postchecks.
- [ ] Complete release-aware gateway observation; update the audit, this checklist, and `context.md` with evidence and next action.

## Current Limits

- No live log/billing or production schema queries were performed while planning; one-hour/day and migration parity tasks remain pending.
- The candidate full post-day ends `2026-11-09T03:30:00Z`; it is not complete at plan creation.
- Canonical shared-cache support, reliable fleet-wide invalidation, brand-policy SQL parity, and external legacy dependencies remain explicit gates.
- Stock repair is separate from egress savings; historical null counts are not current scope evidence.
- Repository secret scan failed with 25 non-staged findings: 6 scanner fixture strings in an unrelated untracked `.kilo` worktree and 19 JWT-like matches in existing ignored `.next-turbo` artifacts. Values were redacted and artifacts left unchanged; the staged-addition scan found no suspicious credential patterns.
- Phase 2 validation: 43 focused CI tests and 1,013 app tests passed; typecheck passed; lint passed with 3 existing React Compiler warnings; all PR checks passed. Direct root ESLint for `scripts/ci` is unavailable because no root `eslint.config.*` exists.
- No app implementation, production migration, deployment, cache service, or provider protection change was made; only the Phase 2 verifier/evidence changes were committed and pushed.
