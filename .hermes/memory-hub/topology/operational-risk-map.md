# LuckyStorePOS Operational Risk Map

## Risk Classification

| Severity | Definition | Examples |
|---|---|---|
| CRITICAL | Data loss, financial impact, compliance breach | Duplicate sales, inventory corruption, service role key exposure |
| HIGH | Operational disruption, user-facing failure | Sync failure, RLS misconfiguration, offline queue loss |
| MEDIUM | Degraded experience, manual intervention | Stale eval harness, legacy field drift, telemetry gaps |
| LOW | Technical debt, future maintenance burden | Missing search_path, orphan grants, documentation gaps |

## Critical Risks

### C1: Duplicate Sale Replay (Inventory Corruption)
**Scenario**: Same `client_transaction_id` replayed twice creates duplicate sale, inventory decrement, and ledger posting.
**Current state**: Server-side idempotency exists via `inventory_movements.operation_id`, but `complete_sale` dedup is not independently verified in all paths.
**Evidence**: SOP scenario 4 (duplicate replay proof) is documented but not yet executed.
**Mitigation**: Run duplicate replay test with server-side SQL verification.

### C2: Service Role Key Exposure
**Scenario**: `SUPABASE_SERVICE_ROLE_KEY` leaked into frontend bundle or mobile app.
**Current state**: No detected exposure in current code.
**Prevention**: `scripts/governance/enforce-governance.cjs` does NOT check for this. Manual review required.
**Mitigation**: Audit all `.env*` files and build outputs for key presence.

### C3: Legacy Field Payload Drift
**Scenario**: Mobile app sends `product_id` instead of `item_id` to `complete_sale`, causing RPC failure or silent data corruption.
**Current state**: 15 references to `product_id` in active code. Edge function `create-sale/index.ts` still builds snapshots with `product_id`.
**Evidence**: `baseline.json` legacy_runtime_fields tracks 47 instances.
**Mitigation**: Complete field migration audit and fix remaining references.

## High Risks

### H1: Offline Queue Loss on App Restart
**Scenario**: Queue file not persisted correctly, or legacy v1 format ingested instead of quarantined.
**Current state**: Queue v2 schema enforced, legacy invalidation exists. But restart hydration test (SOP 2) not yet executed.
**Mitigation**: Execute SOP 2 with physical device.

### H2: RLS Gap After Migration
**Scenario**: New table created without RLS policies, or policy references renamed function.
**Current state**: 6 migrations specifically for RLS fixes (20260505-20260510 range). Recursive and remote policy fixes applied.
**Evidence**: `20260508000000_fix_critical_rls_gaps.sql` and `20260510120000_fix_recursive_rls_policies.sql` indicate previous gaps existed.
**Mitigation**: RLS must be verified after every migration that creates or modifies tables.

### H3: Replay Port Mismatch
**Scenario**: Developer runs replay expecting local Docker but gets port mismatch failure.
**Current state**: Replay defaults to 5432, Supabase local uses 54322. `replay.log` shows two recent failures from this exact issue.
**Mitigation**: Document `DATABASE_URL` requirement prominently. Consider auto-detection in replay script.

### H4: Dual Queue Divergence
**Scenario**: Transaction queue and event queue handle the same logical operation differently, causing state inconsistency.
**Current state**: Both queues exist with different semantics. No unified state machine.
**Mitigation**: Document which operations use which queue. Long-term: unify queue architecture.

## Medium Risks

### M1: Stale Eval Harness
**Scenario**: Eval scripts contain legacy schema references, cannot be used for operational proof.
**Current state**: `chaos-runner.cjs` and `reconciliation-eval.cjs` run in "static mode" without actual backend connection. `eval-runner.ts` has stale column names.
**Mitigation**: Repair eval harness or explicitly exclude from proof claims.

### M2: SECURITY DEFINER Search Path Drift
**Scenario**: Function without `SET search_path` is vulnerable to search path injection.
**Current state**: 6 functions still missing search_path per baseline.
**Evidence**: `security_definer_missing_search_path` category in baseline.json.
**Mitigation**: Apply `20260506040100_fix_empty_search_path_on_security_definer_functions.sql` or subsequent migration.

### M3: Orphan Privilege Accumulation
**Scenario**: Grant/revoke churn across migrations creates confusing privilege state.
**Current state**: 85+ orphan grants, 60+ orphan revokes tracked in baseline.
**Impact**: Confusing audit, potential over/under-privilege.
**Mitigation**: Baseline-driven governance check catches drift. Long-term: privilege cleanup migration.

## Low Risks

### L1: Missing Documentation
**Scenario**: `docs/architecture/offline-sync.md` is placeholder-level.
**Impact**: New developers cannot understand sync architecture from docs alone.

### L2: Dependency Entropy
**Scenario**: Forward dependency graph grows complex (222 chains).
**Impact**: Migration ordering mistakes possible.
**Mitigation**: Dependency graph visualization exists. Automated ordering validation via `build_migration_dependencies.cjs`.

## Risk Matrix Summary

| # | Risk | Severity | Status | Action |
|---|---|---|---|---|
| C1 | Duplicate sale replay | CRITICAL | Unverified | Execute SOP 4 |
| C2 | Service role exposure | CRITICAL | No evidence | Audit env |
| C3 | Legacy field drift | CRITICAL | 47 instances | Fix references |
| H1 | Queue loss on restart | HIGH | Unverified | Execute SOP 2 |
| H2 | RLS gap | HIGH | Patched | Verify per migration |
| H3 | Replay port mismatch | HIGH | Recurring | Document env var |
| H4 | Dual queue divergence | HIGH | Known gap | Document semantics |
| M1 | Stale eval harness | MEDIUM | Confirmed | Repair or exclude |
| M2 | Search path drift | MEDIUM | 6 functions | Apply fix |
| M3 | Orphan privileges | MEDIUM | Baseline tracked | Long-term cleanup |
