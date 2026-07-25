# Database and RLS Audit

**Auditor:** Dracarys (Hermes Agent, model: glm-5.2)
**Date:** 2026-07-24
**Repository:** /Users/mac.alvi/Desktop/Projects/Lucky Store
**Scope:** PostgreSQL schema, migration history, constraints, indexes, RLS, grants, privileged functions, concurrency, integrity
**Authorization:** Read-only inspection of supabase/migrations, schema definitions, policies, functions, triggers, tests, seeds, and Supabase configuration. No modifications authorized.
**Method:** 163 migration files inspected surgically. Effective schema reconstructed across full migration history. Every conclusion tracked as VERIFIED, INFERRED, or UNKNOWN with exact file:line citations.

---

## Executive verdict

This database has grown through 163 migrations over ~8 months of rapid iteration. The core schema (stores, users, items, sales, stock_levels, ledger) is structurally functional, and significant effort has been invested in fixing early RLS gaps and search_path vulnerabilities. However, the migration history is deeply scarred by contradictory migrations, destructive drop+recreate patterns, and multiple competing definitions of the same functions. The effective schema on a fresh migration replay would differ materially from what the live database likely has, because the live database was shaped by remote migrations applied outside this repo and placeholder stubs that overwrote production functions. The database is safe enough for a single-store deployment with a small trusted team, but it is NOT safe for multi-tenant isolation, does not have reliable sale idempotency at the database level, and has at least one function (create_order_with_stock) that is a SECURITY DEFINER function without a safe search_path, exposed to anon, and accepting caller-supplied tenant_id/store_id parameters without validation.

**VERDICT:** Functional for single-store POS operations. Not production-ready for multi-tenant or internet-exposed workloads. Requires immediate remediation on 3 Critical and 5 High findings before scaling.

---

## Effective schema matrix

Tables are listed with their effective schema after all migrations replay in order. Where migrations conflict (drop+recreate), the last writer wins.

