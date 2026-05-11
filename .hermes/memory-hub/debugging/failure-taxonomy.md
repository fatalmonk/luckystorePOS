# LuckyStorePOS Failure Taxonomy

## Recurring Failure Patterns

### F1: Replay Port Mismatch
**Signature**: `FATAL: Cannot connect to Postgres at postgresql://...@localhost:5432/postgres`
**Root cause**: Replay script defaults to port 5432, but Supabase local runs on 54322.
**Frequency**: Recurring (appears in `replay.log` twice: 2026-05-11T13:28:29Z and 2026-05-11T13:49:01Z)
**Lineage**: Docker local stack port change -> replay script hardcoded default -> connection failure
**Mitigation**: Always set `DATABASE_URL` environment variable explicitly.

### F2: Legacy Field Payload Rejection
**Signature**: RPC error: `column "product_id" does not exist` or silent data mismatch
**Root cause**: Schema evolved from `product_id` to `item_id`, but application code still references old field.
**Frequency**: Chronic (47 instances tracked in `baseline.json`)
**Lineage**: Schema rename migration applied -> application code not updated -> runtime field mismatch
**Affected files**:
- `apps/mobile_app/lib/shared/providers/pos_provider.dart` (14 references to `qty`, `product_id`, `active`)
- `apps/admin_web/src/lib/api/domains/reports.ts` (5 references to `qty`)
- `supabase/functions/create-sale/index.ts` (2 references to `product_id`, `qty`)
**Mitigation**: Complete field migration sweep. Use governance baseline to track remaining instances.

### F3: RLS Policy Regression
**Signature**: `new row violates row-level security policy` or `permission denied for table`
**Root cause**: New table created without RLS, or function renamed but policy still references old name.
**Frequency**: Recurring (6 dedicated fix migrations: 20260505-20260510)
**Lineage**: Migration creates table/function -> RLS not updated -> runtime permission failure
**Critical migrations**:
- `20260508000000_fix_critical_rls_gaps.sql` - Tenant isolation helper functions
- `20260510120000_fix_recursive_rls_policies.sql` - Self-referencing policies
- `20260510130000_fix_remote_rls_policies_manual.sql` - Remote project manual fix
**Mitigation**: Every migration creating/modifying tables must include RLS verification query.

### F4: Orphan Privilege Drift
**Signature**: Function exists but role cannot execute, or unexpected role has access.
**Root cause**: Function signature evolved across migrations, but grant/revoke references original migration.
**Frequency**: Chronic (85+ orphan grants, 60+ orphan revokes)
**Lineage**: Function created in M1 -> evolved in M2, M3... -> M1 grant now orphan but still in schema
**Mitigation**: Governance baseline tracks orphans. Long-term: privilege consolidation migration.

### F5: SECURITY DEFINER Search Path Absence
**Signature**: Potential search path injection (not yet exploited, but vulnerability present)
**Root cause**: SECURITY DEFINER function created without `SET search_path = ''`
**Frequency**: 6 functions still affected
**Lineage**: Function created before search path hardening requirement -> baseline captures as known issue
**Mitigation**: `20260506040100_fix_empty_search_path_on_security_definer_functions.sql` addresses this.

### F6: Offline Queue Schema Version Drift
**Signature**: Queue file parse error, or legacy v1 format loaded instead of quarantined.
**Root cause**: App encounters old queue file format during startup.
**Frequency**: Unknown (legacy invalidation exists but not runtime-proven)
**Lineage**: Queue format evolved v1 -> v2 -> startup invalidation logic added -> needs runtime verification
**Mitigation**: Execute SOP 7 (legacy queue invalidation) with physical device.

### F7: Eval Harness Staleness
**Signature**: Eval script fails with `column does not exist` or runs in static mode without backend.
**Root cause**: Schema evolved but eval scripts not updated.
**Frequency**: Confirmed (`eval-runner.ts` has stale `product_id`, `qty` references)
**Lineage**: Schema field rename -> eval scripts untouched -> harness unusable for operational proof
**Mitigation**: Either repair eval scripts or explicitly exclude from release readiness decisions.

### F8: Duplicate Sale on Replay
**Signature**: Two sale rows for one `client_transaction_id`, inventory double-decremented.
**Root cause**: Idempotency check bypassed or client generated new transaction ID on retry.
**Frequency**: Unknown (not yet tested)
**Lineage**: Offline sale queued -> sync triggered -> retry with same/different ID -> duplicate effect
**Mitigation**: Execute SOP 4 (duplicate replay proof) with server-side SQL verification.

## Failure Cluster Map

```
┌─────────────────────────────────────────┐
│         Connection Failures              │
│  F1 (port mismatch)                     │
│  F5 (search path -> potential injection) │
├─────────────────────────────────────────┤
│         Schema Evolution Failures        │
│  F2 (legacy field)                      │
│  F3 (RLS regression)                    │
│  F4 (orphan privilege)                  │
├─────────────────────────────────────────┤
│         Sync/Replay Failures             │
│  F6 (queue schema drift)                │
│  F8 (duplicate replay)                  │
├─────────────────────────────────────────┤
│         Tooling Failures                 │
│  F7 (eval harness stale)                │
└─────────────────────────────────────────┘
```

## Failure Severity by Operational Impact

| Failure | Data Loss | Financial Impact | Operational Stop | Recovery Complexity |
|---|---|---|---|---|
| F1 | No | No | Yes (local dev) | Low |
| F2 | Possible | Possible | Possible | Medium |
| F3 | No | No | Yes | Low |
| F4 | No | No | No | High |
| F5 | No | Potential | No | Low |
| F6 | Possible | Possible | Yes | Medium |
| F7 | No | No | No | Low |
| F8 | Yes | Yes | Yes | High |
