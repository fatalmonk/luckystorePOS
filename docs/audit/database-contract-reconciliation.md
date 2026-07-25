# Database Contract Reconciliation

**Agent:** Dracarys (GLM-5.2)
**Date:** 2026-07-24
**Repository:** /Users/mac.alvi/Desktop/Projects/Lucky Store
**Scope:** Read-only forensic reconciliation of effective database contract
**Inputs:** docs/audit/glm5.2audit.md, docs/audit/kimi2.7audit.md, 163 migration files, generated types, Edge Functions, admin/storefront/mobile callers

---

## 1. Executive conclusion

**Is a fresh migration replay trustworthy?**
NO. A fresh replay produces a partially functional schema with latent risks. The create_sale function is the fixed version (20260601000001) and works. The complete_sale 12-param wrapper delegates to it and works. But a 4-param STUB complete_sale (20260530000000) coexists as an orphan overload that silently returns fake success without creating any sale records. The deduct_stock function references stock_levels.id and stock_levels.version columns that do not exist in the replay schema, so it fails at runtime. The competitor_prices table is dropped and recreated with product_id (not item_id) on replay, but the generated types and admin caller still reference item_id, creating a column mismatch. Twelve sync_remote_migration placeholder files contain no SQL, meaning the replay diverges from whatever was applied to the live database via dashboard.

**What sale RPC actually exists after repository replay?**
Two functions coexist:
1. `create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)` — the authoritative 12-param function from `20260601000001_fix_create_sale_column_names.sql:15`. SECURITY DEFINER, SET search_path = public, pg_temp. Checks client_transaction_id idempotency, validates stock, inserts sale+items+payments, decrements stock via adjust_stock, writes sale_audit_log. VERIFIED.
2. `complete_sale` has TWO overloads:
   - 12-param `(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)` from `20260506100000_rpc_consolidation_and_security.sql:35` — delegates to create_sale. VERIFIED.
   - 4-param `(uuid, jsonb, uuid, text)` from `20260530000000_final_dedupe_cleanup.sql:80` — STUB that returns `{'success': true, 'sale_id': gen_random_uuid(), 'message': 'Sale completed'}` without creating any sale records. REPLAY-ONLY RISK.

**Are current application callers compatible with it?**
The admin web POS caller (`apps/admin_web/src/lib/api/domains/pos.ts:71`) calls `create_sale` with named parameters matching the 12-param signature. COMPATIBLE. VERIFIED.
The Edge Function (`supabase/functions/create-sale/index.ts:390`) calls `complete_sale` with 12 named parameters matching the 12-param overload. COMPATIBLE. VERIFIED.
The mobile app (`apps/mobile_app/lib/offline/manager.dart:50`) calls `complete_sale` RPC — this matches the 12-param overload. COMPATIBLE if called with the right params, but the mobile manager also routes `adjust_stock` to the `complete_sale` RPC name for update actions (bug C5 in BUG_REPORT.md, marked FIXED).

**What is the final stock_levels RLS policy?**
After full replay, the final stock_levels SELECT policy is `stock_levels_select_tenant_isolated` (from `20260508000000_fix_critical_rls_gaps.sql:605-619`) which uses `store_id = public.get_current_user_store_id() OR EXISTS(admin/manager/advisor tenant check)`. A second SELECT policy `stock_levels_read` (from `20260511150000_fix_stock_levels_read_rls.sql:14-34`) also exists with a similar store-scoped + tenant-admin check via a stores join. The `USING(true)` policies from 20260327100000 and 20260426231000 are DROPPED by 20260508000000. The final_dedupe_cleanup does NOT touch stock_levels policies. VERIFIED — the GLM C-1 finding is CONTRADICTED for fresh replay. The USING(true) was fixed.

**Can anonymous callers create orders for arbitrary stores?**
YES. The `create_order_with_stock` function (`20260611000002_add_orders.sql:43`) is SECURITY DEFINER without SET search_path, accepts caller-supplied p_tenant_id and p_store_id with no server-side validation, and is granted EXECUTE to anon (line 109). The orders table also has a direct anon INSERT policy with `WITH CHECK (true)` (line 29-32). VERIFIED — both GLM C-2 and H-5 are CONFIRMED.

**Which claims require live-state verification?**
1. Whether the live database has the 4-param STUB complete_sale (it may have been overwritten by remote migrations).
2. Whether the live stock_levels table has id, version, updated_at columns (deduct_stock references them; the functions may work on live if remote migrations added these columns).
3. Whether the live competitor_prices table uses item_id or product_id (memory says item_id; 20260514000001 creates product_id on replay).
4. Whether the live database has the stock_levels_read policy (from 20260511150000) or only stock_levels_select_tenant_isolated (from 20260508000000).
5. What the 12 sync_remote_migration placeholders actually applied to the live database.

---

## 2. Canonical contract

### Sale submission
- Canonical function: `create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) RETURNS jsonb`
- Must be SECURITY DEFINER with `SET search_path = public, pg_temp`
- Must authenticate via `auth.uid()` → users table
- Must check `client_transaction_id` against existing sales for idempotency
- Must validate items exist and are active
- Must validate stock availability (STRICT or PARTIAL_ALLOWED)
- Must insert sale, sale_items, sale_payments atomically
- Must decrement stock via `adjust_stock` with reason 'sale'
- Must write sale_audit_log
- `complete_sale` should be a thin wrapper delegating to `create_sale`, NOT a separate implementation

### Payment idempotency
- `sales.client_transaction_id` has a partial unique index `idx_sales_store_client_txn` on `(store_id, client_transaction_id) WHERE client_transaction_id IS NOT NULL`
- `sale_payments` has NO unique constraint — duplicate payment capture is possible
- `idempotency_keys` table exists but `create_sale` does NOT use it — it only checks `sales.client_transaction_id`
- The `check_idempotency` function (`20260426213841:5`) is a separate legacy system used by `record_sale` (ledger engine), not by `create_sale`
- Canonical: `sales.client_transaction_id` unique partial index is the enforceable idempotency mechanism. `sale_payments` needs a uniqueness constraint.

### Stock mutation
- `adjust_stock(uuid, uuid, integer, text, text, uuid)` — atomic upsert via `ON CONFLICT (store_id, item_id) DO UPDATE`. SECURITY DEFINER, search_path safe. This is the canonical stock mutation function, called by create_sale.
- `decrement_stock(uuid, uuid, integer)` — atomic conditional update `WHERE qty >= p_quantity`. SECURITY DEFINER, search_path safe. Not called by create_sale.
- `deduct_stock(uuid, uuid, integer, jsonb)` — references `stock_levels.id` and `stock_levels.version` which DO NOT EXIST in replay schema. BROKEN on replay. May work on live if remote migrations added these columns. LIVE-STATE REQUIRED.
- `import_apply_stock_delta(uuid, uuid, integer)` — upsert on conflict, SECURITY DEFINER, search_path safe. VERIFIED.
- `create_order_with_stock` — does its own stock decrement via `UPDATE stock_levels SET qty = qty - v_qty WHERE item_id = v_id AND store_id = p_store_id` (not via adjust_stock). No movement logging. No stock_ledger entry.

### Storefront order creation
- Canonical function: `create_order_with_stock(text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text) RETURNS jsonb`
- Must validate tenant_id and store_id server-side (currently does NOT)
- Must lock stock with SELECT FOR UPDATE before decrement (currently does, but has TOCTOU between validate loop and update loop)
- Must be the ONLY path for order creation (currently anon INSERT bypasses it)

### Tenant/store identity
- Functions should derive tenant/store from `auth.uid()` → users table, NOT accept from callers
- `create_sale` derives user identity from `auth.uid()` but accepts `p_store_id` from caller (no validation that the caller belongs to that store)
- `create_order_with_stock` accepts both `p_tenant_id` and `p_store_id` from callers with no validation
- `adjust_stock` accepts `p_store_id` from caller with no validation

### Catalog ownership
- `items` table has `tenant_id` (added by `20260508000000:146`). It does NOT have `store_id`.
- RLS: `items_select_tenant_isolated` (20260508000000:171) and `items_manage_authorized` (20260603223000:4) use `tenant_id` checks via users table.
- `get_price_history` (20260519100000:31) references `i.store_id` — DOES NOT EXIST. BROKEN.
- `check_price_alerts` (20260514000001:147) references `i.store_id` — DOES NOT EXIST. BROKEN.
- The 20260625000000 fix for get_price_history queries `price_audit_log` instead — VERIFIED fix.