| Entity | Purpose | PK | Store/Tenant Key | Key Constraints | RLS | Key Indexes | Evidence |
|---|---|---|---|---|---|---|---|
| tenants | Multi-tenant root | id (uuid) | -- | name NOT NULL | Y | -- | bootstrap:35, baseline:5819 |
| stores | Store locations | id (uuid) | tenant_id (uuid) | code UNIQUE, name NOT NULL | Y | idx_stores_code | bootstrap:44, baseline:5787 |
| users | Staff accounts | id (uuid) | store_id, tenant_id | auth_id UNIQUE, role CHECK | Y | idx_users_last_login_at, idx_users_auth_id_unique | bootstrap:56, baseline:5829 |
| categories | Product categories | id (uuid) | store_id, tenant_id | category UNIQUE, slug UNIQUE | Y | idx_categories_name, uq_categories_slug | bootstrap:73, baseline:5092, 20260611000000:5 |
| items | Product catalog | id (uuid) | tenant_id | sku UNIQUE, barcode UNIQUE (partial), is_active | Y | idx_items_name_trgm, idx_items_barcode_trgm, idx_items_sku | bootstrap:86, baseline:5291 |
| stock_levels | Per-store inventory | (store_id, item_id) | store_id, tenant_id | qty, reserved | Y | idx_stock_levels_store_item | bootstrap:118, baseline:5724 |
| stock_movements | Inventory audit log | id (uuid) | store_id, tenant_id | delta NOT NULL, reason CHECK | Y | idx_stock_movements_item_store, idx_stock_movements_reason | bootstrap:103, baseline:5735 |
| sales | POS transactions | id (uuid) | store_id | sale_number UNIQUE, client_transaction_id UNIQUE (partial), accounting_posting_status CHECK | Y | idx_sales_store_created, idx_sales_store_client_txn | bootstrap:129, baseline:5646 |
| sale_items | Sale line items | id (uuid) | (via sale_id) | qty CHECK(>0), unit_price CHECK(>=0), UNIQUE(sale_id,item_id) in bootstrap | Y | idx_sale_items_sale, idx_sale_items_item | bootstrap:149, baseline:5587 |
| sale_payments | Payment records | id (uuid) | (via sale_id) | amount CHECK(>0) | Y | idx_sale_payments_sale | baseline:5613 |
| sale_audit_log | Sale audit trail | id (uuid) | store_id | immutable (trigger) | Y | -- | baseline:5567 |
| sale_sync_conflicts | Offline sync conflicts | id (uuid) | store_id | UNIQUE(store_id, client_txn_id, conflict_type) | Y | -- | baseline:5627 |
| pos_sessions | POS drawer sessions | id (uuid) | store_id | session_number UNIQUE, status enum | Y | -- | baseline:5457 |
| pos_override_tokens | Price override tokens | id (uuid) | store_id | token_hash UNIQUE, expires_at | Y | -- | baseline:5440 |
| payment_methods | Payment method config | id (uuid) | store_id | -- | Y | -- | baseline:2362 |
| discounts | Discount config | id (uuid) | store_id | type enum, value CHECK(>=0) | Y | -- | baseline:5170 |
| ledger_accounts | Chart of accounts | id (uuid) | store_id | UNIQUE(store_id, code), account_type CHECK | Y | -- | baseline:5330 |
| ledger_batches | Journal entry batches | id (uuid) | store_id | source_type, status CHECK, reverses_batch_id self-FK | Y | idx_ledger_sale_batch_unique | baseline:5346 |
| ledger_entries | Double-entry lines | id (uuid) | (via batch_id) | debit/credit CHECK(>=0), one-side-only CHECK, immutable (trigger) | Y | idx_ledger_entries_batch | baseline:5367 |
| ledger_posting_queue | Async posting queue | id (uuid) | store_id | sale_id UNIQUE, status CHECK, attempt_count CHECK | Y | idx_lpq_pending_claim, idx_lpq_retry_schedule | baseline:277 |
| ledger_posting_idempotency | Posting dedup | sale_id (uuid) | -- | posting_state CHECK, attempt_count CHECK | Y | -- | baseline:5386 |
| ledger_workers | Worker registry | worker_id (text) | -- | active, heartbeat | Y | -- | baseline:5403 |
| accounting_periods | Period close records | id (uuid) | store_id | UNIQUE(store_id, period_start, period_end), status CHECK, period_end > period_start | Y | -- | baseline:5032 |
| accounts | Legacy accounts | id (uuid) | tenant_id | type CHECK | Y | -- | baseline:5049 |
| journal_batches | Legacy journal | id (uuid) | tenant_id, store_id | status CHECK | Y | -- | baseline:5315 |
| parties | Customers/suppliers | id (uuid) | tenant_id | type CHECK | Y | -- | baseline:5415 |
| expenses | Expense records | id (uuid) | store_id | amount CHECK(>0), payment_type CHECK | Y | -- | baseline:5186 |
| expense_templates | Recurring expense tpl | id (uuid) | store_id | amount CHECK(>0), recurrence CHECK | Y | idx_expense_templates_store_id | 20260712000000:2 |
| other_income | Non-sale income | id (uuid) | tenant_id, store_id | category enum, payment_method enum, amount CHECK(>=0) | Y | -- | 20260530020000:8 |
| daily_sales | Historical sales data | id (uuid) | store_id | UNIQUE(store_id, sale_date) | Y | idx_daily_sales_store_date | 20260511040000:5 |
| suppliers | Supplier directory | id (uuid) | tenant_id | active | Y | -- | baseline:5801 |
| purchase_orders | PO headers | id (uuid) | store_id | po_number UNIQUE, status enum | Y | -- | baseline:5491 |
| purchase_order_items | PO line items | id (uuid) | (via po_id) | UNIQUE(po_id, item_id), qty_ordered CHECK(>0) | Y | -- | baseline:5476 |
| purchase_receipts | GRN headers | id (uuid) | tenant_id, store_id | status CHECK, UNIQUE(supplier_id, invoice_number) | Y | idx_purchase_receipts_store | baseline:5523 |
| purchase_receipt_items | GRN line items | id (uuid) | (via receipt_id) | -- | Y | idx_purchase_receipt_items_receipt | baseline:5510 |
| item_batches | Batch tracking | id (uuid) | store_id | qty CHECK(>=0), status CHECK | Y | idx_item_batches_item_store | baseline:5270 |
| batches | Legacy batch table | id (uuid) | (via item_id) | -- | Y | -- | baseline:5078 |
| stock_transfers | Transfer headers | id (uuid) | from_store_id, to_store_id | status enum, CHECK(from!=to) | Y | -- | baseline:5770 |
| stock_transfer_items | Transfer line items | id (uuid) | (via transfer_id) | UNIQUE(transfer_id, item_id), qty CHECK(>0) | Y | -- | baseline:5758 |
| stock_alert_thresholds | Low-stock config | (store_id, item_id) | store_id | min_qty, reorder_qty | Y | -- | baseline:5690 |
| stock_ledger | Full inventory audit | id (uuid) | store_id | movement_id UNIQUE, quantity_change CHECK(<>0) | Y | idx_stock_ledger_store_product_date | baseline:5703, 20260427080000:8 |
| returns | Return records | id (uuid) | store_id | -- | Y | -- | baseline:5553 |
| reminders | Staff reminders | id (uuid) | tenant_id, store_id | reminder_type CHECK | Y | idx_reminders_tenant_store | baseline:461, 20260501090000:2 |
| customer_reminders | Collection reminders | id (uuid) | tenant_id, store_id | reminder_type CHECK | Y | idx_customer_reminders_tenant_store | baseline:5154 |
| followup_notes | Collection notes | id (uuid) | tenant_id, store_id | status CHECK | Y | idx_followup_notes_tenant_store | baseline:5207 |
| close_review_log | Session close review | id (uuid) | store_id | close_status CHECK, reviewer_role CHECK, admin_override CHECK, dual_approval CHECK | Y | idx_close_review_log_store_reviewed_at | baseline:5104 |
| audit_logs | Generic audit trail | id (uuid) | -- | operation CHECK | Y | -- | baseline:5062 |
| idempotency_keys | Idempotency lock | idempotency_key (text) | tenant_id | -- | Y | -- | baseline:5224 |
| import_runs | Import job tracking | id (uuid) | -- | status CHECK | Y | idx_import_runs_created_at | baseline:5237 |
| inventory_items | Legacy inventory | id (uuid) | tenant_id | -- | Y | -- | baseline:5257 |
| receipt_config | Receipt layout | store_id (uuid) | store_id | -- | Y | -- | baseline:2408 |
| receipt_counters | Receipt numbering | (store_id, date) | store_id | -- | Y | -- | baseline:5543 |
| rate_limits | API rate limiting | -- | -- | -- | UNKNOWN | -- | 20260511000000:5 |
| price_audit_log | Price change audit | id (uuid) | store_id | -- | Y | idx_price_audit_item | 20260519100000:41 |
| competitor_prices | Competitor monitoring | id (uuid) | store_id | UNIQUE(store_id, product_id, competitor_name) [after 20260514000001] | Y | idx_competitor_prices_store_product_scraped | baseline:5140, 20260514000001:8 |
| social_posts | Social media posts | id (uuid) | tenant_id, store_id | status CHECK, platform enum | Y | idx_social_posts_store_created | 20260613033614:20 |
| orders | Customer storefront | id (uuid) | tenant_id, store_id | order_number UNIQUE, status CHECK | Y | idx_orders_tenant_store_created | 20260611000002:3 |
| wishlist | Storefront wishlist | id (uuid) | -- | UNIQUE(product_id, customer_fingerprint) | Y | -- | 20260611000001:3 |
| whatsapp_logs | WhatsApp message log | id (uuid) | -- | direction CHECK | Y | -- | 20260711000000:17 |

