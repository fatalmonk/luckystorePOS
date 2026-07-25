# Revised Final Recommendation

This supersedes all prior `finalrecommendation.md` drafts and the Qwen strategy. It retains the threat ordering and hard stop/go gates, but rewrites the execution layer for parallel Day-0 tracks, a capped Phase 0, and thinner Phase 2 migrations.

No files were modified.

---

## 1. Final verdict

Lucky Store is not ready for multi-tenant production scale. Immediate priorities are:

1. Contain and rotate exposed credentials.
2. Make existing CI gates truthful.
3. Complete SELECT-only live database verification in one capped session.
4. Obtain explicit Phase 2 authorization before creating any migration.
5. Secure the anonymous order boundary.
6. Converge every sale client on the canonical `create_sale` contract.
7. Harden offline recovery and operational controls.

Repository replay remains distinct from live state. No report may claim current production functions, grants, policies, columns, backups, secrets, or deployments solely from repository evidence.

---

## 2. Credential exposure and mandatory response

### Confirmed report leakage

`docs/audit/infrastructure-audit.md` contains literal credential material instead of variable names only:

- A committed publishable Supabase key is printed at line 138 and discussed again at line 235.
- Literal staff login credentials are printed or repeated at lines 225, 514 and 551.
- A literal payment-gateway credential is printed or repeated at lines 227, 514 and 551.
- The underlying credential locations are identified as `apps/mobile_app/assets/app.env` and `.env.example`.

The values are intentionally omitted here.

### Classification

| Material | Classification | Required response |
|---|---|---|
| Bundled manager/admin passwords | Exposed credential — rotation required | Reset affected passwords, invalidate active sessions where supported, review authentication logs, remove from mobile assets |
| Staff account identifiers paired with passwords | Compromised credential set | Review account ownership and suspicious access; rotate associated credentials |
| Payment gateway store password | Exposed payment credential — urgent rotation required | Payment-owner approval, gateway rotation, staging validation, reconciliation monitoring |
| Literal committed Supabase publishable/anon key | Public-design key, but exposed project credential requiring re-issuance as precaution | Verify RLS first, issue a replacement if supported, update authorized clients, revoke the old key after rollout |
| Any browser-bundled deletion or Worker secret identified by the infrastructure report | Exposed server credential — rotation required | Remove from browser bundle, move authorization server-side, rotate Worker secret |
| Service-role, Cloudflare, R2, Meta or management tokens | Live verification required | Determine whether any literal value was committed or bundled; rotate immediately if confirmed |

A passing `node scripts/security/secret_scan.js` does not clear this incident. The command returned:

```
No secrets leaked in repository files.
```

The infrastructure audit demonstrates that the scanner misses `PASSWORD=` credentials and excludes audit/documentation paths. This is a confirmed false negative.

### Containment sequence

1. Do not circulate the unredacted infrastructure report.
2. Create a redacted replacement under separately authorized documentation scope.
3. Preserve the original only in access-controlled incident evidence if policy requires it.
4. Inventory every artifact containing `assets/app.env`, including released APKs.
5. Rotate staff credentials first, payment credentials second, then any exposed Worker/server keys.
6. Invalidate or retire downloadable mobile artifacts containing the credentials.
7. Review auth, payment and Worker logs for use after the earliest known exposure.
8. Add scanner regression fixtures using synthetic values only.
9. Never place real credential values in audit reports, tickets, prompts, logs or test fixtures.

The current read-only task does not authorize redacting the repository file or rotating external credentials.

---

## 3. Authoritative technical decisions

### Sale contract

- `create_sale` is the authoritative database sale command.
- Twelve-parameter `complete_sale` is a compatibility wrapper.
- Four-parameter `complete_sale` is a separate replay-visible overload. It cannot intercept twelve-parameter calls, but should eventually be removed through a forward convergence migration.
- Canonical duplicate handling returns `status: SUCCESS` with the existing sale, not `DUPLICATE`.
- Admin web is not currently contract-compatible:
  - it sends `quantity` instead of `qty`;
  - it sends `account_id` instead of `payment_method_id`;
  - it reads `batch_id`/`total_revenue` instead of `sale_id`/`total_amount`.
- Mobile fallback calls `record_sale`, which is absent after fresh repository replay because a later migration drops it. Its live existence and semantics require verification.

### Order concurrency and security

- The alleged inter-loop TOCTOU in `create_order_with_stock` is contradicted: `SELECT FOR UPDATE` locks persist through the containing transaction.
- Its security defects remain critical:
  - `SECURITY DEFINER` without fixed search path;
  - anonymous execution;
  - caller-controlled tenant/store;
  - direct anonymous order insertion;
  - no operation idempotency.

### CI

