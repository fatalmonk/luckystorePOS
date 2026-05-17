# LuckyStorePOS Governance Enforcement Architecture

## Governance Pipeline

```
supabase/migrations/*.sql
  -> build_function_registry.cjs
  -> build_migration_dependencies.cjs
  -> build_ownership_graph.cjs
    -> artifacts/governance/*.json
      -> enforce-governance.cjs --baseline scripts/governance/baseline.json
        -> governance-enforcement-report.json
```

## Build Commands

```bash
npm run governance:build    # Generate artifacts
npm run governance:check    # Compare against baseline
npm run governance:baseline # Update baseline (manual approval required)
```

## Artifact Registry

| Artifact | File | Content |
|---|---|---|
| Function signatures | `function_signature_registry.json` | All RPC function signatures indexed by migration |
| Dependencies | `migration_dependency_graph.json` | Forward/backward dependency chains |
| Ownership | `object_ownership_graph.json` | Table -> creating migration mapping |

## Baseline Content

**Location**: `scripts/governance/baseline.json`
**Generated**: 2026-05-11T13:09:53Z
**Categories**:

### 1. `security_definer_missing_search_path`
6 RPC functions missing `SET search_path` on SECURITY DEFINER:
- `close_pos_session(...)`
- `create_reminder(...)`
- `delete_reminder(...)`
- `get_session_summary(...)`
- `get_upcoming_reminders(...)`
- `update_reminder(...)`

**Risk**: Search path injection vulnerability. Mitigation in progress via `20260506040100_fix_empty_search_path_on_security_definer_functions.sql`.

### 2. `orphan_function_privileges`
85+ grants where migration file name doesn't match function's current signature. Indicates:
- Function was evolved in later migration
- Original grant migration is now "orphan" - no longer authoritative
- Actual grant lives in later migration

**Example**: `complete_sale` has 7 different grant signatures across 7 migrations, but only the latest is authoritative.

### 3. `orphan_revoke`
60+ revocations that were created in one migration then partially addressed or reverted in later migrations. Indicates:
- Security hardening attempts
- Over-broad revocations that broke legitimate access
- Subsequent repair migrations restored access

**Example chain**:
- `20260506010000_revoke_anon_security_definer_execute.sql` - Revoked anon on many functions
- `20260506040000_revoke_anon_on_pos_functions.sql` - Further narrowed POS function access
- `20260506000005_security_hardening_revoke_anon_fix_search_path.sql` - Fixed search path + some revokes

### 4. `forward_dependencies`
222 dependency chains showing which migration depends on which earlier migration's objects.

**Critical chains**:
- `baseline_core_tables.sql` -> 15 downstream migrations (tables created here used everywhere)
- `stock_levels_realtime_and_rpc.sql` -> `add_stock_functions.sql` (RPC evolution)
- `complete_sale` -> evolved through 7 migrations ending at `production_hardening.sql`

### 5. `legacy_runtime_fields`
47 field references to renamed schema fields still present in active code:

| Legacy Field | Current Field | Locations |
|---|---|---|
| `product_id` | `item_id` | `pos_provider.dart` (3x), `reconciliation_adjustment.dart`, `create-sale/index.ts` |
| `qty` | `quantity` | `pos_provider.dart` (11x), `reports.ts` (5x), `types.ts`, `rpc.ts`, `create-sale/index.ts` |
| `active` | `is_active` | `pos_provider.dart` (3x) |
| `full_name` | `name` | `auth_provider.dart`, `pos_provider.dart` (2x) |

## Enforcement Rules

**What governance prevents**:
1. Unauthorized migration modification (hash mismatch)
2. Missing artifact regeneration (stale registry)
3. Orphan privilege accumulation (security drift)

**What governance does NOT prevent**:
1. Logic bugs in RPC functions
2. RLS bypass via service role
3. Legacy field usage in application code

## Governance Limitations

1. **No runtime enforcement** - Governance is static analysis only
2. **No automatic remediation** - Violations require manual approval
3. **Baseline is point-in-time** - Does not capture operational drift after baseline