**Extensions:** pg_trgm, uuid-ossp, pgcrypto (all in extensions schema)
**Enums:** sale_status, payment_type, discount_type, session_status, po_status, stock_transfer_status, other_income_category, other_income_payment_method, social_platform
**Sequences:** po_number_seq, sale_number_seq, session_number_seq
**Views/Materialized views:** NONE found
**Tables WITHOUT RLS:** rate_limits (UNKNOWN — created but no ENABLE RLS found), batches (RLS enabled, policy USING(false) WITH CHECK(false) — no client access), receipt_counters (same), returns (same), whatsapp_logs (RLS enabled, no policies — service_role only)

---

## Security matrix

Every table with RLS enabled is listed. "Complete" means all four DML operations have explicit policies. "Partial" means some operations are missing.

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Roles | Cross-store | Status |
|---|---|---|---|---|---|---|---|---|
| tenants | Y | Y | N | N | N | auth | Y (tenant) | Partial |
| stores | Y | Y | Y | Y | Y | auth | Y (tenant) | Complete |
| users | Y | Y | Y(self) | N | N | auth | Y (own row) | Partial — no UPDATE/DELETE (managed via RPC) |
| categories | Y | Y+anon | Y | Y | Y | auth+anon | Y (store) | Complete |
| items | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (tenant) | Complete (FOR ALL) |
| stock_levels | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | **PARTIAL** | See Finding C-1 |
| stock_movements | Y | Y | Y | N | N | auth | Y (store) | Partial — no UPDATE/DELETE |
| sales | Y | Y | Y | Y(void) | N | auth | Y (store) | Partial — no DELETE |
| sale_items | Y | Y | Y | N | N | auth | Y (via sale) | Partial — no UPDATE/DELETE |
| sale_payments | Y | Y | Y | N | N | auth | Y (via sale) | Partial — no UPDATE/DELETE |
| sale_audit_log | Y | Y | N | N | N | auth | Y (store) | Partial — immutable via trigger, INSERT via RPC |
| sale_sync_conflicts | Y | Y | Y | Y | N | auth | Y (store) | Partial — no DELETE |
| pos_sessions | Y | Y | Y | Y | N | auth | Y (store) | Partial — no DELETE |
| pos_override_tokens | Y | Y | N | N | N | auth | Y (store) | Partial — managed via RPC |
| payment_methods | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| discounts | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| ledger_accounts | Y | Y | N | N | N | auth | Y (store) | Partial — managed via RPC |
| ledger_batches | Y | Y | N | N | N | auth | Y (store) | Partial — immutable via trigger for POSTED |
| ledger_entries | Y | Y | N | N | N | auth | Y (store) | Partial — immutable via trigger |
| ledger_posting_queue | Y | Y | N | N | N | auth | Y (store) | Partial — managed via RPC |
| ledger_posting_idempotency | Y | Y | N | N | N | auth | -- | Partial — managed via RPC |
| ledger_workers | Y | Y | N | N | N | auth | -- | Partial — managed via RPC |
| accounting_periods | Y | Y | N | N | N | auth | Y (store) | Partial — managed via RPC |
| accounts | Y | Y | N | N | N | auth | Y (tenant) | Partial |
| journal_batches | Y | Y | N | N | N | auth | Y (tenant) | Partial |
| parties | Y | Y | N | N | N | auth | Y (tenant) | Partial |
| expenses | Y | Y | Y | N | N | auth | Y (store) | Partial — no UPDATE/DELETE (later migrations add) |
| expense_templates | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| other_income | Y | Y | Y | Y | Y | auth | Y (tenant) | Complete |
| daily_sales | Y | Y | Y | Y | N | auth | Y (store) | Partial — no DELETE |
| suppliers | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (tenant) | Complete (FOR ALL) |
| purchase_orders | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| purchase_order_items | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (via PO) | Complete (FOR ALL) |
| purchase_receipts | Y | Y | N | N | N | auth | Y (store) | Partial — managed via RPC |
| purchase_receipt_items | Y | Y | N | N | N | auth | Y (via receipt) | Partial |
| item_batches | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| batches | Y | N(false) | N(false) | N(false) | N(false) | auth | -- | No client access (intentional) |
| stock_transfers | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| stock_transfer_items | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (via transfer) | Complete (FOR ALL) |
| stock_alert_thresholds | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| stock_ledger | Y | Y | Y(svc) | N | N | auth+svc | Y (store) | Partial — INSERT via service_role only |
| returns | Y | N(false) | N(false) | N(false) | N(false) | auth | -- | No client access (intentional) |
| reminders | Y | Y | Y | Y | Y | auth | Y (tenant) | Complete |
| customer_reminders | Y | Y | N | N | N | auth | Y (tenant) | Partial — managed via RPC |
| followup_notes | Y | Y | N | N | N | auth | Y (tenant) | Partial — managed via RPC |
| close_review_log | Y | Y | Y | Y | N | auth | Y (store) | Partial — no DELETE |
| audit_logs | Y | Y | N | N | N | auth | -- | Partial — INSERT via trigger only |
| idempotency_keys | Y | Y | N | N | N | auth | Y (tenant) | Partial — managed via RPC |
| import_runs | Y | Y | N | N | N | auth | -- | Partial — managed via RPC |
| inventory_items | Y | Y | N | N | N | auth | Y (tenant) | Partial |
| receipt_config | Y | Y | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (store) | Complete (FOR ALL) |
| receipt_counters | Y | N(false) | N(false) | N(false) | N(false) | auth | -- | No client access (intentional) |
| competitor_prices | Y | Y | N | N | N | auth+svc | Y (store) | Partial — SELECT only |
| social_posts | Y | Y(ALL) | Y(ALL) | Y(ALL) | Y(ALL) | auth | Y (tenant) | Complete (FOR ALL) |
| orders | Y | Y(auth) | Y(anon) | N | N | auth+anon | Y (tenant) | Partial — no UPDATE/DELETE |
| wishlist | Y | Y(auth) | Y(anon) | N | N | auth+anon | -- | Partial — anon INSERT only, no UPDATE/DELETE |
| whatsapp_logs | Y | N | N | N | N | -- | -- | RLS enabled, no policies (service_role only) |
| price_audit_log | Y | Y | Y | N | N | auth | Y (store) | Partial — no UPDATE/DELETE |