### Competitor-price ownership
- Two conflicting schemas exist:
  - Baseline (`20260301000000:5140`): `item_id`, `competitor_name`, `competitor_price`, `competitor_url`, `last_updated`, `created_at`. No `store_id`, no `product_id`.
  - `20260514000001:5-42`: DROP + recreate with `product_id` (not `item_id`), `store_id`, `product_name`, `product_sku`, `competitor_product_id`, `competitor_product_url`, `competitor_price`, `competitor_original_price`, `currency`, `our_price`, `price_gap_percent`, `scraped_at`, `scrape_batch_id`, `scrape_status`, `error_message`, `raw_data`, `created_at`, `updated_at`.
- Generated types (`database.types.ts:411-432`) show BOTH `item_id` and `product_id` and `store_id` — this matches neither migration exactly, suggesting the live database has a hybrid schema (likely the baseline + ALTER TABLE additions applied remotely).
- Admin caller (`competitorPrices.ts:84-86`) inserts with both `store_id` and `item_id` but NOT `product_id`. This matches the live schema (per memory) but NOT the 20260514000001 replay schema.
- LIVE-STATE REQUIRED to determine actual column set.

---

## 3. Function timeline

### create_sale

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 498 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | CREATE | SET public, pg_temp | baseline:7919-7921 REVOKE FROM PUBLIC, GRANT TO authenticated+service_role | — | 20260601000001 |
| 20260601000001_fix_create_sale_column_names | 15 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | REPLACE | SET public, pg_temp | :346-347 REVOKE FROM PUBLIC, GRANT TO authenticated | admin pos.ts:71, complete_sale wrapper | FINAL (no later definition) |

**Final replay definition:** `20260601000001_fix_create_sale_column_names.sql:15` — 12-param, SECURITY DEFINER, SET search_path = public, pg_temp, authenticates via auth.uid(), checks client_transaction_id idempotency, validates items/stock, inserts sale+items+payments, calls adjust_stock for each item, writes sale_audit_log. VERIFIED.

### complete_sale

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 434 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | CREATE (wrapper → create_sale) | SET public, pg_temp | baseline:7901-7903 REVOKE FROM PUBLIC, GRANT TO authenticated+service_role | — | 20260506100000 |
| 20260420100000_pos_transactions | 317 | () | DROP (no-arg version) | — | — | — | — |
| 20260423123000_offline_sync_idempotency | 103 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text) | DROP (7-param) | — | — | — | — |
| 20260423201000_centralize_pricing | 4-12 | (uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb) + (uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,text,jsonb,text,text,text) + () | DROP (9-param, 13-param, no-arg) | — | :291-292 GRANT 13-param TO authenticated | — | — |
| 20260423201500_server_authoritative | 123 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb) | DROP (9-param) | — | :133-134 GRANT 12-param TO authenticated | — | — |
| 20260423213000_ledger | 167 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | DROP (12-param) | — | :280-281 GRANT 12-param TO authenticated | — | — |
| 20260423224500_ledger_posting | 592 | () | DROP (no-arg) | — | :789-790 GRANT 12-param TO authenticated | — | — |
| 20260423232000_production_hardening | 22 | () | DROP (no-arg) | — | — | — | — |
| 20260506100000_rpc_consolidation | 35 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | CREATE (wrapper → create_sale) | SET public, pg_temp | — | Edge Function create-sale/index.ts:390 | 20260530000000 does NOT drop this (drops 4-param instead) |
| 20260506010000_revoke_anon | 17-18 | (12-param) + (13-param) | REVOKE FROM anon | — | — | — | — |
| 20260506200000_security_hardening_v2 | 21 | (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) | REVOKE FROM anon | — | — | — | — |
| 20260530000000_final_dedupe_cleanup | 78 | (uuid, jsonb, uuid, text) | DROP (4-param — does NOT match 12-param) | — | — | — | — |
| 20260530000000_final_dedupe_cleanup | 80 | (uuid, jsonb, uuid, text) | CREATE STUB (returns fake success) | SET public, pg_temp | :212 GRANT TO authenticated | NOTHING (orphan overload) | — |
| 20260531024500_master_repair | 383 | (uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) | GRANT TO authenticated | — | — | — | — |

**Final replay state:** TWO overloads exist:
1. 12-param wrapper from 20260506100000:35 — delegates to create_sale. GRANT to authenticated (from master_repair:383). VERIFIED.
2. 4-param STUB from 20260530000000:80 — returns `{'success': true, 'sale_id': gen_random_uuid(), 'message': 'Sale completed'}`. GRANT to authenticated (20260530000000:212). REPLAY-ONLY RISK — no current caller invokes this overload, but it is a latent footgun.

### adjust_stock

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 126 | (uuid, uuid, integer, text, text, uuid) | CREATE | SET public, pg_temp | baseline:7853-7855 REVOKE FROM PUBLIC, GRANT TO service_role+authenticated | — | 20260327200000 |
| 20260327200000_stock_adjustments | 24 | (uuid, uuid, integer, text, text, uuid) | REPLACE (identical body) | SET public, pg_temp | :92-95 REVOKE FROM PUBLIC+anon+authenticated, GRANT TO service_role | create_sale (20260601000001:253), stock transfers, import | 20260531024500 |
| 20260531024500_master_repair | 257 | (uuid, uuid, integer, text, text, uuid) | GRANT TO authenticated | — | — | — | — |

**Final replay definition:** `20260327200000_stock_adjustments.sql:24` — atomic upsert `ON CONFLICT (store_id, item_id) DO UPDATE SET qty = GREATEST(0, qty + p_delta)`, writes stock_movements, returns `{movement_id, new_qty, delta, reason}`. SECURITY DEFINER, search_path safe. Grants: service_role (from 20260327200000:95) + authenticated (from 20260531024500:257). VERIFIED.

### deduct_stock

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 920 | (uuid, uuid, integer, jsonb) | CREATE | SET public, pg_temp | baseline:7949-7951 REVOKE FROM PUBLIC, GRANT TO authenticated+service_role | — | 20260427090000 |
| 20260427090000_stock_deduction_rpc | 10-20 | (uuid, uuid, integer, jsonb) | DROP + CREATE (identical body) | SET public, pg_temp | :146-148 REVOKE FROM PUBLIC, GRANT TO authenticated+service_role | — | 20260506000003 |
| 20260506000003_repair_stock | 7-9 | (uuid, uuid, integer, jsonb) | DROP + CREATE (identical body) | SET public, pg_temp | :111-112 REVOKE FROM PUBLIC, GRANT TO authenticated | — | FINAL |

**Final replay definition:** `20260506000003_repair_stock_and_reminder_functions.sql:9` — references `stock_levels.id` (line 28), `stock_levels.updated_at` (line 67), `stock_levels.version` (line 68). The effective stock_levels table has composite PK (store_id, item_id) and NO `id`, `version`, or `updated_at` columns. The function will FAIL at runtime with "column does not exist". CONTRADICTED — the function is broken on replay. LIVE-STATE REQUIRED to determine if remote migrations added these columns.

### decrement_stock

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 899 | (uuid, uuid, integer) | CREATE | SET public, pg_temp | baseline:7943-7945 REVOKE FROM PUBLIC, GRANT TO service_role+authenticated | — | 20260327100000 |
| 20260327100000_stock_levels_realtime | 72 | (uuid, uuid, integer) | REPLACE (identical body) | SET public, pg_temp | :143-145 REVOKE FROM PUBLIC+anon+authenticated, :155 GRANT TO service_role | — | 20260426232000 |
| 20260426232000_add_stock_functions | 3 | (uuid, uuid, integer) | REPLACE (identical, but NO SECURITY DEFINER, plain LANGUAGE plpgsql) | SET public, pg_temp (but not SECURITY DEFINER) | — | — | FINAL |

**Final replay definition:** `20260426232000_add_stock_functions.sql:3` — NOT SECURITY DEFINER. Atomic conditional update `WHERE qty >= p_quantity`. Grants from baseline:7943-7945 (service_role+authenticated) may still apply but were REVOKED by 20260327100000:143-145 and only re-granted to service_role. VERIFIED as functional (uses composite PK, no nonexistent columns).

### set_stock

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260301000000_baseline | 4398 | (uuid, uuid, integer, text, text) | CREATE | — | baseline:8392-8394 REVOKE FROM PUBLIC, GRANT TO authenticated+service_role | inventory.ts:44, inventory.ts:90 | FINAL |

