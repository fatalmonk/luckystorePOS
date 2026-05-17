# LuckyStorePOS Supabase Topology

## Runtime Topology

```
┌────────────────────────────────────────┐
│         Supabase Project               │
│  (Staging = authoritative runtime)     │
├────────────────────────────────────────┤
│ PostgreSQL 15+                         │
│ - 80+ migration files applied           │
│ - RLS policies per table              │
│ - RPC functions (70+)                   │
│ - Triggers for ledger/realtime        │
├────────────────────────────────────────┤
│ Auth                                    │
│ - JWT-based sessions                    │
│ - Role: authenticated / anon          │
├────────────────────────────────────────┤
│ Realtime                                │
│ - stock_levels subscriptions            │
│ - inventory_movements channel           │
├────────────────────────────────────────┤
│ Storage                                 │
│ - product images                        │
│ - receipt templates                     │
├────────────────────────────────────────┤
│ Edge Functions                          │
│ - create-sale/index.ts                  │
│ - import-inventory/index.ts             │
│ (⚠️ contains legacy `product_id` refs) │
└────────────────────────────────────────┘
```

## Migration Count and Ordering

**Total migrations**: 80 files
**Naming convention**: `YYYYMMDDhhmmss_description.sql`
**Ordering**: Lexicographic (chronological because of timestamp prefix)
**Last applied**: `20260511131100_serializable_rpcs.sql`

**Key migration clusters**:
1. `20260301*` - Baseline core tables, stock, RLS
2. `20260420*` - POS transactions, scanner, security
3. `20260423*` - Ledger, reconciliation, offline sync idempotency
4. `20260426*` - Domain RPCs, inventory observability
5. `20260427*` - Purchase v2, collections, stock ledger
6. `20260505*` - Tenant isolation RLS fixes
7. `20260506*` - Repairs, security hardening, revocations
8. `20260507*` - RLS gap fixes
9. `20260508*` - Critical RLS gaps
10. `20260510*` - Recursive RLS, remote RLS policies
11. `20260511*` - Inventory movements ledger, SERIALIZABLE RPCs

## RPC Function Topology

**Total RPC functions**: 70+
**Categories**:
- Sales: `complete_sale`, `void_sale`, `validate_sale_intent`
- Inventory: `adjust_stock`, `deduct_stock`, `set_stock`, `get_inventory_list`
- Purchase: `record_purchase_v2`, `post_draft_purchase_receipt`
- Ledger: `post_sale_to_ledger`, `process_pending_ledger_postings`, `validate_trial_balance`
- Reports: `get_sales_history`, `get_manager_dashboard_stats`, `get_close_risk_analytics`
- POS: `lookup_item_by_scan`, `search_items_pos`, `authenticate_staff_pin`
- Sync: `log_sale_sync_conflict`, `check_idempotency`

**Security posture**:
- 6 functions missing `SET search_path` (SECURITY DEFINER drift risk)
- 85+ orphan grants (grant signature mismatch with function evolution)
- 60+ orphan revokes (cleanup migrations created then partially reverted)

## RLS Policy Topology

**Critical RLS migrations**:
- `20260505000000_tenant_isolation_rls.sql` - Tenant isolation
- `20260506000005_security_hardening_revoke_anon_fix_search_path.sql` - Anon revocation
- `20260506010000_revoke_anon_security_definer_execute.sql` - Security definer lockdown
- `20260508000000_fix_critical_rls_gaps.sql` - Gap repair
- `20260510120000_fix_recursive_rls_policies.sql` - Recursive fix
- `20260510130000_fix_remote_rls_policies_manual.sql` - Remote policy fix

**Key helper functions**:
- `get_current_user_store_id()` - Store scoping
- `get_current_user_tenant_id()` - Tenant scoping

## Table Inventory (Core)

| Table | Ledger? | RLS? | Notes |
|---|---|---|---|
| `sales` | Append | Yes | Immutable after creation |
| `sale_items` | Append | Yes | Child of sales |
| `inventory_movements` | Append | Yes | `operation_id` dedup key |
| `stock_ledger` | Append | Yes | Replaces direct stock_levels mutation |
| `ledger_entries` | Append | Yes | Double-entry accounting |
| `purchase_orders` | Mutable | Yes | Draft -> posted lifecycle |
| `stock_levels` | **Protected** | Yes | Only via RPC, never direct |
| `offline_events` | Append | No | Local drift mirror |

## Connection Surfaces

| Surface | URL | Role | Usage |
|---|---|---|---|
| Admin web REST | `VITE_SUPABASE_URL` | `authenticated` | Queries, RPCs |
| Mobile REST | Supabase project URL | `authenticated` | RPCs, sync |
| Migration replay | `postgresql://...@localhost:5432` | `postgres` | Local Docker only |
| Eval harness | `VITE_SUPABASE_URL` | `service_role` | Backend scripts only |