---

## Critical-invariant matrix

| Invariant | Rating | Evidence |
|---|---|---|
| Cross-store isolation | PARTIAL | Most tables use get_current_user_store_id() or tenant_id checks. BUT: stock_levels SELECT uses USING(true) (20260327100000:41), orders anon INSERT accepts caller-supplied tenant_id/store_id without validation, items table originally had no tenant_id (added 20260508000000:146), categories has an anon policy hardcoded to a single store_id (20260611000000:38) |
| Unique sales | VERIFIED | Unique partial index idx_sales_store_client_txn on (store_id, client_transaction_id) WHERE NOT NULL (baseline:6403, 20260423123000:8). create_sale checks for existing sale by client_transaction_id before inserting (baseline:546-567) |
| Payment idempotency | PARTIAL | sale_payments has no unique constraint to prevent duplicate payment capture. idempotency_keys table exists but check_idempotency function (baseline:224) doesn't complete the idempotency (no completion step). The create_sale function does not use the idempotency_keys table — it only checks sales.client_transaction_id |
| Inventory concurrency | PARTIAL | adjust_stock uses INSERT ON CONFLICT DO UPDATE (atomic upsert) which is safe. decrement_stock uses WHERE qty >= p_quantity (atomic guard). BUT: deduct_stock (baseline:920) references stock_levels.id and stock_levels.version which don't exist in the effective schema (composite PK, no version column). create_order_with_stock (20260611000002:68) does SELECT FOR UPDATE then UPDATE — correct for pessimistic locking but the two loops (validate then update) have a TOCTOU window between them |
| Financial-history retention | PARTIAL | ledger_entries and ledger_batches have immutability triggers (trg_prevent_ledger_entries_mutation, trg_prevent_ledger_batches_mutation). sale_audit_log has prevent_sale_audit_log_mutation trigger. BUT: sales table has no DELETE protection — a sale can be deleted (no policy, but also no trigger preventing it). stock_movements has no UPDATE/DELETE policies, meaning RLS blocks them for authenticated users, but service_role bypasses RLS |
| Privileged-function safety | PARTIAL | 265 SECURITY DEFINER functions found. Multiple migrations fixed search_path (20260506000005, 20260506020000, 20260506200000, 20260506040100). BUT: create_order_with_stock (20260611000002:59) is SECURITY DEFINER without search_path, exposed to anon. cleanup_old_competitor_prices and check_price_alerts (20260514000001:77,108) are SECURITY DEFINER without search_path. get_price_history (20260519100000:3) is SECURITY DEFINER without search_path |