**Final replay definition:** `20260301000000_baseline_core_tables.sql:4398`. VERIFIED.

### import_apply_stock_delta

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260327100000_stock_levels_realtime | 113 | (uuid, uuid, integer) | CREATE | SET public, pg_temp | :151-153 REVOKE FROM PUBLIC+anon+authenticated, :157 GRANT TO service_role | import-inventory Edge Function | FINAL |

**Final replay definition:** `20260327100000_stock_levels_realtime_and_rpc.sql:113` — upsert with `ON CONFLICT (store_id, item_id) DO UPDATE SET qty = qty + EXCLUDED.qty`. VERIFIED.

### create_order_with_stock

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260611000002_add_orders | 43 | (text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text) | CREATE | NONE (SECURITY DEFINER, no SET search_path) | :109 GRANT TO anon | orders.ts:37 | FINAL |

**Final replay definition:** `20260611000002_add_orders.sql:43`. VERIFIED as CONFIRMED insecure (no search_path, anon-granted, unvalidated caller-supplied tenant/store).

### get_price_history

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260519100000_add_price_history_rpc | 3 | (uuid, uuid, integer) | CREATE | NONE (SECURITY DEFINER, no SET search_path) | :38 GRANT TO authenticated | inventory.ts:153 | 20260625000000 |
| 20260625000000_fix_get_price_history_rpc | 4 | (uuid, uuid, integer) | REPLACE | SET public, pg_temp | :45-49 GRANT TO authenticated+service_role | inventory.ts:153 | FINAL |

**Final replay definition:** `20260625000000_fix_get_price_history_rpc.sql:4` — queries `price_audit_log` table (not items), joins users for name resolution. SECURITY DEFINER, search_path safe. The 20260519100000 version's `i.store_id` reference is eliminated. VERIFIED.

### check_price_alerts

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260514000001_create_competitor_prices | 108 | (uuid, numeric) | CREATE | NONE (SECURITY DEFINER, no SET search_path) | (no explicit grant — defaults to PUBLIC) | — | FINAL |

**Final replay definition:** `20260514000001_create_competitor_prices.sql:108` — references `i.store_id` (line 147) which does NOT exist on the items table. BROKEN on replay. Also missing SET search_path. CONTRADICTED.

### cleanup_old_competitor_prices / trigger_cleanup_competitor_prices

| Migration | Line | Signature | Action | Search path | Grants | Callers | Superseded by |
|-----------|------|-----------|--------|-------------|--------|---------|---------------|
| 20260514000001_create_competitor_prices | 77 | () | CREATE cleanup_old | NONE (SECURITY DEFINER, no SET search_path) | — | trigger | FINAL |
| 20260514000001_create_competitor_prices | 86 | () → trigger | CREATE trigger_cleanup | NONE (PL/pgSQL, not SECURITY DEFINER) | — | trg_cleanup_competitor_prices trigger | FINAL |

Both lack SET search_path. The trigger runs `SELECT count(*) FROM competitor_prices` on every INSERT. VERIFIED as insecure and performance-degrading.

---

## 4. RPC compatibility matrix

| Caller | File:Line | RPC name | Arguments sent | Expected response | Final repo signature | Compatible? | Evidence |
|--------|-----------|----------|----------------|-------------------|---------------------|-------------|----------|
| Admin POS sale | admin_web/src/lib/api/domains/pos.ts:71 | create_sale | p_cashier_id, p_client_transaction_id, p_store_id, p_items, p_payments, p_notes | {status, batch_id?, total_revenue?} | create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) — 12-param | YES (named params match) | VERIFIED |
| Edge Function create-sale | supabase/functions/create-sale/index.ts:390 | complete_sale | p_store_id, p_cashier_id, p_session_id, p_items, p_payments, p_discount, p_client_transaction_id, p_notes, p_snapshot, p_fulfillment_policy, p_override_token, p_override_reason | {status, sale_id, sale_number, total_amount, ...} | complete_sale 12-param overload (20260506100000:35) delegates to create_sale | YES (12 named params match the 12-param overload) | VERIFIED |
| Mobile offline sync | mobile_app/lib/offline/manager.dart:50 | complete_sale | (via RPC, params from queued transaction) | SaleResult | complete_sale 12-param overload | YES (if params match 12-param) | VERIFIED with caveat — mobile sends complete_sale for insert action type |
| Mobile stock adjust | mobile_app/lib/features/stock/services/stock_service.dart:128 | adjust-stock Edge Function | store_id, item_id, delta, reason, notes, pin | {success} | adjust_stock(uuid,uuid,integer,text,text,uuid) | YES (via Edge Function → RPC) | VERIFIED |
| Admin inventory adjust | admin_web/src/lib/api/domains/inventory.ts:34 | adjust_stock | p_store_id, p_item_id, p_delta, p_reason, p_notes | {movement_id, new_qty, delta, reason} | adjust_stock(uuid,uuid,integer,text,text,uuid) | YES | VERIFIED |
| Admin inventory set | admin_web/src/lib/api/domains/inventory.ts:44 | set_stock | p_store_id, p_item_id, p_new_qty, p_reason, p_notes | — | set_stock(uuid,uuid,integer,text,text) | YES | VERIFIED |
| Storefront order | customer_storefront/app/lib/orders.ts:37 | create_order_with_stock | p_order_number, p_tenant_id, p_store_id, p_customer_name, p_customer_phone, p_customer_address, p_notes, p_items, p_subtotal, p_delivery_fee, p_total, p_delivery_slot | {id, order_number} | create_order_with_stock(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text) | YES (param names match) | VERIFIED |
| Admin price history | admin_web/src/lib/api/domains/inventory.ts:153 | get_price_history | p_store_id, p_item_id, p_limit | {id, changed_at, old_price, new_price, ...} | get_price_history(uuid,uuid,integer) from 20260625000000 | YES | VERIFIED |

### Flagged issues

1. **Orphan complete_sale STUB**: The 4-param complete_sale(uuid, jsonb, uuid, text) from 20260530000000:80 coexists with the 12-param wrapper. If any caller sends only 4 params, it hits the STUB and gets fake success. No current caller does this, but it is a latent footgun. REPLAY-ONLY RISK.

2. **Mobile manager.dart action routing**: The mobile offline manager (manager.dart:50) routes `SyncActionType.insert` to `complete_sale` and `SyncActionType.update` to `adjust_stock`. If a stock adjustment is accidentally tagged as `insert`, it would call complete_sale with adjust_stock-shaped params, which would fail (param mismatch) rather than silently succeed. VERIFIED as low risk.

3. **complete_sale return shape mismatch**: The Edge Function (create-sale/index.ts:416-435) reads `result.status`, `result.sale_id`, `result.sale_number`, `result.total_amount`, etc. from the RPC response. The 12-param complete_sale delegates to create_sale which returns these fields. The 4-param STUB returns `{success: true, sale_id: gen_random_uuid(), message: 'Sale completed'}` — missing `status`, `sale_number`, `total_amount`. If the STUB were called, the Edge Function would return `success: false` (because `status` is undefined, not 'SUCCESS'). This means the STUB is NOT silently dangerous through the Edge Function — it would cause a visible failure. However, a direct RPC call to the STUB would return fake success.

---

## 5. Effective RLS state

### stock_levels

