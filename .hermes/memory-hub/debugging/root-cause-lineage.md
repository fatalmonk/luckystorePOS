# LuckyStorePOS Root-Cause Lineage

## L1: Port Mismatch Lineage

```
2026-05-11T11:55:24Z  SUCCESS: replay against local Docker postgres:5432
  -> 2026-05-11T13:28:29Z  FAILURE: replay against localhost:5432 (no postgres running)
  -> 2026-05-11T13:49:01Z  FAILURE: replay against 127.0.0.1:54322 (supabase local, but script expects 5432)
```

**Root cause**: `replay.sh` hardcodes `DATABASE_URL` default to `localhost:5432`.
**Environment drift**: Supabase CLI changed default port from 5432 to 54322.
**Fix**: Set `DATABASE_URL` explicitly, or auto-detect running PostgreSQL.

## L2: Legacy Field Evolution Lineage

```
20260420000000_sku_standardization.sql  Introduced item_id, quantity, is_active
  -> Application code partially updated
  -> 2026-05-11 baseline.json captures 47 remaining legacy references
    -> pos_provider.dart: 14 references (qty, product_id, active)
    -> reports.ts: 5 references (qty)
    -> create-sale/index.ts: 2 references (product_id, qty)
    -> reconciliation_adjustment.dart: 1 reference (product_id)
    -> auth_provider.dart: 1 reference (full_name)
```

**Root cause**: Schema migration applied without coordinated application code update.
**Why it persists**: Application continues to work because RPC functions handle field mapping internally, masking the drift.
**Risk**: If RPC internal mapping changes or edge function path is used directly, payload mismatch causes runtime failure.

## L3: RLS Fix Chain Lineage

```
20260505000000_tenant_isolation_rls.sql  Initial tenant isolation
  -> 20260506000005_security_hardening_revoke_anon_fix_search_path.sql  Revoke anon + fix search path
    -> 20260506010000_revoke_anon_security_definer_execute.sql  Further revoke anon
      -> 20260506030000_restrict_authenticated_sensitive_functions.sql  Restrict authenticated
        -> 20260506040000_revoke_anon_on_pos_functions.sql  POS-specific revocation
          -> 20260508000000_fix_critical_rls_gaps.sql  Fix gaps from above revocations
            -> 20260510120000_fix_recursive_rls_policies.sql  Fix self-referencing policies
              -> 20260510130000_fix_remote_rls_policies_manual.sql  Manual remote fix
```

**Root cause**: Security hardening migrations were too broad, breaking legitimate access.
**Pattern**: Revoke -> discover breakage -> fix -> discover more breakage -> fix again.
**Why it matters**: Each fix migration indicates a previous regression that could have blocked operations.

## L4: Complete_sale RPC Evolution Lineage

```
20260420100000_pos_transactions.sql  Initial: complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text)
  -> 20260423123000_offline_sync_idempotency.sql  + client_transaction_id
    -> 20260423201000_centralize_pricing_in_complete_sale.sql  + discount_amount, unit_cost
      -> 20260423201500_server_authoritative_override_and_partial.sql  + override fields
        -> 20260423213000_ledger_and_daily_reconciliation.sql  + ledger integration
          -> 20260423224500_ledger_posting_engine_and_period_close.sql  + posting engine
            -> 20260423232000_production_hardening.sql  + hardening
              -> Current: 12-parameter signature
```

**Root cause**: Feature additions accumulated in same function instead of decomposition.
**Pattern**: Each feature adds parameters -> function grows -> harder to reason about -> harder to test.
**Risk**: Signature complexity makes idempotency verification difficult.

## L5: Governance Baseline Accumulation Lineage

```
Initial governance framework created
  -> Baseline generated 2026-05-11T13:09:53Z
    -> Captures known issues as "accepted" (not "to fix")
      -> 6 search_path issues, 85 orphan grants, 60 orphan revokes, 47 legacy fields
        -> Baseline becomes documentation of technical debt, not action plan
```

**Root cause**: Baseline treats known issues as static facts rather than tracked remediation items.
**Risk**: Issues accumulate in baseline without ever being resolved.
**Mitigation**: Baseline should include remediation target dates or be periodically purged.