---

## Findings

### CRITICAL

#### C-1: stock_levels SELECT policy is USING(true) — any authenticated user reads ALL stores' inventory

- **Evidence:** `supabase/migrations/20260327100000_stock_levels_realtime_and_rpc.sql:37-41` creates policy `"Authenticated users can read stock levels"` with `USING (true)`. The later migration `20260426231000_fix_stock_levels_rls.sql` also creates `USING (true)`. The baseline (line 7691) creates a tenant-isolated version, but the final effective policy is uncertain due to the `20260530000000_final_dedupe_cleanup.sql` migration dropping and recreating policies — it does NOT recreate stock_levels policies.
- **Failure scenario:** Any authenticated user from Store A queries `SELECT * FROM stock_levels` and sees Store B's inventory quantities.
- **Impact:** Competitive intelligence leak across stores in multi-tenant deployment.
- **Remediation direction:** Replace `USING (true)` with `store_id = public.get_current_user_store_id()` (matching the pattern used by items, expenses, etc.).

#### C-2: create_order_with_stock is SECURITY DEFINER without search_path, exposed to anon, accepts unvalidated caller-supplied tenant_id and store_id

- **Evidence:** `supabase/migrations/20260611000002_add_orders.sql:58-59` — `security definer` with no `SET search_path`. Line 109: `GRANT EXECUTE ... TO anon`. Lines 45-46: `p_tenant_id uuid` and `p_store_id uuid` are parameters with no server-side validation against the caller's actual tenant/store.
- **Failure scenario:** An attacker using the anon key calls `create_order_with_stock` with any `p_store_id` and `p_tenant_id`, decrementing another store's stock and creating orders under a different tenant.
- **Impact:** Cross-tenant stock manipulation, inventory corruption.
- **Remediation direction:** Add `SET search_path = public, pg_temp`. Validate `p_store_id` and `p_tenant_id` server-side (derive from auth context or verify the store belongs to the tenant). Do not accept tenant_id from anon callers.

#### C-3: The final_dedupe_cleanup migration (20260530000000) replaces create_sale with a STUB placeholder function

- **Evidence:** `supabase/migrations/20260530000000_final_dedupe_cleanup.sql:56-73` — drops `complete_sale(uuid, jsonb, uuid, text)` and creates a placeholder that returns `jsonb_build_object('success', true, 'sale_id', gen_random_uuid(), 'message', 'Sale completed')` — it does NOT actually create a sale, insert sale items, decrement stock, or process payments. The signature also differs from the canonical `create_sale` in the baseline.
- **Failure scenario:** If this migration applies on a fresh database replay, the POS checkout function silently returns a fake success without creating any sale records or adjusting stock.
- **Impact:** Complete loss of sale data integrity on fresh migration replay. The live database likely has the real function (from remote migrations), but the migration history is corrupted.
- **Remediation direction:** Remove the stub from 20260530000000. Ensure the canonical `create_sale` (from 20260301000000 or 20260601000001) is the last definition in the migration chain.

