# Lucky Store
## Stack
- Storefront Next.js 16.4.5 / React 19; admin React 19 / Vite; mobile Flutter / Expo SDK 57; backend Supabase, Cloudflare Workers / R2
## Current Task
- 20261108-e6r-phase2: finish a focused draft PR for explicit reviewed migration manifests and read-only test/production history verification. No migration application, history repair, workflow change, RPC framework, or deployment.
## Decisions
- 20261108-e6r-phase2-contract: manifests read migration bytes from the reviewed Git commit and bind commit, version, filename, and SQL SHA-256, with an explicit reason for no-migration releases. The verifier CLI fetches project identity before history and enforces fresh evidence; caller refs/history files alone cannot pass.
- 20261108-e6r-phase2-states: results are exactly `APPLIED`, `PENDING`, `DRIFT`, or `UNVERIFIED`. A recorded version or matching history name without SQL/schema equivalence remains `UNVERIFIED`.
- 20261108-e6r-phase2-live: test is `DRIFT` (290 remote/276 local; 23 remote-only, 9 local-only), but `20261107230000` is schema-verified `APPLIED` with NULL name/statements history metadata. Production is 276/276 with no version drift, but the matching name-only `20261107230000` row is `UNVERIFIED` for SQL equivalence.
- 20261108-e6r-gates: superseding the implementation claim, PR #604 does not yet fail closed end to end. `release-migrations.mjs` is disconnected from promotion and accepts supplied refs/history files/pass booleans; a missing remote migration and an evidence-free production promote check both reproduced as success. Runtime smoke SHA enforcement is valid but does not supply schema parity.
- 20261108-egress-release-rule: the earlier plan recorded authorization for a matching test-validated production migration after final review, but repository scope rules do not make it standing permission for later tasks. The current review explicitly authorizes no merge/deploy; any future production execution must use current-task owner authorization plus exact reviewed SQL/history, verified target, real-role tests, bounded repairs and release postchecks.
- 20261108-egress-rollout: E6-R completed health verification contract:
  - Health endpoint returns `status: 'ok'`, build SHA, and timestamp.
  - Provenance smoke tests require HTTPS, status 'ok', exact expected build SHA, parseable and fresh timestamp.
  - Storefront builds now include standalone provenance via `resolveBuildSha()` helper and immutable artifact ZIP packaging; Hostinger workflow passes `EXPECTED_SHA`.
- 20261108-migration-parity-gate: removed `migration-parity-gate` job and its dependency from the active Hostinger workflow. Migration scripts (`scripts/ci/release-migrations.mjs` and helpers) retained as dormant reference tooling but explicitly not release-authoritative.
- 20261108-todo-update: updated `tasks/todo.md` to mark migration manifest selection, independent target verification, RPC introspection, CI evidence generation, and migration application as pending follow-up work.
## Resolved
- 20261108-e6r-phase2-tests: 25 focused tests and 1,013 repository tests pass; typecheck passes; lint passes with 3 existing React Compiler warnings. Independent review findings for live evidence binding, Git commit binding, no-migration local drift, malformed schema hashes, and wrong-target classification were fixed with focused regressions.
- 20261108-release-blocked-gate: finished health verification contract and removed the incomplete migration gate from the Hostinger workflow. Release parity foundation established: build SHA verification with timestamp, status 'ok', and HTTPS requirements.
- 20261108-focused-tests: all existing tests pass (820 across 110 files including smoke-test and release-migrations tests).
- 20261108-workflow-cleanup: migrated hostinger workflow (YAML valid) with deprecated migration gate removed; deploy-production now correctly needs `[resolve-context, test-staging]`.
- 20261108-task-tracking: updated `tasks/todo.md` to reflect remaining E6-M/E6-B/E6-C/E6-D/E6-L/E6-H/E6-P/E6-K/E6-V/E6-S1/E6-S2/E6-S3 backlog.
## Next
- Commit/push the focused Phase 2 branch, open a draft PR, and run an independent final review.
- Keep migration/release approval blocked on test-history reconciliation and production SQL-equivalence evidence. Secret scan remains failed on 19 ignored `.next-turbo` artifacts.