CI exists. Current coverage includes admin build, Flutter tests, Flutter analysis and secret scanning.

Confirmed gaps include:

- Admin typecheck and lint are non-blocking.
- The performance "threshold" is an unconditional success message.
- Another Flutter workflow masks test failures.
- No database replay/RPC/RLS gate.
- No storefront unit-test gate.
- Incomplete Worker and Edge Function coverage.
- Secret scanning has confirmed blind spots.

### Replay versus live

Replay-only risks include:

- Four-parameter fake-success overload.
- Broken `deduct_stock` column references.
- `competitor_prices` schema divergence.
- Broken replay-visible price function references.
- Missing remote migration bodies.

Live verification remains mandatory for effective functions, grants, RLS, columns, constraints, duplicates, backups and deployed secrets.

---

## 4. Corrected Qwen verification strategy

Qwen's layered strategy is retained, but the following documented inaccuracies are corrected:

| Qwen statement | Required correction |
|---|---|
| No CI workflow exists | CI exists; assess its incomplete and non-blocking coverage |
| `routine_name` selected from `pg_proc` | Use `p.proname`, schema join and `p.oid::regprocedure` |
| Four-param stub breaks all sale calls | It is a separate overload; test that it is absent from the desired converged catalog |
| Duplicate sale returns `DUPLICATE` | Assert `SUCCESS`, the same `sale_id`, one sale row and one stock decrement |
| Payment JSON uses `account_id` | Canonical `create_sale` uses `payment_method_id`, `amount`, `reference` |
| `deduct_stock` takes `p_item_id`, `p_details` | It takes `p_product_id`, `p_metadata` |
| Tests may omit optional RPC arguments | Contract tests must supply all twelve arguments explicitly |
| Disable RLS to demonstrate reliance | Prohibited. Test through authenticated/anonymous roles with RLS enabled |
| `db reset` followed by `db push` | Redundant; use an isolated `supabase db reset`, then run assertions |
| A broken function test should expect success after drift | Replay characterization may assert the known failure; remediation tests must assert correct behavior |
| Timer and Workmanager process the same queue record | Not established; test the confirmed persisted-syncing restart defect instead |
| CI should be created as a new file | Amend the existing workflows in authorized, separate PRs |

### Corrected test layers

1. **Phase 1 static/CI checks**
   - Secret-scanner regression tests.
   - CI workflow validation.
   - Blocking admin typecheck/lint/build.
   - Blocking Flutter analysis/tests.
   - No database or migration writes.

2. **Application contract tests**
   - Admin request JSON mapping.
   - Canonical response mapping.
   - Edge Function construction of all twelve arguments.
   - Mobile fallback and multi-tender behavior.
   - Malformed/unknown response handling.

3. **Disposable local replay tests — Phase 2 approval required**
   - Fresh migration replay.
   - Function signature/catalog assertions.
   - Search-path and grant assertions.
   - Schema-shape assertions.
   - No production connection.

4. **Disposable RLS/RPC integration tests — Phase 2 approval required**
   - Anonymous order rejection.
   - Cross-tenant/store rejection.
   - Canonical sale idempotency.
   - Payment identity constraint.
   - Stock concurrency.
   - RLS always remains enabled.

5. **Offline synchronization tests**
   - Response lost after commit, followed by idempotent `SUCCESS`.
   - Persisted syncing recovery after restart.
   - Malformed response must not mark a sale synced.
   - Retention must preserve unresolved financial operations.

6. **Operational tests**
   - Worker authentication and signature enforcement.
   - R2 upload/delete authorization.
   - Restore drill and stated RPO/RTO.
   - Post-deployment smoke tests only after explicit deployment approval.

### Corrected canonical sale test

A valid sale test must send:

```
p_store_id
p_cashier_id
p_session_id
p_items: [{ item_id, qty, unit_price, cost, discount }]
p_payments: [{ payment_method_id, amount, reference }]
p_discount
p_client_transaction_id
p_notes
p_snapshot
p_fulfillment_policy
p_override_token
p_override_reason
```

Assertions:

1. First call returns `SUCCESS` and durable sale identity.
2. Second call with the same transaction ID returns `SUCCESS` with the same sale ID.
3. Exactly one sale exists.
4. Stock changed exactly once.
5. Audit data was written once.
6. Invalid/empty transaction ID returns a structured rejection.
7. Insufficient stock does not create or decrement a sale.
8. Every test authenticates a properly seeded user.

---

## 5. Authorization boundary

Current `AGENTS.md` authorization permits implementation only in:

- `.github/workflows/ci.yml`
- `apps/mobile_app/pubspec.yaml`
- `.env.example`
- `package.json`
- `scripts/security/secret_scan.js`
- `docs/env-security.md`

Therefore:

- No migration may be created, edited, executed or tested through destructive replay under current authorization.
- `supabase/migrations/**` remains read-only.
- Application source, PosProvider, offline state management, auth flows and core business logic remain read-only.
- A proposed migration prompt is planning material only. It must clearly state that execution cannot begin until explicit Phase 2 approval.
- Phase 2 approval to create a migration is separate from approval to apply it.
- Production SELECT access, credential rotation and deployment each require their own explicit authorization.

---

## 6. Revised execution program

### Day 0 — three parallel tracks

Track | Owner | Deliverable | Blocks nothing
---|---|---|---
**Containment** | Human | Rotate staff → payment → server keys; redact infra audit; inventory APKs | Nothing technical
**Scanner PR** | Agent A | `secret_scan.js` + `docs/env-security.md`; synthetic fixtures; redacted output | Nothing
**CI truth PR** | Agent B | Blocking typecheck/lint/build/analyze/tests; remove fake threshold | Nothing

Key rule: never block CI work on rotation. Scanner and CI PRs can merge while credential rotation is ongoing.

### Week 1 — Phase 0 evidence pack (cap: one session)

SELECT-only live catalog — done when all boxes exist:

1. Function catalog: `create_sale`, `complete_sale` overloads, `create_order_with_stock`, `adjust_stock`, `deduct_stock`, `record_sale`
2. For each: oid signature, search_path, grants (anon/auth/service)
3. RLS: orders INSERT, stock_levels SELECT, categories anon policies
4. Columns: stock_levels, competitor_prices, sale_payments uniqueness
5. Applied migrations vs repo (flag empty `sync_remote` stubs)
6. Backup/PITR and Worker signature flags — yes/no only, no secrets

Exit: freeze memo + sale contract one-pager. Then unlock Phase 2/app PRs.

### After freeze — parallel authorized work

**DB lane**
- **Migration A**: order boundary only (PR2)
- **Migration B**: search_path on verified DEFINER set
- **Migration C**: sale store/cashier binding

One migration per PR. No historical edits. Local disposable tests only.

**App lane**
- Admin `pos.ts` adapter (PR3) — independent of Migration A
- Remove mobile `record_sale` fallback after live check
- Thin stuck-SYNCING recovery hotfix (do not wait for queue unification)

Do not overlap mobile + admin sale files in the same week.

### Efficiency rules

- One owner per PR; acceptance criteria = merge checklist; forward-only migrations.
- Freeze the contract in writing before adapter/mobile changes so tests share one oracle.
- Coordinate secret removal from assets with rotation — remove after rotate, never before.
- Wait for Phase 0 to start scanner/CI. Don't mega-migrate Phase 2. Don't disable RLS for tests.
- Defer queue unification before stuck-sync recovery + idempotent SUCCESS handling.
- Claim live production state from repo replay. Re-check after every convergence migration.

---

## 7. Recommended start order (this week)

| # | Action | Auth | Why first |
|---|---|---|---|
| 1 | Human credential rotation + redact `infrastructure-audit.md` | Human | Stops active exposure |
| 2 | PR: harden `secret_scan.js` (redact, PASSWORD=, scan docs) | Phase 1 | Prevents recurrence; tiny PR |
| 3 | PR: make CI gates truthful / blocking | Phase 1 | Parallel-safe with scanner |
| 4 | Phase 0 live SELECT evidence pack | Explicit live read auth | Unlocks DB/app work |
| 5 | Freeze sale contract one-pager | None (doc) | Unblocks admin + mobile adapters |
| 6 | PR2 order boundary migration | Phase 2 | Highest confirmed internet DB risk |
| 7 | PR3 admin sale adapter | App/core | Parallel with PR2 after freeze |

After PR2+PR3: Migration B, Migration C, mobile fallback removal, stuck-SYNCING hotfix.

---

## 8. First three authorized/approval-gated PRs

### PR 1 — current Phase 1: secret scanner hardening

Objective: prevent another false-negative credential report.

Files:
- `scripts/security/secret_scan.js`
- `docs/env-security.md`
- `package.json` only if a focused test command is needed

Acceptance criteria:
- Detects synthetic `PASSWORD=` assignments, private keys, JWT-like material and key provider credentials.
- Scans documentation and CI files.
- Never prints matched values.
- Existing allowlisted placeholders remain supported.
- Repository scan becomes blocking.

Tests:
- Synthetic positive and negative fixtures without real credentials.
- `node scripts/security/secret_scan.js`.

Rollback: revert the scanner/docs PR.
Parallel-safe: yes, if CI workflow is owned by a different agent.
Authorization: current Phase 1.

### PR 2 — database security: order boundary

Objective: prevent caller-selected cross-tenant orders and stock mutation.

Files:
- One new convergence migration.
- Focused disposable integration tests.
- Storefront boundary only if the validated design requires it.