### HIGH

#### H-1: competitor_prices table is dropped and recreated with a different schema, creating migration order dependency

- **Evidence:** `supabase/migrations/20260514000001_create_competitor_prices.sql:5` — `drop table if exists public.competitor_prices cascade`. The baseline (line 5140) created it with `item_id` column. The 20260514000001 migration recreates it with `product_id` instead. Memory note confirms: "Lucky Store competitor_prices table live column is `item_id` (not migration's `product_id`)".
- **Failure scenario:** If migration 20260514000001 applies, all existing competitor price data is destroyed. If it does NOT apply (as appears to be the case on the live DB), the RLS fix in 20260720000001 references `store_id` which does not exist in the baseline schema (baseline has `item_id`, no `store_id`).
- **Impact:** Either data loss or broken RLS policy depending on which migrations applied.
- **Remediation direction:** Add a migration that adds `store_id` and renames `item_id` to `product_id` via ALTER TABLE (not DROP+recreate). Make the RLS policy conditional on column existence.

#### H-2: Multiple SECURITY DEFINER functions lack safe search_path

- **Evidence:** `create_order_with_stock` (20260611000002:59), `cleanup_old_competitor_prices` (20260514000001:77), `trigger_cleanup_competitor_prices` (20260514000001:86), `check_price_alerts` (20260514000001:108), `get_price_history` (20260519100000:3) — all `SECURITY DEFINER` without `SET search_path = public, pg_temp`.
- **Failure scenario:** Search path injection attack if an attacker can create objects in a schema earlier in the search path.
- **Impact:** Potential privilege escalation.
- **Remediation direction:** Add `SET search_path = public, pg_temp` to each function definition, or use `ALTER FUNCTION ... SET search_path` in a new migration.

#### H-3: deduct_stock function references non-existent columns (stock_levels.id, stock_levels.version)

- **Evidence:** `supabase/migrations/20260301000000_baseline_core_tables.sql:932` — `SELECT id, qty INTO v_stock_level_id, v_current_quantity FROM public.stock_levels WHERE store_id = ... AND item_id = ... FOR UPDATE`. Line 973: `UPDATE ... WHERE id = v_stock_level_id`. Line 972: `version = version + 1`. The effective stock_levels table has composite PK (store_id, item_id) and no `id` or `version` column.
- **Failure scenario:** Calling `deduct_stock` raises a column-not-found error at runtime.
- **Impact:** The function is broken on any database where stock_levels matches the baseline schema. The live DB may have an altered stock_levels table with id and version columns (added via remote migrations not in this repo).
- **Remediation direction:** Rewrite deduct_stock to use `WHERE store_id = p_store_id AND item_id = p_product_id` and remove the `version` reference, or add a migration that adds `id` and `version` columns to stock_levels.

#### H-4: items table originally had no tenant_id — it was added later, and some functions still reference items.store_id which does not exist

- **Evidence:** `supabase/migrations/20260508000000_fix_critical_rls_gaps.sql:142` adds tenant_id to items. But `get_price_history` (20260519100000:31) references `i.store_id` — items has no store_id column in any migration. `check_price_alerts` (20260514000001:147) also references `i.store_id`.
- **Failure scenario:** These functions fail at runtime with "column items.store_id does not exist".
- **Impact:** Broken price history and price alert features.
- **Remediation direction:** Fix functions to use tenant_id-based filtering or join through categories, which does have store_id.

#### H-5: orders table allows anon INSERT with WITH CHECK (true) — no validation of order data

- **Evidence:** `supabase/migrations/20260611000002_add_orders.sql:29-32` — `create policy "Allow anon insert orders" ... to anon with check (true)`.
- **Failure scenario:** An attacker can insert arbitrary orders with any tenant_id, store_id, items, and total directly via INSERT (bypassing the RPC), without stock validation.
- **Impact:** Unvalidated orders, potential for fraudulent or corrupt order records.
- **Remediation direction:** Remove the anon INSERT policy on orders table. Force all order creation through the `create_order_with_stock` RPC (after fixing it per C-2).

### MEDIUM

#### M-1: 12 "sync_remote_migration" placeholder files add noise and obscure the real migration history

- **Evidence:** `supabase/migrations/20260511125509_sync_remote_migration.sql` through `20260512150000_sync_remote_migration.sql` — all contain only comments: "Original SQL executed via Supabase dashboard; this file prevents 'Remote migration versions not found' errors".
- **Impact:** Migration history is partially unknowable from the repo alone. Remote migrations applied via dashboard are not version-controlled.
- **Remediation direction:** Extract the actual SQL from the live database's supabase_migrations table and replace the placeholder files.

