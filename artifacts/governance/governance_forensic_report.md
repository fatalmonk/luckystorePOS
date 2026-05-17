# Governance Forensic Report

Generated: 2026-05-17

## Status

- Overall: PARTIAL
- Evidence class: static repository inspection only
- Remote/staging parity: UNVERIFIED
- No migrations, RLS policies, triggers, or governance lineage were modified by this report.

## VERIFIED

- `inventory_movements.operation_id` is introduced as a unique column in `supabase/migrations/20260511130244_harden_inventory_movements.sql`.
- `adjust_inventory_stock`, `set_inventory_stock`, and `deduct_stock` contain idempotent replay branches keyed by `operation_id`.
- Critical inventory RPC definitions in `supabase/migrations/20260511131100_serializable_rpcs.sql` set `SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
- The inventory movement ledger has an append-only trigger named `enforce_append_only` in `supabase/migrations/20260511125509_inventory_movements_ledger.sql`.
- `stock_levels` RLS policies are tenant/store scoped in `supabase/migrations/20260508000000_fix_critical_rls_gaps.sql`.
- Existing governance enforcement checks for missing `SECURITY DEFINER` `search_path`, orphan privileges, forward dependencies, and legacy runtime field references in `scripts/governance/enforce-governance.cjs`.

## PARTIAL

- Schema fingerprinting exists in `scripts/governance/get_fingerprint.sql`, but live local-vs-staging parity depends on an externally generated staging artifact or DB credentials.
- RPC hashing exists as a broad `rpc_hash`, but prior tooling did not expose per-function missing/changed RPC reports.
- The pure replay model verifies duplicate delivery and payload mismatch behavior in memory only.

## FAILED

- Existing `scripts/replay-certification/convergence_test.ts`, `duplicate_delivery.ts`, `crash_recovery.ts`, and `certify.ts` disable the `inventory_movements` append-only trigger during setup.
- Existing replay certification scripts delete or reset ledger-adjacent rows directly instead of using isolated transaction rollback or scoped teardown.
- Existing `scripts/replay-certification/db.ts` shells SQL through command strings, which is not acceptable for production-grade DB verification tooling.
- Existing replay certification artifacts contain proof/certification wording that is not backed by real DB parity evidence.
- Existing `scripts/replay-certification/state_fingerprint.ts` references `qty_on_hand`, while the current inventory RPC path uses `stock_levels.qty`.

## UNVERIFIED

- Local-vs-staging RPC parity.
- Local-vs-staging trigger parity.
- Local-vs-staging RLS parity.
- Local-vs-staging schema fingerprint parity.
- Real Supabase Auth login and frontend/mobile runtime replay behavior.
- Concurrent deduction behavior under live staging workload.

## Replay Hazards To Track

- Several replay-adjacent functions use `now()` for timestamps. This is acceptable for audit timestamps but must be excluded from canonical replay hashes.
- Inventory and purchase RPCs derive operation IDs in some paths with `md5(...)::uuid`; this must remain deterministic and collision risk should be evaluated for the input domain.
- Legacy `inventory_items` references remain in historical migration text. Runtime parity must be proven against the actual applied database schema before any production claim.

## Required Next Evidence

1. Run RPC parity against local and staging with read-only DB URLs.
2. Run DB replay runner against an isolated staging test scope only after explicit staging mutation approval.
3. Compare DB state fingerprints before and after replay.
4. Compare DB replay result against the pure replay model.
5. Store machine-readable parity and replay outputs as governance artifacts.
