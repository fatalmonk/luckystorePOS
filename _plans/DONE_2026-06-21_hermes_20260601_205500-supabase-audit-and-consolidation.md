# Supabase Backend Audit & Consolidation Plan (UPDATED)

**Date:** 2026-06-01
**Scope:** Full inspection of `supabase/migrations/`, RPC functions, frontend API layer, and architecture
**Goal:** Simplify, consolidate, fix bugs, unify sale creation across admin + mobile

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Total migrations | 136 files |
| Sync placeholders (SELECT 1) | 11 files |
| Invalid timestamps (hh>23) | 5 files |
| Unique RPC functions | ~80 defined, ~30 actively called |
| Functions with 3+ overwrites | 15 |
| `get_inventory_list` overwrites | 7 |
| `as any` TypeScript casts | 2 (type drift symptoms) |
| Missing mobile RPCs | 5 (daily reports + refund — broken on mobile) |
| Dropped RPC still called | 1 (`record_sale` — DROP'd but mobile calls it) |

---

## 🔴 ROOT CAUSE: Web POS Broken

`create_sale` (12-param, defined in `20260423224500`) has **2 column name bugs**:

1. **`i.active`** (line 153, 160) — column is `is_active` on production DB
2. **`sl.qty_on_hand`** (line 153, 188, 190, 197) — column is `qty` on `stock_levels` table

These cause SQL runtime errors when admin web creates a sale. The function has real business logic (idempotency check, fulfillment policy, override token support) but fails on column references.

`complete_sale` (4-param in final dedupe) is a **stub** — but admin doesn't call it.

**Key finding:** `record_sale` was DROP'd in `20260506100000`. Mobile still calls it. The edge function fallback saves mobile, but the direct path is dead.

**Design goal:** Both admin and mobile should call ONE unified sale function.

---

## Key Findings

### 1. Migration Organization

**Problems:**
- 11 `sync_remote_migration` placeholders — schema changes via Studio without migration files
- `bootstrap.sql` (2023) + bridge + baseline — triple overlap on 9 tables
- 5 migrations with impossible timestamps (hh=30, 24)
- High policy churn: 3 policies recreated 4+ times
- `DROP TYPE ... CASCADE` in `stock_transfers.sql`

**Decision:** Do NOT squash to 1 file (136→1 is risky). Rename broken timestamps, remove stale placeholders, create a consolidation boundary.

### 2. RPC Function Redundancy

**Problems:**
- `get_inventory_list` — 7 overwrites across different migrations
- 6+ orphaned GRANT statements on old function signatures (guarded but noise)
- `i.active` vs `i.is_active` column mismatch converged after 3 fix migrations, **except in `create_sale` which was never fixed**

### 3. Frontend API Mismatches

**Problems:**
- **5 missing RPCs (mobile only):** `get_daily_sales_summary`, `get_payment_breakdown`, `get_top_products`, `get_hourly_sales`, `process_refund`
- `void_sale` sends `p_idempotency_key` that DB doesn't accept
- `record_sale` call in mobile targets a DROP'd function
- `as any` casts hiding type drift (2 occurrences)
- Mixed API patterns

### 4. Supabase Best Practice Gaps

| Gap | Current | Target |
|-----|---------|--------|
| Type generation | Manual/partial `as any` | `npx supabase gen types` |
| RLS indexing | Unknown if indexed | Audit + index all policy columns |
| `auth.uid()` wrapping | Not using `(select auth.uid())` | InitPlan caching pattern |
| `security definer` search_path | `SET search_path = public, pg_temp` | `SET search_path = ''` + full qualify |
| Views | Not used | Add `security_invoker=true` views |
| TypeScript types | Not auto-generated | CI cron for daily sync |

---

## Implementation Plan

### Phase 0: Pre-Consolidation Renames (Safe, 1 PR)

**Task 0.1:** Rename 5 invalid timestamps
- `20260420300000_` → `20260420203000_`
- `20260420300001_` → `20260420203001_`
- `20260420300002_` → `20260420203002_`
- `20260423240000_` → `20260423235900_`
- `20260426240001_` → `20260426235901_`

**Task 0.2:** Remove 11 `sync_remote_migration` placeholder files

---

### Phase 1: BLOCKER — Fix POS (1 PR, CRITICAL)

#### Task 1.0: Fix `create_sale` Column Bugs

**Migration:** `20260601000001_fix_create_sale_column_names.sql`

Fix 2 bugs in the `create_sale` function body:
```sql
-- BUG 1: i.active → i.is_active
SELECT i.id, i.name, i.is_active AS active, i.price, COALESCE(sl.qty, 0) AS qty_on_hand

-- BUG 2: sl.qty_on_hand → sl.qty (already fixed via alias above)
```

And fix all downstream references in the function (~500 lines of logic).

**Critical path — this unblocks the entire web POS.**

#### Task 1.1: Unify Sale Creation — One Function for Both Apps

**Migration:** `20260601000002_unify_sale_function.sql`

1. Fix `create_sale` (already done in 1.0)
2. Mobile switches to `create_sale` — needs same 12 params
3. Remove/comment `record_sale` definitively
4. Update mobile API layer

**Frontend files changed:**
- `apps/mobile_app/lib/shared/providers/pos_provider.dart` — call `create_sale` instead of `record_sale`
- `apps/admin_web/src/lib/api/domains/pos.ts` — already correct (calls `create_sale`)
- Types: regenerate after fix

#### Task 1.2: Create 5 Missing Mobile RPCs

**Migration:** `20260601000003_mobile_missing_rpcs.sql`

1. `get_daily_sales_summary(p_date date, p_store_id uuid)`
2. `get_payment_breakdown(p_date date, p_store_id uuid)`
3. `get_top_products(p_date date, p_store_id uuid, p_limit int DEFAULT 10)`
4. `get_hourly_sales(p_date date, p_store_id uuid)`
5. `process_refund(p_sale_id uuid, p_items jsonb, p_reason text)`

---

### Phase 2: RPC Consolidation — Single Source of Truth (1 PR)

#### Task 2.1: RPC Master Snapshot

Create `20260601000010_rpc_master_snapshot.sql` with ONE definitive definition per critical function:
- `create_sale` — 12 params (redundant with Phase 1 fix; this is the canonical version)
- `get_inventory_list` — 1 param
- `search_items_pos` — 2 params
- `lookup_item_by_scan` — 2 params
- `authenticate_staff_pin` — 3 params
- `get_pos_categories` — 1 param
- `record_customer_payment` — latest version
- `record_purchase_v2` — latest stable
- `complete_sale` — remove stub OR make it delegate to `create_sale`

#### Task 2.2: Clean Up Orphaned GRANT/REVOKE

Comment out all orphaned GRANT on old function signatures in ~8 migration files.

---

### Phase 3: Frontend API Standardization

#### Task 3.1: Generate TypeScript Types

```bash
npx supabase gen types typescript --project-id "$PROJECT_REF" > database.types.ts
```

Remove `as any` casts from:
- `apps/admin_web/src/lib/api/domains/inventory.ts`
- `apps/admin_web/src/lib/api/domains/products.ts`

#### Task 3.2: Migrate Mobile to Unified Sale Function

Update `pos_provider.dart` to call `create_sale` instead of `record_sale`. Map mobile's field names to the 12-param signature. Pass `NULL` defaults for session, discount, override params.

#### Task 3.3: Fix `void_sale` Parameter Mismatch

Add `p_idempotency_key` to DB function or remove from frontend.

#### Task 3.4: Standardize CRUD Pattern

Create views for common query patterns:
```sql
CREATE VIEW public.v_products_with_categories
WITH (security_invoker = true)
AS SELECT i.*, c.name AS category_name
FROM items i LEFT JOIN categories c ON c.id = i.category_id;
```

---

### Phase 4: Best Practice Alignment

#### Task 4.1: RLS Indexing Audit
```sql
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON public.items(tenant_id);
-- ... per policy analysis
```

#### Task 4.2: Fix `auth.uid()` Wrapping for Performance
```sql
-- Before
USING (auth.uid() = user_id)
-- After
USING ((SELECT auth.uid()) = user_id)
```

#### Task 4.3: Fix `security definer` search_path
`SET search_path = public, pg_temp` → `SET search_path = ''` + fully qualify.

#### Task 4.4: TypeScript Type Generation CI
GitHub Action: `npx supabase gen types` daily, create PR on diff.

#### Task 4.5: Fix `DROP TYPE CASCADE` in stock_transfers
Replace with DO-block idempotent CREATE TYPE.

---

### Phase 5: RLS Policy Cleanup

#### Task 5.1: Missing `TO service_role` policies
Add explicit service_role bypass for tables missing them.

#### Task 5.2: Fix FK mismatch (`deleted_by = auth.uid()` vs public.users.id)
Verify column layout and fix via subquery pattern.

---

## Files Likely Modified

### New Migrations (9 files)
```
supabase/migrations/20260601000001_fix_create_sale_column_names.sql
supabase/migrations/20260601000002_unify_sale_function.sql
supabase/migrations/20260601000003_mobile_missing_rpcs.sql
supabase/migrations/20260601000010_rpc_master_snapshot.sql
supabase/migrations/20260601000015_standard_views.sql
supabase/migrations/20260601000019_fix_void_sale_idempotency.sql
supabase/migrations/20260601000020_index_rls_columns.sql
supabase/migrations/20260601000022_optimize_rls_auth_uid.sql
supabase/migrations/20260601000025_security_definer_searchpath.sql
supabase/migrations/20260601000030_service_role_bypass_policies.sql
```

### Patched Migrations (~12 files, comment-only)
```
20260420100000_pos_transactions.sql
20260423123000_offline_sync_idempotency.sql
20260423193000_transaction_snapshot_safety_gate.sql
20260423201000_centralize_pricing_in_complete_sale.sql
20260423201500_server_authoritative_override_and_partial.sql
20260423213000_ledger_and_daily_reconciliation.sql
20260423224500_ledger_posting_engine_and_period_close.sql
20260327200002_stock_transfers.sql
20260506000002_repair_missing_domain_functions.sql
```

### Frontend Files
```
apps/admin_web/src/lib/database.types.ts (regenerated)
apps/admin_web/src/lib/supabase.ts (add generic type)
apps/admin_web/src/lib/api/domains/products.ts (remove as any)
apps/admin_web/src/lib/api/domains/inventory.ts (remove as any)
apps/admin_web/src/lib/api/domains/sales.ts (fix void_sale params)
apps/admin_web/src/lib/api/domains/expenses.ts (standardize)
apps/admin_web/src/lib/api/domains/dailySales.ts (standardize)
apps/admin_web/src/lib/api/domains/competitorPrices.ts (use views)
apps/mobile_app/lib/shared/providers/pos_provider.dart (use create_sale)
apps/mobile_app/lib/screens/daily_reports_screen.dart (use new RPCs)
```

### CI/CD
```
.github/workflows/update-types.yml (new)
package.json (add update:types script)
```

---

## Deployment Order

| # | Phase | Priority | Risk | Depends On |
|---|-------|----------|------|------------|
| 0 | Rename timestamps + remove placeholders | Safe | Low (filename only) | None |
| **1.0** | **Fix create_sale column bugs** | **🔴 CRITICAL** | **Medium (RPC change)** | None |
| 1.1 | Unify sale function | 🔴 Critical | Medium (mobile change) | 1.0 |
| 1.2 | Create missing mobile RPCs | 🔴 Critical | Low (new functions) | 1.0 |
| 2 | RPC master snapshot | 🟡 Important | Low (OR REPLACE) | 1.0, 1.2 |
| 3 | Frontend API standardization | 🟡 Important | Medium (migration) | 2 |
| 4 | Best practice alignment | 🟢 Standard | Low | None |
| 5 | RLS cleanup | 🟢 Standard | Low | None |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `create_sale` fix changes a running function — wrong column type | Sale creation errors | Test on staging first |
| Removing 11 placeholders breaks `supabase migration list` sync | CI errors | Only remove after all branches merged to main |
| Mobile `record_sale` → `create_sale` migration misses optional params | Mobile sale creation broken | Map all 12 params with NULL defaults |
| `DROP TYPE CASCADE` already dropped | Silent data loss | Run diagnostic: `SELECT * FROM stock_transfers LIMIT 5` |

## Open Questions (Answered)

1. ✅ **Is `complete_sale` actually broken on web dashboard?** YES — `complete_sale` is a stub in final dedupe, but admin calls `create_sale` (different function). `create_sale` has column name bugs (`i.active` vs `i.is_active`, `sl.qty_on_hand` vs `sl.qty`) which break the web POS.

2. ❓ Does the edge function for `record_sale` on mobile actually work? (Verify logs before migrating to `create_sale`.)

3. ❓ Is there a `supabase/seed.sql` file for local dev? (Not found — may need to create one.)

4. ❓ Current DB version — confirm with:
   ```sql
   SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
   ```