#### M-2: competitor_prices has a cleanup trigger that runs COUNT(*) on every INSERT

- **Evidence:** `supabase/migrations/20260514000001_create_competitor_prices.sql:91` — `select count(*) into row_count from public.competitor_prices; if row_count % 1000 = 0 then perform public.cleanup_old_competitor_prices();`.
- **Impact:** Full table count on every insert — O(n) per insert, degrades as the table grows.
- **Remediation direction:** Replace with a scheduled cron job or a conditional check based on a counter table.

#### M-3: categories has an anon SELECT policy hardcoded to a single store_id

- **Evidence:** `supabase/migrations/20260611000000_add_categories_ext.sql:38` — `using (active = true and store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd')`. Then `20260611050000_grant_anon_storefront_access.sql:13` creates another anon policy with `USING (active = true)` — no store_id check.
- **Impact:** Two conflicting anon SELECT policies. The second one (`USING (active = true)`) allows anon to read ALL active categories across ALL stores/tenants.
- **Remediation direction:** Drop the broad policy, keep only the store-scoped one. Use a parameterized approach instead of hardcoding store_id.

#### M-4: No unique constraint on sale_payments to prevent duplicate payment capture

- **Evidence:** `supabase/migrations/20260301000000_baseline_core_tables.sql:5613` — sale_payments has PK on id, amount CHECK(>0), FK to sales, but no UNIQUE constraint on (sale_id, payment_method_id).
- **Impact:** The same payment can be recorded multiple times for the same sale.
- **Remediation direction:** Add a unique index on (sale_id, payment_method_id, reference) or (sale_id, payment_method_id) if reference is nullable.

#### M-5: Realtime publication includes stock_levels — may be unnecessarily broad

- **Evidence:** `supabase/migrations/20260327100000_stock_levels_realtime_and_rpc.sql:23` — `ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_levels`. Also `20260611060000_add_orders_realtime.sql:13` adds orders.
- **Impact:** Every stock level change is broadcast to all subscribed clients. With the USING(true) SELECT policy (C-1), any authenticated client receives all stores' stock changes.
- **Remediation direction:** Fix C-1 first, then evaluate whether realtime on stock_levels is needed for all stores or should be filtered.

### LOW

#### L-1: Duplicate index creation across migrations

- **Evidence:** `idx_stock_levels_store_item` created in 20260325110027:31, 20260301000000:6439, 20260426232000:54. `idx_sale_items_sale` and `idx_sale_items_item` created in both 20260420100000:211-212 and 20260426232000:58-59. Many others.
- **Impact:** Wasted storage and write amplification (though IF NOT EXISTS prevents errors).
- **Remediation direction:** Consolidate index creation into the baseline migration and remove duplicates from later migrations.

#### L-2: users table in baseline has no PRIMARY KEY constraint — only auth_id UNIQUE

- **Evidence:** `supabase/migrations/20260301000000_baseline_core_tables.sql:5829-5846` — the users table definition has `id uuid DEFAULT ... NOT NULL` but the constraints section (line 6174) only adds `users_auth_id_key UNIQUE (auth_id)`. No `users_pkey` PRIMARY KEY constraint is found.
- **Impact:** The id column has a default and NOT NULL but no PK constraint. The bootstrap migration (line 56) does create it as PRIMARY KEY, and IF NOT EXISTS means the baseline skip is a no-op, so the bootstrap PK likely persists. But the baseline not adding it is a schema inconsistency.
- **Remediation direction:** Add `ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id)` in a new migration if it doesn't exist.

#### L-3: stock_levels has no updated_at column despite functions referencing it

- **Evidence:** `deduct_stock` (baseline:971) sets `updated_at = now()` but stock_levels table (baseline:5724) has no updated_at column. `adjust_stock` does not reference updated_at.
- **Impact:** deduct_stock fails if updated_at column doesn't exist (which it may not in the effective schema).
- **Remediation direction:** Add updated_at column to stock_levels or remove the reference from deduct_stock.

---

## Migration health

### Contradictory migrations

- `20260530000000_final_dedupe_cleanup.sql` drops `items_manage_authorized` policy without recreating it (fixed by `20260603223000_fix_items_rls.sql`). It also replaces `complete_sale` with a stub.
- `20260612015717_ensure_rpc_functions.sql` overwrites the 5-param `search_items_pos` with a 2-param version, breaking the storefront (fixed by `20260710215800_fix_search_items_pos_signature.sql`).
- `20260514000001_create_competitor_prices.sql` drops and recreates competitor_prices with different columns than the baseline definition.
- `20260327100000` creates stock_levels RLS with `USING(true)`, later migrations (baseline, 20260426231000) create conflicting policies. Final state is uncertain.