Dependencies: Phase 0 live catalog and explicit Phase 2 approval.

Acceptance criteria:
- Fixed search path.
- No direct anonymous table insert.
- Caller cannot select an arbitrary tenant/store.
- Positive quantities and duplicate-item handling are enforced.
- Retried order requests are idempotent.
- Existing row-lock protection is preserved.

Tests:
- Complete function arguments.
- Anonymous and cross-tenant rejection.
- Concurrent stock protection.
- Duplicate request returns the existing order.
- RLS stays enabled.

Rollback: reviewed forward migration.
Parallel-safe: no other order-contract migration concurrently.
Authorization: explicit Phase 2 database/core authorization.

### PR 3 — application integrity: admin sale adapter

Objective: conform admin POS to canonical sale input and output.

Files:
- `apps/admin_web/src/lib/api/domains/pos.ts`
- Focused tests and shared API type only as necessary

Dependencies: live contract verification and application/core authorization.

Acceptance criteria:
- Converts `quantity` → `qty`.
- Converts `account_id` → `payment_method_id`.
- Sends all twelve parameters.
- Reads `sale_id`, `sale_number`, `total_amount`.
- Treats repeated `SUCCESS` as idempotent completion.
- Preserves conflict/rejection details.

Tests:
- Exact request payload.
- Exact response mapping.
- Repeated-success idempotency.
- Conflict, rejection, partial fulfillment and malformed response.

Rollback: revert the adapter/test PR.
Parallel-safe: yes after the sale contract is frozen; must not overlap mobile sale-contract work.
Authorization: app/core business-logic approval.

---

## 9. Immediate stop/go decisions

**GO now under Phase 1:**
- CI truthfulness.
- Secret scanner hardening.
- Environment documentation.
- Removal of bundled credentials from allowed configuration files, coordinated with human rotation.

**PLAN ONLY:**
- Database convergence migrations.
- Admin/mobile application fixes.
- Offline state changes.
- Wishlist/Worker changes.
- Auth-flow changes.

**STOP pending explicit authorization:**
- Any migration creation or replay.
- Any live database connection.
- Credential rotation through external systems.
- Production deployment.
- Package installation or dependency upgrade without review.
- RLS disabling.
- Editing historical migrations.

---

## 10. Critique summary

| Dimension | Score | Why |
|---|---|---|
| Threat prioritization | 9 | Credentials → CI truth → live verify → order boundary → sale contract is the right order. |
| Technical correctness | 8.5 | Corrects stub/overload, TOCTOU, DUPLICATE vs SUCCESS, and Qwen false claims. |
| Authorization discipline | 9 | Clear Phase 1 vs Phase 2 vs human-owned rotation. Prevents unauthorized migrations. |
| PR sizing | 7 | PR1/PR3 are good. PR2 is right objective but Phase 2 still packs 5 migrations into one phase in the original draft. |
| Replay vs live rigor | 9 | Best insight in the corpus: no `productim` repo alone. |
| Execution smoothness | 6.5 | Phase 0 checklist is thin; parallel tracks under-specified; STOP on package install is over-broad. |
| Coverage completeness | 8 | Covers DB, CI, offline, Workers. Images/R2 unauth upload could move earlier after Phase 0. |

### Critical weaknesses addressed in this revision

1. **Phase 0 is a bottleneck without a deliverable shape** → Fixed: one SELECT-only evidence pack with redacted output and a freeze checklist. Capped to one working session.
2. **Containment and Phase 1 are conflated in practice** → Fixed: three parallel Day-0 tracks (human rotation, scanner PR, CI truth PR). Never block CI work on rotation.
3. **Phase 2 is one phase, five migrations** → Fixed: Migration A = order boundary only (PR2). Migration B = search_path batch. Migration C = sale caller binding. Gate each on its own tests.
4. **Offline recovery is scheduled too late relative to risk** → Fixed: keep Phase 4 after contract freeze, but add a thin "recover stuck syncing" hotfix PR as soon as app auth is granted.
5. **"First three PRs" mixes three authorization lanes** → Fixed: after live catalog, launch PR2 and PR3 in parallel under separate owners. Only shared gate: freeze the sale contract one-pager.
6. **"STOP on package installation" is over-broad** → Fixed: blocks package installs / dependency upgrades without review, not all npm/flutter package use.

### Bottom line

Keep the plan's priorities and gates; rewrite the execution layer for parallel Day-0 tracks, a capped Phase 0 pack, and thinner Phase 2 migrations. That turns an 8/10 strategy into a shippable program.

The repository remained unchanged. `git diff` showed only pre-existing user changes in `.gitignore`, `AGENTS.md`, and `CLAUDE.md`; the Phase 1 target-file diff was empty.
