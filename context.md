# Lucky Store
## Stack
- Storefront Next.js 16.4.5 / React 19; admin React 19 / Vite; mobile Flutter / Expo SDK 57; backend Supabase, Cloudflare Workers / R2
## Current Task
- 20261108-e6r-phase2: PR #605 remediation is pushed and all checks pass. Seven reported findings are fixed and replied to; five addressed threads remain unresolved only because the available GitHub token lacks thread-resolution permission. No database write, history repair, workflow activation, deployment, or merge.
## Decisions
- 20261108-e6r-phase2-contract: manifests read migration bytes from the reviewed Git commit and bind commit, version, filename, and SQL SHA-256, with an explicit reason for no-migration releases. The verifier CLI fetches project identity before history and enforces fresh evidence; caller refs/history files alone cannot pass.
- 20261108-e6r-phase2-states: results are exactly `APPLIED`, `PENDING`, `DRIFT`, or `UNVERIFIED`. A recorded version or matching history name without SQL/schema equivalence remains `UNVERIFIED`.
- 20261108-e6r-phase2-live: test has 290 remote/276 local: all 23 remote-only versions are authorized, nine local-only versions make parity `PENDING`, resolver schema is `EQUIVALENT`, and history metadata is `INCOMPLETE`. Production resolver version is recorded with statements, its schema is `EQUIVALENT`, and history metadata is `COMPLETE`; full 276-version set equality is not persisted and remains `UNVERIFIED`.
- 20261108-e6r-authorized-test-only: `scripts/ci/authorized-test-only-migrations.json` now exactly matches the recorded 23-version remote-only set (8 security-test-only, 5 ledger-snapshot-only, 10 historical duplicates), including omitted versions `20261028193249` and `20261028194416`. Names and dormant entries are checked; authorization is hard-limited to the test project.
- 20261108-e6r-test-fix: `validateRemoteMigrationState` test now passes `now: Date.parse('2026-11-08T20:05:00Z')` to all three sub-calls so the hardcoded `checkedAt: '2026-11-08T20:00:00Z'` evidence stays inside the 15-minute freshness window; previously the wrong-target assertion masked the stale-evidence assertion.
- 20261108-e6r-production-hash: v1 normalizes `pg_proc.prosrc` by LF line endings plus boundary ASCII-whitespace removal, preserving internal UTF-8 bytes. Reviewed and production bodies both hash to `c409155d8f78931d904b08c040730565e3ad01852319710ff0bd9268e407a791`; the earlier test hash `5df6...` retained one trailing LF.
- 20261108-e6r-live-binding: live verification obtains resolver catalog data through the Management API read-only query endpoint and derives the local migration inventory from the reviewed Git commit; supplied artifacts are cross-checked, not release-authoritative on their own.
- 20261108-e6r-gates: superseding the implementation claim, PR #604 does not yet fail closed end to end. `release-migrations.mjs` is disconnected from promotion and accepts supplied refs/history files/pass booleans; a missing remote migration and an evidence-free production promote check both reproduced as success. Runtime smoke SHA enforcement is valid but does not supply schema parity.
- 20261108-egress-release-rule: the earlier plan recorded authorization for a matching test-validated production migration after final review, but repository scope rules do not make it standing permission for later tasks. The current review explicitly authorizes no merge/deploy; any future production execution must use current-task owner authorization plus exact reviewed SQL/history, verified target, real-role tests, bounded repairs and release postchecks.
- 20261108-egress-rollout: E6-R completed health verification contract:
  - Health endpoint returns `status: 'ok'`, build SHA, and timestamp.
  - Provenance smoke tests require HTTPS, status 'ok', exact expected build SHA, parseable and fresh timestamp.
  - Storefront builds now include standalone provenance via `resolveBuildSha()` helper and immutable artifact ZIP packaging; Hostinger workflow passes `EXPECTED_SHA`.
- 20261108-migration-parity-gate: removed `migration-parity-gate` job and its dependency from the active Hostinger workflow. Migration scripts (`scripts/ci/release-migrations.mjs` and helpers) retained as dormant reference tooling but explicitly not release-authoritative.
- 20261108-todo-update: updated `tasks/todo.md` to mark migration manifest selection, independent target verification, RPC introspection, CI evidence generation, and migration application as pending follow-up work.
## Blockers
- 20261108-e6r-production-parity: the supplied production evidence records 276 migrations but not the exact full version set; do not claim global version parity from count equality.
- 20261108-e6r-test-local-only: nine local-only migrations are outside the reviewed manifest, so test-project version parity remains `PENDING`.
- 20261108-committed-db-secret: `scripts/db/backup_db.mjs` contains a committed production database connection string. Treat it as exposed and handle removal plus credential rotation as separate security remediation.
- 20261108-local-secret-scan: the full scan fails on 25 non-staged findings (6 scanner fixture strings in an unrelated untracked `.kilo` worktree and 19 ignored `.next-turbo` artifacts); the scoped staged-addition scan found no suspicious credential patterns.
- 20261108-review-thread-resolution: five fixed/replied Cubic threads remain unresolved. GraphQL `resolveReviewThread` returns `FORBIDDEN`, and the browser session is unauthenticated; code and regression verification are complete.
## Resolved
- 20261108-e6r-access: owner-supplied connected Supabase evidence resolved resolver verification without requesting credentials; GitHub access works through the configured keychain after ignoring a stale environment token.
- 20261108-e6r-phase2-tests: 43 focused CI tests and 1,013 app tests pass; typecheck passes; lint passes with 3 existing React Compiler warnings. Final independent standards/spec/security review reports no findings, and all PR checks pass.
- 20261108-release-blocked-gate: finished health verification contract and removed the incomplete migration gate from the Hostinger workflow. Release parity foundation established: build SHA verification with timestamp, status 'ok', and HTTPS requirements.
- 20261108-workflow-cleanup: migrated hostinger workflow (YAML valid) with deprecated migration gate removed; deploy-production now correctly needs `[resolve-context, test-staging]`.
- 20261108-task-tracking: updated `tasks/todo.md` to reflect remaining E6-M/E6-B/E6-C/E6-D/E6-L/E6-H/E6-P/E6-K/E6-V/E6-S1/E6-S2/E6-S3 backlog.
## Next
- Owner resolve/approve the five addressed PR #605 threads. Keep merge and migration/release execution blocked until review requirements and recorded parity limitations are accepted or resolved.