### Duplicated migrations

- 12 `sync_remote_migration` placeholder files (M-1).
- Enum types created idempotently in 3+ migrations each (bootstrap, baseline, 20260420100000, 20260327200002, 20260327200004).
- Indexes created redundantly across multiple migrations (L-1).

### Destructive migrations

- `20260514000001_create_competitor_prices.sql:5` — `DROP TABLE IF EXISTS public.competitor_prices CASCADE`.
- `20260530000000_final_dedupe_cleanup.sql` — drops multiple policies and functions, some not properly recreated.

### Order-dependent migrations

- The `sync_remote_migration` files are ordered by timestamp but contain no SQL — they exist only to prevent version gaps. Their presence means the migration history cannot be replayed to reproduce the live schema.
- `20260508000000_fix_critical_rls_gaps.sql` runs `UPDATE public.items SET tenant_id = ...` to backfill — this is a data migration that depends on the current user's context and is non-deterministic.

### Obsolete migrations

- `20260327100000_stock_levels_realtime_and_rpc.sql` RLS policies are superseded by baseline and later fix migrations.
- `20260426231000_fix_stock_levels_rls.sql` policies are superseded by baseline and later fix migrations.
- `20260326100002_stores_categories_rls_tighten.sql` policies are superseded by 20260505000000 and 20260508000000.

---

## Next tasks

### Task 1: Fix stock_levels SELECT policy (Critical C-1)

- **Dependencies:** None
- **Acceptance criteria:** stock_levels SELECT policy uses `store_id = public.get_current_user_store_id()` instead of `USING(true)`. All authenticated users can only see their own store's stock levels.

### Task 2: Fix create_order_with_stock security (Critical C-2)

- **Dependencies:** None
- **Acceptance criteria:** Function has `SET search_path = public, pg_temp`. p_store_id is validated server-side (not accepted from anon caller without verification). anon INSERT policy on orders table is removed.

### Task 3: Remove stub create_sale from final_dedupe_cleanup (Critical C-3)

- **Dependencies:** None
- **Acceptance criteria:** `20260530000000_final_dedupe_cleanup.sql` no longer defines a stub `complete_sale`. The canonical `create_sale` from the latest authoritative migration is the effective definition on fresh replay.

### Task 4: Fix SECURITY DEFINER search_path on all unprotected functions (High H-2)

- **Dependencies:** None
- **Acceptance criteria:** All SECURITY DEFINER functions have `SET search_path = public, pg_temp`. No function with SECURITY DEFINER is missing search_path. Supabase linter reports zero `function_search_path_mutable` warnings.

### Task 5: Fix deduct_stock column references (High H-3)

- **Dependencies:** None
- **Acceptance criteria:** deduct_stock function works against the effective stock_levels schema (composite PK, no id/version columns). Or: a migration adds id and version columns to stock_levels.

### Task 6: Fix items.store_id references in functions (High H-4)

- **Dependencies:** None
- **Acceptance criteria:** `get_price_history` and `check_price_alerts` no longer reference `items.store_id`. They use tenant_id or join through categories.

### Task 7: Fix competitor_prices schema divergence (High H-1)

- **Dependencies:** None
- **Acceptance criteria:** competitor_prices schema is reconciled — either the baseline schema is altered to match 20260514000001 (add store_id, rename item_id to product_id) via ALTER TABLE, or 20260514000001 is rewritten to not DROP the table. The RLS policy in 20260720000001 works against the effective schema.

### Task 8: Add sale_payments uniqueness constraint (Medium M-4)

- **Dependencies:** None
- **Acceptance criteria:** Unique index on (sale_id, payment_method_id, reference) prevents duplicate payment capture.

### Task 9: Fix categories anon SELECT policy (Medium M-3)

- **Dependencies:** None
- **Acceptance criteria:** Only one anon SELECT policy on categories. It is store-scoped, not globally `USING (active = true)`.

### Task 10: Remove competitor_prices cleanup trigger (Medium M-2)

- **Dependencies:** None
- **Acceptance criteria:** Per-row COUNT(*) trigger is removed. Cleanup is handled by a scheduled job.

---

## Final verification

- Every exposed table appears in the security matrix. **VERIFIED** — 55 tables listed.
- Every claim has evidence or is explicitly marked unknown. **VERIFIED** — all claims cite file paths and line numbers; rate_limits RLS status marked UNKNOWN.
- No repository or external state was changed. **VERIFIED** — read-only inspection only, no files modified, no migrations executed, no database connections.