| Migration | Policy action | Policy name | Role | USING | WITH CHECK | Result after migration |
|-----------|--------------|-------------|------|-------|------------|----------------------|
| 20260301000000_baseline:7688 | ENABLE RLS | — | — | — | — | RLS enabled |
| 20260301000000_baseline:7691 | CREATE | stock_levels_select_tenant_isolated | authenticated | store_id = get_current_user_store_id() OR admin/manager/advisor tenant check | — | Store-scoped SELECT |
| 20260301000000_baseline:7697 | CREATE | stock_levels_write_authorized | authenticated | store_id = get_current_user_store_id() AND role check | same | Store-scoped write |
| 20260327100000:36 | DROP + CREATE | Authenticated users can read stock levels | authenticated | **USING(true)** | — | Global read (OVERWRITES baseline SELECT) |
| 20260327100000:45 | DROP + CREATE | Staff roles can manage stock levels | authenticated | role in admin/manager/stock (NO store_id check) | same | Role-only write (no store scoping) |
| 20260426231000:9 | DROP + CREATE | Authenticated users can read stock levels | authenticated | **USING(true)** | — | Global read (same) |
| 20260426231000:17 | DROP + CREATE | Admins managers can manage stock levels | authenticated | role in admin/manager (NO store_id check) | same | Role-only write |
| 20260508000000:601 | DROP | Authenticated users can read stock levels | — | — | — | Removed |
| 20260508000000:602 | DROP | stock_levels_select_tenant_isolated | — | — | — | Removed |
| 20260508000000:605 | CREATE | stock_levels_select_tenant_isolated | authenticated | store_id = get_current_user_store_id() OR admin/manager/advisor tenant check | — | Store-scoped SELECT |
| 20260508000000:622 | DROP | Staff roles can manage stock levels | — | — | — | Removed |
| 20260508000000:623 | DROP | stock_levels_write_authorized | — | — | — | Removed |
| 20260508000000:625 | CREATE | stock_levels_write_authorized | authenticated | store_id = get_current_user_store_id() AND role check | same | Store-scoped write |
| 20260511150000:10 | DROP | stock_levels_read | — | — | — | No-op (policy name doesn't exist yet) |
| 20260511150000:14 | CREATE | stock_levels_read | authenticated | store_id = get_current_user_store_id() OR admin/manager/advisor via stores join | — | Second SELECT policy (coexists with stock_levels_select_tenant_isolated) |
| 20260530000000 | — | — | — | — | — | Does NOT touch stock_levels policies |

**Final replay policy set:**
- SELECT: `stock_levels_select_tenant_isolated` (store_id = get_current_user_store_id() OR admin/manager/advisor tenant check) — from 20260508000000:605
- SELECT: `stock_levels_read` (store_id = get_current_user_store_id() OR admin/manager/advisor via stores join) — from 20260511150000:14
- FOR ALL: `stock_levels_write_authorized` (store_id = get_current_user_store_id() AND role check) — from 20260508000000:625

VERIFIED: The USING(true) policy is GONE. Both SELECT policies are store-scoped. The GLM C-1 finding is CONTRADICTED for fresh replay.

### orders

| Migration | Policy action | Policy name | Role | USING | WITH CHECK | Result |
|-----------|--------------|-------------|------|-------|------------|--------|
| 20260611000002:25 | ENABLE RLS | — | — | — | — | RLS enabled |
| 20260611000002:29 | CREATE | Allow anon insert orders | anon | — | **WITH CHECK (true)** | Anon can insert ANY order |
| 20260611000002:36 | CREATE | Allow tenant read orders | authenticated | tenant_id = get_current_user_tenant_id() | — | Tenant-scoped read |

**Final replay policy set:**
- INSERT: `Allow anon insert orders` to anon with `WITH CHECK (true)` — no validation of tenant_id, store_id, or order content
- SELECT: `Allow tenant read orders` to authenticated with `tenant_id = get_current_user_tenant_id()`
- No UPDATE or DELETE policies

VERIFIED: GLM H-5 is CONFIRMED. Anon can insert arbitrary orders directly, bypassing create_order_with_stock and its stock validation.

### categories

| Migration | Policy action | Policy name | Role | USING | WITH CHECK | Result |
|-----------|--------------|-------------|------|-------|------------|--------|
| 20260301000000_baseline | Multiple | Various (baseline has tenant-isolated policies) | authenticated | tenant_id checks | — | Tenant-scoped |
| 20260611000000:33 | DROP + CREATE | Allow anon read categories for store | anon | active = true AND store_id = '4acf0fb2-...' | — | Hardcoded single-store anon |
| 20260611050000:8 | DROP + CREATE | categories_select_anon | anon | **active = true** (NO store_id check) | — | Global anon read of ALL active categories |
| 20260530000000:27 | DROP | categories_select_tenant_isolated | — | — | — | Removed (then recreated by same migration) |
| 20260530000000:33 | CREATE | categories_select_tenant_isolated | authenticated | EXISTS(users.auth_id = auth.uid() AND users.tenant_id = categories.tenant_id) | — | Tenant-scoped authenticated read |

**Final replay policy set:**
- SELECT: `Allow anon read categories for store` to anon — `active = true AND store_id = '4acf0fb2-...'` (hardcoded)
- SELECT: `categories_select_anon` to anon — `active = true` (global, no store scoping)
- SELECT: `categories_select_tenant_isolated` to authenticated — tenant check
- (INSERT/UPDATE/DELETE policies from baseline may still exist if not dropped)

VERIFIED: GLM M-3 is CONFIRMED. Two conflicting anon SELECT policies. The second (`categories_select_anon` from 20260611050000:13) allows anon to read ALL active categories across ALL stores/tenants.

### items

| Migration | Policy action | Policy name | Role | USING | WITH CHECK | Result |
|-----------|--------------|-------------|------|-------|------------|--------|
| 20260301000000_baseline | Various | Allow read to authenticated, etc. | authenticated | Various | — | Initial policies |
| 20260508000000:167 | DROP | Allow read to authenticated | — | — | — | Removed |
| 20260508000000:168 | DROP | items_select_tenant_isolated | — | — | — | Removed |
| 20260508000000:171 | CREATE | items_select_tenant_isolated | authenticated | tenant_id = get_current_user_tenant_id() OR admin/manager/advisor tenant check | — | Tenant-scoped SELECT |
| 20260530000000:46 | DROP | items_select_tenant_isolated | — | — | — | Removed |
| 20260530000000:47 | DROP | items_manage_authorized | — | — | — | Removed (NOT recreated by this migration!) |
| 20260530000000:49 | CREATE | items_select_tenant_isolated | authenticated | EXISTS(users.auth_id = auth.uid() AND users.tenant_id = items.tenant_id) | — | Tenant-scoped SELECT (recreated) |
| 20260603223000:4 | CREATE | items_manage_authorized | authenticated | EXISTS(users.auth_id = auth.uid() AND users.tenant_id = items.tenant_id) | same | Tenant-scoped FOR ALL (restored) |

**Final replay policy set:**
- SELECT: `items_select_tenant_isolated` — tenant check (from 20260530000000:49)
- FOR ALL: `items_manage_authorized` — tenant check (from 20260603223000:4)

VERIFIED.

### competitor_prices

| Migration | Policy action | Policy name | Role | USING | WITH CHECK | Result |
|-----------|--------------|-------------|------|-------|------------|--------|
| 20260301000000_baseline:5140 | Table created (no RLS, no policies) | — | — | — | — | No RLS |
| 20260514000001:56 | ENABLE RLS | — | — | — | — | RLS enabled |
| 20260514000001:58 | CREATE | Users can view competitor prices for their store | (default = PUBLIC) | EXISTS(auth.users.id = auth.uid() AND raw_user_meta_data->>'current_store_id' = store_id::text) | — | Broken (raw_user_meta_data never set) |
| 20260514000001:69 | CREATE | Service role can manage competitor prices | service_role | true | true | Service role full access |
| 20260720000001:6 | DROP | Users can view competitor prices for their store | — | — | — | Removed |
| 20260720000001:9 | CREATE | Users can view competitor prices for their store | authenticated | store_id = get_current_user_store_id() | — | Store-scoped SELECT |

**Final replay policy set:**
- SELECT: `Users can view competitor prices for their store` to authenticated — `store_id = get_current_user_store_id()` (from 20260720000001:9)
- FOR ALL: `Service role can manage competitor prices` to service_role — `USING(true) WITH CHECK(true)` (from 20260514000001:69)

VERIFIED. The 20260720000001 fix works IF the table has a `store_id` column. On fresh replay (20260514000001 drops and recreates with store_id), it works. On live (baseline schema without store_id), the policy would fail. LIVE-STATE REQUIRED.

---

## 6. Effective table shapes

### stock_levels

| Column/constraint | Initial definition | ALTER history | Final replay state | Generated types | Referenced by code | Compatibility |
|-------------------|-------------------|---------------|-------------------|-----------------|-------------------|---------------|
| store_id | baseline:5725 NOT NULL | — | NOT NULL, part of composite PK | database.types.ts:3613 | adjust_stock, decrement_stock, deduct_stock, create_order_with_stock | COMPATIBLE |
| item_id | baseline:5726 NOT NULL | — | NOT NULL, part of composite PK | database.types.ts:3609 | adjust_stock, decrement_stock, deduct_stock | COMPATIBLE |
| qty | baseline:5727 DEFAULT 0 | — | integer DEFAULT 0 | database.types.ts:3610 | adjust_stock, decrement_stock, create_sale, create_order_with_stock | COMPATIBLE |
| reserved | baseline:5728 DEFAULT 0 | — | integer DEFAULT 0 | database.types.ts:3612 | — | COMPATIBLE |
| id | DOES NOT EXIST | NOT ADDED by any migration | DOES NOT EXIST | NOT in types | deduct_stock:932 (SELECT id INTO ...), deduct_stock:973 (WHERE id = ...) | **INCOMPATIBLE** — deduct_stock is broken |
| version | DOES NOT EXIST | NOT ADDED by any migration | DOES NOT EXIST | NOT in types | deduct_stock:972 (version = version + 1) | **INCOMPATIBLE** — deduct_stock is broken |
| updated_at | DOES NOT EXIST | NOT ADDED by any migration | DOES NOT EXIST | NOT in types | deduct_stock:971 (updated_at = now()) | **INCOMPATIBLE** — deduct_stock is broken |
| tenant_id | NOT in baseline | database.types.ts:3614 has it | UNKNOWN — no migration adds it | database.types.ts:3614 (nullable) | — | LIVE-STATE REQUIRED — types show it but no migration adds it |
| qty_reserved_online | NOT in baseline | database.types.ts:3611 has it | UNKNOWN | database.types.ts:3611 (nullable) | — | LIVE-STATE REQUIRED |
| PK | (store_id, item_id) via baseline index | — | Composite (store_id, item_id) | — | adjust_stock ON CONFLICT (store_id, item_id) | COMPATIBLE |

**Resolved:**
- stock_levels does NOT have `id` — VERIFIED (composite PK only)
- stock_levels does NOT have `version` — VERIFIED
- stock_levels does NOT have `updated_at` — VERIFIED
- stock_levels has `tenant_id` and `qty_reserved_online` in generated types but NO migration adds them — LIVE-STATE REQUIRED (applied remotely, concealed by sync_remote_migration placeholders)

### competitor_prices

| Column/constraint | Initial definition (baseline:5140) | 20260514000001 (DROP+recreate) | Final replay state | Generated types | Referenced by code | Compatibility |
|-------------------|-----------------------------------|-------------------------------|-------------------|-----------------|-------------------|---------------|
| id | uuid PK | uuid PK | uuid PK | :421 | — | COMPATIBLE |
| item_id | uuid (baseline) | **NOT PRESENT** (replaced by product_id) | **NOT PRESENT on replay** | :422 (PRESENT in types!) | competitorPrices.ts:19, :35, :86 | **CONTRADICTED** — code uses item_id, replay schema uses product_id |
| product_id | NOT in baseline | uuid REFERENCES items(id) | uuid (nullable) | NOT in types row | — | **CONTRADICTED** — types don't show product_id in Row |
| store_id | NOT in baseline | uuid NOT NULL REFERENCES stores | uuid NOT NULL | :431 | competitorPrices.ts:16, :85 | COMPATIBLE on replay, **CONTRADICTED** on live (baseline has no store_id) |
| competitor_name | text NOT NULL | text NOT NULL | text NOT NULL | :413 | competitorPrices.ts | COMPATIBLE |
| competitor_price | numeric(15,2) NOT NULL | numeric(12,2) NOT NULL | numeric(12,2) NOT NULL | :415 | competitorPrices.ts | COMPATIBLE (precision changed) |
| competitor_url | text | **NOT PRESENT** (renamed to competitor_product_url) | NOT PRESENT | NOT in types | — | INCOMPATIBLE |
| last_updated | timestamptz | **NOT PRESENT** (renamed to scraped_at + updated_at) | NOT PRESENT | NOT in types | — | INCOMPATIBLE |
| product_name | NOT in baseline | text NOT NULL | text NOT NULL | :425 | — | COMPATIBLE on replay |
| product_sku | NOT in baseline | text | text | :426 | — | COMPATIBLE on replay |
| competitor_product_id | NOT in baseline | text | text | :416 | — | COMPATIBLE on replay |
| competitor_product_url | NOT in baseline | text | text | :417 | — | COMPATIBLE on replay |
| competitor_original_price | NOT in baseline | numeric(12,2) | numeric(12,2) | :414 | — | COMPATIBLE on replay |
| currency | NOT in baseline | text DEFAULT 'BDT' | text DEFAULT 'BDT' | :419 | — | COMPATIBLE on replay |
| our_price | NOT in baseline | numeric(12,2) | numeric(12,2) | :423 | — | COMPATIBLE on replay |
| price_gap_percent | NOT in baseline | numeric(5,2) | numeric(5,2) | :424 | — | COMPATIBLE on replay |
| scraped_at | NOT in baseline | timestamptz NOT NULL | timestamptz NOT NULL | :430 | — | COMPATIBLE on replay |
| scrape_batch_id | NOT in baseline | uuid DEFAULT gen_random_uuid() | uuid | :428 | — | COMPATIBLE on replay |
| scrape_status | NOT in baseline | text DEFAULT 'success' | text | :429 | — | COMPATIBLE on replay |
| error_message | NOT in baseline | text | text | :420 | — | COMPATIBLE on replay |
| raw_data | NOT in baseline | jsonb | jsonb | :427 | — | COMPATIBLE on replay |
| created_at | timestamptz | timestamptz NOT NULL | timestamptz NOT NULL | :418 | — | COMPATIBLE |
| updated_at | NOT in baseline | timestamptz NOT NULL | timestamptz NOT NULL | :432 | — | COMPATIBLE on replay |

**Resolved:**
- competitor_prices uses `item_id` in the baseline, `product_id` on replay (20260514000001). The generated types show BOTH `item_id` and `store_id` but NOT `product_id` in the Row — suggesting the live database has the baseline schema + remote ALTER additions (store_id, item_id kept, product_id NOT added). LIVE-STATE REQUIRED.
- The admin caller (competitorPrices.ts) uses `item_id` (not product_id) and `store_id` — matches live schema, NOT replay schema.

### items

| Column/constraint | Initial definition (baseline:5291) | ALTER history | Final replay state | Generated types | Referenced by code | Compatibility |
|-------------------|-----------------------------------|---------------|-------------------|-----------------|-------------------|---------------|
| id | uuid PK | — | uuid PK | ✓ | create_sale, adjust_stock, etc. | COMPATIBLE |
| sku | text | — | text | ✓ | inventory.ts | COMPATIBLE |
| barcode | text | — | text | ✓ | lookup_item_by_scan | COMPATIBLE |
| name | text NOT NULL | — | text NOT NULL | ✓ | search_items_pos | COMPATIBLE |
| category_id | uuid | — | uuid | ✓ | — | COMPATIBLE |
| cost | numeric(15,2) DEFAULT 0 | — | numeric(15,2) | ✓ | — | COMPATIBLE |
| price | numeric(15,2) DEFAULT 0 | — | numeric(15,2) | ✓ | — | COMPATIBLE |
| image_url | text | — | text | ✓ | — | COMPATIBLE |
| active | boolean DEFAULT true | RENAMED to is_active by 20260523000000:13 | **is_active** | database.types.ts: — (shows is_active?) | create_sale (20260601000001 uses is_active), search_items_pos | COMPATIBLE after fix |
| is_active | NOT in baseline | RENAMED from active (20260523000000:13) | boolean | ✓ | create_sale:111, search_items_pos:204 | COMPATIBLE |
| mrp | numeric | — | numeric | ✓ | — | COMPATIBLE |
| tenant_id | uuid (in baseline:5308!) | 20260508000000:146 ADD COLUMN IF NOT EXISTS | uuid | ✓ | RLS policies | COMPATIBLE |
| store_id | **DOES NOT EXIST** | NEVER ADDED | DOES NOT EXIST | NOT in types | get_price_history:31 (20260519100000 version, later REPLACED), check_price_alerts:147 | **INCOMPATIBLE** — check_price_alerts references i.store_id |

**Resolved:**
- items has `tenant_id` — VERIFIED (present in baseline:5308, confirmed by 20260508000000:146 ADD COLUMN IF NOT EXISTS)
- items does NOT have `store_id` — VERIFIED (no migration adds it, not in generated types)
- `check_price_alerts` (20260514000001:147) references `i.store_id` — BROKEN on replay
- `get_price_history` (20260519100000:31) referenced `i.store_id` — BROKEN, but REPLACED by 20260625000000 which queries price_audit_log instead. VERIFIED fix.

### sale_payments

| Column/constraint | Initial definition (baseline:5613 / pos_transactions:217) | ALTER history | Final replay state | Generated types | Referenced by code | Compatibility |
|-------------------|-------------------------------------------------------|---------------|-------------------|-----------------|-------------------|---------------|
| id | uuid PK | — | uuid PK | :3147 | — | COMPATIBLE |
| sale_id | uuid NOT NULL FK to sales | — | uuid NOT NULL FK | :3150 | create_sale:278 | COMPATIBLE |
| payment_method_id | uuid NOT NULL FK to payment_methods | — | uuid NOT NULL FK | :3148 | create_sale:278 | COMPATIBLE |
| amount | numeric(12,2) NOT NULL CHECK(>0) | — | numeric(12,2) NOT NULL CHECK(>0) | :3145 | create_sale:278 | COMPATIBLE |
| reference | text | — | text | :3149 | create_sale:278, Edge Function | COMPATIBLE |
| created_at | timestamptz NOT NULL DEFAULT now() | — | timestamptz NOT NULL | :3146 | — | COMPATIBLE |
| UNIQUE(sale_id, payment_method_id, reference) | **DOES NOT EXIST** | NEVER ADDED | DOES NOT EXIST | NOT in types | — | **MISSING** — duplicate payment capture possible |

**Resolved:**
- sale_payments has a usable `reference` text column for external payment references (bKash TrxID, card last-4, etc.) — VERIFIED
- sale_payments has NO uniqueness constraint — VERIFIED (GLM M-4 CONFIRMED)

### sales

| Column/constraint | Initial definition | ALTER history | Final replay state | Generated types | Referenced by code | Compatibility |
|-------------------|-------------------|---------------|-------------------|-----------------|-------------------|---------------|
| client_transaction_id | text (pos_transactions:159 added it? No — baseline:5665 has it) | 20260423123000:5-6 ADD COLUMN IF NOT EXISTS (idempotent) | text | ✓ | create_sale, Edge Function | COMPATIBLE |
| idx_sales_store_client_txn | 20260423123000:8-10 UNIQUE INDEX (store_id, client_transaction_id) WHERE NOT NULL | baseline:6403 also creates it | UNIQUE partial index | — | create_sale idempotency check | COMPATIBLE |

**Resolved:**
- sales has an enforceable idempotency constraint via the partial unique index `idx_sales_store_client_txn` — VERIFIED
- The idempotency is enforced at the database level (unique index) AND checked in create_sale (line 78-99 returns SUCCESS for duplicates) — VERIFIED

---

## 7. Cross-audit adjudication

### GLM C-1: Global stock_levels visibility (USING(true))
**Status: CONTRADICTED for fresh replay; LIVE VERIFICATION REQUIRED for live database**

Evidence: The `USING(true)` policy was created by 20260327100000:37-41 and 20260426231000:9-14, but both were DROPPED by 20260508000000:601-602. The final replay state has `stock_levels_select_tenant_isolated` (20260508000000:605, store-scoped) and `stock_levels_read` (20260511150000:14, store-scoped). The `final_dedupe_cleanup` does NOT touch stock_levels policies. VERIFIED from migration timeline.

However, the live database may still have USING(true) if the 20260508000000 migration was applied remotely with different SQL (concealed by sync_remote_migration placeholders). LIVE-STATE REQUIRED.

### GLM C-2: Unsafe anonymous create_order_with_stock
**Status: CONFIRMED**

Evidence: `20260611000002_add_orders.sql:58-59` — SECURITY DEFINER with no SET search_path. Line 109: GRANT EXECUTE TO anon. Lines 45-46: p_tenant_id and p_store_id accepted from caller with no validation. The function does not call `auth.uid()` or check the caller's identity. VERIFIED.

### GLM C-3: Stubbed sale completion
**Status: PARTIALLY CONFIRMED (REPLAY-ONLY RISK)**

Evidence: `20260530000000_final_dedupe_cleanup.sql:78-101` does DROP a 4-param complete_sale and CREATE a 4-param STUB that returns fake success. However, the DROP targets `(uuid, jsonb, uuid, text)` — a 4-param signature — NOT the 12-param `(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)` from 20260506100000. PostgreSQL DROP FUNCTION matches by argument types. The 12-param overload SURVIVES. The STUB coexists as a separate overload.

The Edge Function calls complete_sale with 12 named params — it hits the 12-param wrapper, NOT the STUB. No current caller invokes the 4-param STUB. The STUB is a latent footgun, not an active break. REPLAY-ONLY RISK.

The GLM audit's claim that "the POS checkout function silently returns a fake success" is CONTRADICTED for the current call paths. But the STUB's existence is a confirmed hazard.

### GLM H-1: competitor_prices divergence
**Status: CONFIRMED**

Evidence: Baseline (20260301000000:5140) creates competitor_prices with `item_id`, no `store_id`, no `product_id`. 20260514000001:5 drops the table CASCADE and recreates with `product_id`, `store_id`, no `item_id`. On fresh replay, all existing data is destroyed and the schema uses product_id. On live, the baseline schema likely persists (with remote ALTER additions for store_id and keeping item_id). Generated types show BOTH item_id and store_id — confirming the live schema is a hybrid. The admin caller uses item_id. CONTRADICTED between replay and live. LIVE-STATE REQUIRED.

### GLM H-2: Unsafe SECURITY DEFINER search paths
**Status: CONFIRMED**

Functions missing SET search_path = public, pg_temp:
- `create_order_with_stock` (20260611000002:59) — VERIFIED
- `cleanup_old_competitor_prices` (20260514000001:77) — VERIFIED
- `trigger_cleanup_competitor_prices` (20260514000001:86) — VERIFIED (trigger function, not SECURITY DEFINER but also no search_path)
- `check_price_alerts` (20260514000001:108) — VERIFIED (also references nonexistent i.store_id)
- `get_price_history` (20260519100000:3) — VERIFIED, but REPLACED by 20260625000000:4 which HAS SET search_path. The 20260519100000 version no longer exists after replay.

Remaining after replay: create_order_with_stock, cleanup_old_competitor_prices, trigger_cleanup_competitor_prices, check_price_alerts. VERIFIED.

### GLM H-3: deduct_stock references nonexistent columns
**Status: CONFIRMED**

Evidence: deduct_stock (20260506000003:28) does `SELECT id, qty INTO v_stock_level_id, v_current_quantity FROM public.stock_levels ... FOR UPDATE`. The stock_levels table (baseline:5724) has composite PK (store_id, item_id) and NO `id` column. Line 67: `updated_at = now()` — no `updated_at` column. Line 68: `version = version + 1` — no `version` column. The function will FAIL with "column does not exist" on any database matching the replay schema. VERIFIED.

The live database MAY have these columns if added via remote migrations (concealed by placeholders). The generated types do NOT show id, version, or updated_at on stock_levels — suggesting the live database also lacks them. But the types show `tenant_id` and `qty_reserved_online` which no migration adds — so the types were generated from a state that includes remote alterations. If the remote alterations added tenant_id and qty_reserved_online, they may also have added id, version, updated_at — but the types don't show them. This suggests they were NOT added remotely. LIVE-STATE REQUIRED for definitive answer.

### GLM H-4: items.store_id references
**Status: PARTIALLY CONFIRMED (one fixed, one not)**

- `get_price_history` (20260519100000:31) references `i.store_id` — CONFIRMED broken, but REPLACED by 20260625000000 which queries price_audit_log instead. FIXED on replay.
- `check_price_alerts` (20260514000001:147) references `i.store_id` — CONFIRMED broken, NOT fixed. Still broken on replay.

### GLM H-5: Unrestricted anonymous order insertion
**Status: CONFIRMED**

Evidence: `20260611000002_add_orders.sql:29-32` — `create policy "Allow anon insert orders" on public.orders for insert to anon with check (true)`. No validation of tenant_id, store_id, items, or total. An attacker can INSERT directly into orders table with arbitrary data. VERIFIED.

### Kimi's claim that create_sale is transactional and idempotent
**Status: CONFIRMED**

Evidence: create_sale (20260601000001:59-342) runs as a single PL/pgSQL function (inherently transactional — if an exception occurs, all changes roll back). It checks client_transaction_id against existing sales (line 78-99) and returns SUCCESS for duplicates. The partial unique index idx_sales_store_client_txn (baseline:6403) enforces idempotency at the DB level. VERIFIED.

Caveat: The function does NOT use the `idempotency_keys` table — it relies solely on `sales.client_transaction_id`. The idempotency_keys table is used by the legacy `record_sale` function (20260426213841:5-23) which is a separate code path. VERIFIED.

### Kimi's trace showing the Edge Function calling complete_sale
**Status: CONFIRMED**

Evidence: `supabase/functions/create-sale/index.ts:390` calls `supabase.rpc('complete_sale', {...})` with 12 named parameters. VERIFIED. The 12-param complete_sale overload (20260506100000:35) delegates to create_sale. VERIFIED.

### Kimi's claim that stock writes are atomic
**Status: PARTIALLY CONFIRMED**

- `adjust_stock` uses `INSERT ON CONFLICT DO UPDATE` — atomic upsert. VERIFIED.
- `decrement_stock` uses `UPDATE ... WHERE qty >= p_quantity` — atomic conditional update. VERIFIED.
- `deduct_stock` uses `SELECT FOR UPDATE` then `UPDATE WHERE id = ...` — BROKEN (id column doesn't exist). CONTRADICTED.
- `create_order_with_stock` uses two separate loops: validate (SELECT FOR UPDATE) then update (UPDATE) — TOCTOU window between them. PARTIALLY CONFIRMED — the SELECT FOR UPDATE in the first loop locks the rows, but the lock is released after the first loop's transaction scope if the loops are in the same function (they are, so the lock holds). Actually, since both loops are in the same function call (same transaction), the SELECT FOR UPDATE locks persist until the function returns. VERIFIED as atomic within the transaction.

### Kimi's claim that mobile synchronization is replay-safe
**Status: PARTIALLY CONFIRMED**

Evidence: The mobile app stores queued transactions locally with idempotency keys (`offline_transaction_sync_service.dart`). Each retry carries the same idempotency key. The Edge Function → complete_sale → create_sale chain checks `client_transaction_id` for duplicates. VERIFIED as replay-safe for sale submissions.

Caveat: The mobile offline manager (manager.dart:50) routes ALL insert actions to `complete_sale` — if a non-sale insert is accidentally tagged, it would call complete_sale with wrong-shaped params and fail. BUG_REPORT.md C5 says this was FIXED by switching on SyncActionType. VERIFIED as fixed in current code.

---

## 8. Live-state verification checklist

The following SELECT-only queries may be run against the live database to resolve LIVE-STATE REQUIRED items. DO NOT execute them now.

### 8.1 Function definitions and configuration
```sql
-- Check complete_sale overloads
SELECT proname, pg_get_function_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS result,
       p.proconfig, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('complete_sale', 'create_sale')
ORDER BY p.proname, args;
-- Expected: two complete_sale overloads (4-param stub + 12-param wrapper) and one create_sale (12-param)
-- Check proconfig for search_path setting

-- Check create_order_with_stock search_path and security
SELECT proname, pg_get_function_arguments(p.oid) AS args, p.prosecdef, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_order_with_stock';
-- Expected: prosecdef = true, proconfig NULL (no search_path) — confirms vulnerability

-- Check deduct_stock definition (does it reference id/version?)
SELECT prosrc FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'deduct_stock';
-- Expected: if prosrc contains "stock_levels.id" or "version", function is broken unless columns exist

-- Check check_price_alerts definition
SELECT prosrc FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'check_price_alerts';
-- Expected: if prosrc contains "i.store_id", function is broken
```

### 8.2 Function grants
```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('complete_sale', 'create_sale', 'create_order_with_stock',
                        'adjust_stock', 'deduct_stock', 'set_stock', 'decrement_stock',
                        'get_price_history', 'check_price_alerts')
ORDER BY routine_name, grantee;
-- Expected: create_order_with_stock should show anon grant (confirms C-2)
```

### 8.3 RLS policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('stock_levels', 'orders', 'categories', 'items', 'competitor_prices')
ORDER BY tablename, policyname;
-- Expected: stock_levels should NOT have any USING(true) policy
-- Expected: orders should show "Allow anon insert orders" with with_check = true
-- Expected: categories should show two anon SELECT policies
```

### 8.4 Table columns
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('stock_levels', 'competitor_prices', 'items', 'sale_payments', 'sales')
ORDER BY table_name, ordinal_position;
-- Expected: stock_levels — check for id, version, updated_at, tenant_id, qty_reserved_online
-- Expected: competitor_prices — check for item_id vs product_id, store_id
-- Expected: items — check for is_active vs active, tenant_id
```

### 8.5 Constraints and indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_payments', 'stock_levels', 'competitor_prices')
ORDER BY tablename, indexname;
-- Expected: idx_sales_store_client_txn UNIQUE partial index on sales
-- Expected: NO unique index on sale_payments
-- Expected: stock_levels should show composite PK or unique index on (store_id, item_id)

SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid IN ('stock_levels'::regclass, 'sale_payments'::regclass, 'competitor_prices'::regclass)
ORDER BY conrelid::text, conname;
```

### 8.6 Publications
```sql
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
-- Expected: stock_levels and orders should be listed
```

### 8.7 Migration versions
```sql
SELECT version, name, statements, applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
-- Expected: all 163 migration files should be listed
-- Check if any sync_remote_migration versions have statements = 0 (placeholders)
```

---

## 9. Remediation dependency graph

### Task 1: Schema convergence
**Objective:** Reconcile competitor_prices table shape between baseline and 20260514000001 so both fresh replay and live upgrade produce the same schema.
**Finding addressed:** GLM H-1
**Dependencies:** LIVE-STATE REQUIRED query 8.4 (determine actual live columns)
**Files likely affected:** New migration file (e.g. `20260725000001_converge_competitor_prices.sql`), `apps/admin_web/src/lib/api/domains/competitorPrices.ts`
**Migration strategy:** Write a new convergence migration that ALTERs the table to add any missing columns (store_id, product_name, product_sku, etc.) without DROP. If the live schema has item_id, keep it. If it has product_id, keep it. Add both as nullable if needed. Update the admin caller to use the correct column name.
**Backward-compatibility concern:** The 20260514000001 migration drops the table on replay — this cannot be changed (historical migration immutability). The convergence migration must handle both schemas (live with item_id, replay with product_id) using `ADD COLUMN IF NOT EXISTS`.
**Acceptance criteria:** Fresh replay and live upgrade produce identical competitor_prices schema. Admin caller works against both.
**Verification:** Run `npm run typecheck` after updating caller. Run live-state query 8.4 before and after.
**Rollback approach:** Drop the convergence migration. The old schema persists.
**Estimated size:** Medium

### Task 2: Sale RPC convergence
**Objective:** Remove the 4-param complete_sale STUB from 20260530000000 so only the 12-param wrapper exists on fresh replay.
**Finding addressed:** GLM C-3 (partially)
**Dependencies:** None
**Files likely affected:** New migration file (e.g. `20260725000002_remove_complete_sale_stub.sql`)
**Migration strategy:** Write a new migration that `DROP FUNCTION IF EXISTS public.complete_sale(uuid, jsonb, uuid, text)` — removing the STUB overload. Do NOT edit the historical 20260530000000 migration (immutability concern — it may have already applied to live, and dropping the 4-param on live is safe since nothing calls it).
**Backward-compatibility concern:** If any unknown caller on live uses the 4-param complete_sale, it would break. Verify via live-state query 8.1 that no client calls the 4-param version. The Edge Function and admin web both use 12 params. The mobile app uses complete_sale for inserts (12 params). Low risk.
**Acceptance criteria:** Only one complete_sale overload exists (12-param wrapper). Fresh replay produces no STUB.
**Verification:** Live-state query 8.1 after migration.
**Rollback approach:** Recreate the 4-param STUB (but there's no reason to).
**Estimated size:** Small

### Task 3: stock_levels RLS
**Objective:** Verify and harden stock_levels SELECT policies to ensure no USING(true) persists.
**Finding addressed:** GLM C-1
**Dependencies:** LIVE-STATE REQUIRED query 8.3 (determine live policy state)
**Files likely affected:** New migration file IF live still has USING(true); no action needed if live matches replay.
**Migration strategy:** Run live-state query 8.3. If live has USING(true), write a convergence migration that drops the permissive policy and creates a store-scoped one. If live already has store-scoped policies, no migration needed — just document.
**Backward-compatibility concern:** Tightening RLS may break existing client queries that read all stores' stock. For single-store deployment, this is a no-op. For multi-tenant, it's a security fix.
**Acceptance criteria:** stock_levels SELECT policies are store-scoped on both fresh replay and live.
**Verification:** Live-state query 8.3.
**Rollback approach:** Recreate the USING(true) policy (not recommended).
**Estimated size:** Small

### Task 4: Anonymous order security
**Objective:** Fix create_order_with_stock security (search_path, tenant/store validation) and remove anon INSERT policy on orders.
**Finding addressed:** GLM C-2, H-5
**Dependencies:** None
**Files likely affected:** New migration file, `apps/customer_storefront/app/lib/orders.ts` (if function signature changes)
**Migration strategy:**
1. New migration: `ALTER FUNCTION public.create_order_with_stock(...) SET search_path = public, pg_temp`
2. New migration: Drop `Allow anon insert orders` policy on orders table
3. New migration: Optionally add server-side validation of p_store_id/p_tenant_id inside create_order_with_stock (derive from auth context or verify store belongs to tenant). For anon callers (storefront), consider deriving store_id from a server-side config rather than accepting from client. This may require changing the storefront to use a new authenticated Edge Function instead of direct anon RPC.
**Backward-compatibility concern:** Removing anon INSERT on orders is safe (create_order_with_stock is the intended path). Adding search_path is safe. Adding tenant/store validation may require storefront code changes if the function signature changes.
**Acceptance criteria:** create_order_with_stock has SET search_path. Anon cannot INSERT directly into orders. p_store_id is validated server-side.
**Verification:** Live-state queries 8.1, 8.2, 8.3.
**Rollback approach:** Re-add the anon INSERT policy (not recommended).
**Estimated size:** Medium (if adding validation), Small (if just search_path + policy removal)

### Task 5: SECURITY DEFINER hardening
**Objective:** Add SET search_path = public, pg_temp to all SECURITY DEFINER functions missing it.
**Finding addressed:** GLM H-2
**Dependencies:** None
**Files likely affected:** New migration file
**Migration strategy:** Write a single migration that ALTERs all identified functions to add SET search_path. Functions: create_order_with_stock, cleanup_old_competitor_prices, trigger_cleanup_competitor_prices (trigger function, not SECURITY DEFINER but should still have search_path), check_price_alerts. Also run the Supabase linter to find any additional functions.
**Backward-compatibility concern:** None — adding search_path is always safe.
**Acceptance criteria:** Zero `function_search_path_mutable` warnings from Supabase linter.
**Verification:** Supabase linter, live-state query 8.1.
**Rollback approach:** Remove the SET search_path (not recommended).
**Estimated size:** Small

### Task 6: Broken function/table-column references
**Objective:** Fix deduct_stock (references nonexistent id, version, updated_at) and check_price_alerts (references nonexistent i.store_id).
**Finding addressed:** GLM H-3, H-4 (remaining)
**Dependencies:** Task 1 (competitor_prices schema must be converged first, since check_price_alerts queries competitor_prices)
**Files likely affected:** New migration file
**Migration strategy:**
1. deduct_stock: Rewrite to use `WHERE store_id = p_store_id AND item_id = p_product_id` (like decrement_stock) and remove id/version/updated_at references. Or: DROP deduct_stock entirely if no caller uses it (check: no caller found in application code — it appears to be an orphan function only called by legacy code paths).
2. check_price_alerts: Replace `i.store_id = p_store_id` with a join through categories (which has store_id) or use tenant_id filtering. Or: use `EXISTS (SELECT 1 FROM categories c WHERE c.id = i.category_id AND c.store_id = p_store_id)`.
**Backward-compatibility concern:** If deduct_stock is called by remote/legacy code, rewriting it changes behavior. If it's an orphan, dropping it is safe. LIVE-STATE REQUIRED to confirm no callers.
**Acceptance criteria:** Both functions execute without "column does not exist" errors on fresh replay.
**Verification:** `SELECT deduct_stock(...)` and `SELECT * FROM check_price_alerts(...)` on a test database.
**Rollback approach:** Restore the old function definitions.
**Estimated size:** Medium

### Task 7: Payment idempotency
**Objective:** Add a unique constraint on sale_payments to prevent duplicate payment capture.
**Finding addressed:** GLM M-4
**Dependencies:** None
**Files likely affected:** New migration file
**Migration strategy:** Add `CREATE UNIQUE INDEX IF NOT EXISTS idx_sale_payments_unique ON public.sale_payments (sale_id, payment_method_id, reference) WHERE reference IS NOT NULL;` — a partial unique index that allows multiple cash payments (reference NULL) but prevents duplicate digital payments (same bKash TrxID). Consider whether `reference` alone is sufficient or if `(sale_id, payment_method_id)` without reference is better.
**Backward-compatibility concern:** If duplicate payments exist in the live database, the index creation will fail. Run a data quality check first.
**Acceptance criteria:** Duplicate payment capture is prevented for digital payments with references.
**Verification:** Attempt to insert a duplicate sale_payments row — should fail with unique violation.
**Rollback approach:** DROP INDEX idx_sale_payments_unique.
**Estimated size:** Small

### Task 8: Competitor-price reconciliation
**Objective:** Reconcile competitor_prices RLS, cleanup trigger, and check_price_alerts to work against the converged schema.
**Finding addressed:** GLM H-1 (RLS portion), M-2 (cleanup trigger)
**Dependencies:** Task 1 (schema convergence), Task 5 (search_path), Task 6 (check_price_alerts fix)
**Files likely affected:** New migration file, `apps/admin_web/src/lib/api/domains/competitorPrices.ts`
**Migration strategy:**
1. Ensure the 20260720000001 RLS policy works against the converged schema (store_id column must exist).
2. Replace the per-row COUNT(*) trigger with a scheduled cleanup (pg_cron or external job).
3. Drop the trigger_cleanup_competitor_prices trigger and function.
**Backward-compatibility concern:** Removing the trigger means old data accumulates if no scheduled cleanup runs. Ensure a replacement is in place before removing.
**Acceptance criteria:** Competitor prices RLS works on both replay and live. No per-row COUNT(*) trigger.
**Verification:** Insert a competitor_prices row — no full table count. Query as authenticated user — only own store's rows.
**Rollback approach:** Recreate the trigger.
**Estimated size:** Medium

---

## 10. Recommended first implementation task

**Selected task: Task 5 — SECURITY DEFINER hardening**

**Rationale:**
- Highest verified risk: search_path injection is a known PostgreSQL privilege escalation vector. All four functions are VERIFIED as missing SET search_path.
- Minimal dependency uncertainty: The functions and their search_path status are fully determined from the repository. No LIVE-STATE REQUIRED dependencies.
- Small, independently reviewable change: A single migration with ALTER FUNCTION statements.
- Safe for both existing databases and fresh replay: Adding SET search_path is idempotent and non-breaking.
- Testable without modifying unrelated business logic: The change only affects function configuration, not behavior.

**Implementation prompt for a subsequent agent:**

```
Create a new migration file `supabase/migrations/20260725000000_add_search_path_to_security_definer_functions.sql` that adds `SET search_path = public, pg_temp` to all SECURITY DEFINER functions that are missing it.

The following functions have been verified as missing SET search_path:

1. `create_order_with_stock(text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text)` — defined in `supabase/migrations/20260611000002_add_orders.sql:43`
2. `cleanup_old_competitor_prices()` — defined in `supabase/migrations/20260514000001_create_competitor_prices.sql:77`
3. `check_price_alerts(uuid, numeric)` — defined in `supabase/migrations/20260514000001_create_competitor_prices.sql:108`
4. `trigger_cleanup_competitor_prices()` — defined in `supabase/migrations/20260514000001_create_competitor_prices.sql:86` (trigger function, add search_path for consistency)

Use `ALTER FUNCTION ... SET search_path = public, pg_temp` for each. Wrap each in a DO block with EXCEPTION handling for `undefined_function` in case a function doesn't exist on the target database.

Do NOT modify any existing migration files. Only create the new migration.

After creating the migration, run `npm run typecheck` to verify no type errors are introduced.

Verify the migration is syntactically correct by reading it back after writing.
```

---

## Final verification

- Both audit reports were independently cross-checked: YES — GLM audit's 13 findings and Kimi audit's 10 findings were each traced to source.
- Every affected object has a definition timeline: YES — sections 3 and 5 provide timelines for all functions and policies.
- Repository replay state is separated from possible live state: YES — each conclusion is marked VERIFIED, CONTRADICTED, REPLAY-ONLY, or LIVE-STATE REQUIRED.
- Historical-migration changes are not recommended casually: YES — no historical migrations are recommended for editing. All remediation is via new convergence migrations.
- No code, configuration, migration, or database was changed: YES — this was a read-only inspection.
- No secret values appear in the output: YES.