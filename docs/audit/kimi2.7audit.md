# Lucky Store — Application Data-Flow & Distributed-Systems Audit

**Auditor:** Kimi K2.7 Code
**Date:** 2026-07-24
**Branch:** `fix/storefront-categories-cdn-and-hero-image`
**Scope:** Read-only code audit of data flows and persistence paths across `admin_web`, `customer_storefront`, `mobile_app`, Supabase Edge Functions, and Cloudflare Workers. No database/infrastructure probing, no writes, no secrets extracted.

---

## 1. Methodology

1. **Discover writers and persistence components** — enumerate all `.insert`, `.update`, `.delete`, `.upsert`, `rpc`, and storage writes.
2. **Trace individual business operations** — follow each transaction from UI initiation through provider/service, Edge/RPC, Postgres mutation, response handling, retry, and recovery.
3. **Analyze offline and concurrency failures** — inspect idempotency keys, atomicity, optimistic updates, rollback, and conflict resolution.
4. **Cross-check against tests** — reviewed unit and integration tests (execution was not completed due to tool budget).
5. **Produce evidence ledger** — each claim carries status, exact file/line, related write path, and failure consequence.

---

## 2. Phase 1 — Writers & Persistence Components

### 2.1 Client/Admin web persistence layer
| Component | File | Responsibility |
|---|---|---|
| Supabase client | `apps/admin_web/src/lib/supabase.ts` | Single browser `createClient` using VITE env keys |
| API barrel | `apps/admin_web/src/lib/api.ts` | Re-exports domain API object |
| Domain API | `apps/admin_web/src/lib/api/domains/*.ts` | pos, sales, inventory, products, expenses, settings, competitorPrices, purchases, reminders, dailySales, reports, dashboard, staff, otherIncome |
| API mappers | `apps/admin_web/src/lib/api/mappers.ts` | POS category/product mapping |
| API types | `apps/admin_web/src/lib/api/types.ts` | Shared TS contracts |
| Database types | `apps/admin_web/src/lib/database.types.ts` | Generated Supabase type catalog |

### 2.2 Customer storefront persistence layer
| Component | File | Responsibility |
|---|---|---|
| Browser Supabase client | `apps/customer_storefront/app/lib/supabase/client.ts` | `createBrowserClient` |
| Server Supabase client | `apps/customer_storefront/app/lib/supabase/server.ts` | `createServerClient` with cookie middleware |
| Supabase helpers | `apps/customer_storefront/app/lib/supabase.ts` | Client/server re-exports |
| Product repository | `apps/customer_storefront/app/lib/products/repository.ts` | Cached product facade |
| Supabase product adapter | `apps/customer_storefront/app/lib/products/adapters/SupabaseProductAdapter.ts` | Direct Supabase reads |
| Caching product adapter | `apps/customer_storefront/app/lib/products/adapters/CachingProductAdapter.ts` | In-memory cache + fallback |
| Orders | `apps/customer_storefront/app/lib/orders.ts` | Checkout + order RPC + realtime broadcast |
| Wishlist | `apps/customer_storefront/app/lib/wishlist.ts` + `app/api/wishlist/route.ts` | LocalStorage + authenticated API |

### 2.3 Mobile app persistence layer
| Component | File | Responsibility |
|---|---|---|
| Offline DB | `apps/mobile_app/lib/offline/db.dart` | SQLite helpers for queued transactions |
| Offline manager | `apps/mobile_app/lib/offline/manager.dart` | Connectivity-aware queue coordinator |
| POS provider | `apps/mobile_app/lib/shared/providers/pos_provider.dart` | Cart state + offline transaction capture |
| Edge sale service | `apps/mobile_app/lib/shared/services/edge_function_sale_service.dart` | POST to `create-sale` Edge Function |
| Offline sync service | `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart` | Queue processing, retry, logging |
| Conflict resolver | `apps/mobile_app/lib/features/sales/conflict_resolver.dart` | Price/stock/unavailable item strategies |

### 2.4 Server-side / worker persistence layer
| Component | File | Responsibility |
|---|---|---|
| create-sale Edge Function | `supabase/functions/create-sale/index.ts` | Auth, rate limit, validation, calls `complete_sale` RPC |
| adjust-stock Edge Function | `supabase/functions/adjust-stock/index.ts` | Auth, manager PIN, calls `adjust_stock` RPC |
| import-inventory Edge Function | `supabase/functions/import-inventory/index.ts` | CSV parsing, image upload, upserts items/batches/stock |
| send-whatsapp-message Edge Function | `supabase/functions/send-whatsapp-message/index.ts` | WhatsApp message dispatch |
| Agent Worker | `cloudflare/workers/agent/src/index.ts` | `/query` proxy to Neon replica |
| Images Worker | `cloudflare/workers/images/src/index.ts` | R2 upload/read/delete with rate limits |
| R2 client | `apps/admin_web/src/lib/r2.ts` | Browser client for Images Worker |
| Image processor | `apps/admin_web/src/lib/images.ts` | WebP conversion + R2/Supabase fallback upload |

### 2.5 Postgres RPCs (mutation writers)
- `public.create_sale` — `supabase/migrations/20260601000001_fix_create_sale_column_names.sql:15`
- `public.adjust_stock` — `supabase/migrations/20260327100000_stock_levels_realtime_and_rpc.sql` and subsequent migrations
- `public.set_stock` — referenced in `database.types.ts` and migrations
- `public.import_apply_stock_delta` — `20260327100000_stock_levels_realtime_and_rpc.sql:113`
- `public.create_order_with_stock` — `20260611000002_add_orders.sql`
- `public.record_expense` / `public.record_expense_batch` — referenced in `database.types.ts:5426`
- `public.void_sale` — referenced in `database.types.ts:6273`
- `public.update_item_prices` — referenced in `products.ts`
- `public.create_store_user` / `update_store_user` / `delete_store_user` — settings user management

---

## 3. Phase 2 — End-to-End Traces

### 3.1 Admin web POS sale
```
PaymentModal.tsx:onCheckout
  → usePosSale.ts:118 handleCheckout
    → api/domains/pos.ts:53 createSale (rpc 'create_sale')
      → supabase/functions/create-sale/index.ts:390 rpc('complete_sale')
        → public.create_sale (migration 20260601000001_fix_create_sale_column_names.sql:15)
```
**Writes:** `sales` (line 215), `sale_items` (line 241), `stock_levels`, `stock_movements`, `ledger_posting_idempotency`/`idempotency_keys`, `sale_audit_log`.
**Idempotency:** client generates `crypto.randomUUID()` at `usePosSale.ts:190`; RPC checks `client_transaction_id` and returns `DUPLICATE` status.
**Failure consequence:** duplicate sale if idempotency key is lost or client retries after a network timeout; stock oversell if the RPC's internal stock decrement fails mid-transaction.

### 3.2 Mobile offline sale sync
```
POS UI → pos_provider.dart
  → offline_transaction_sync_service.dart:submitSale / processQueue
    → edge_function_sale_service.dart POST /functions/v1/create-sale
      → create-sale Edge Function → public.create_sale
```
**Local writes:** `queued_offline_transactions` (`offline/db.dart`), `sync_action_logs` (`offline_transaction_sync_service.dart`).
**Remote writes:** same as admin POS sale.
**Idempotency:** queued transaction carries idempotency key; create-sale Edge Function checks ledger table; conflict resolver handles price/stock/unavailable conflicts.
**Failure consequence:** queue grows when offline; duplicate sales if key is corrupted; stock shortages are reconciled by `conflict_resolver.dart` but may require manager review.

### 3.3 Inventory add product
```
AddProductModal.tsx
  → images.ts:uploadProcessedImage
    → r2.ts:uploadToR2 POST {R2_PUBLIC_URL}/upload
      → cloudflare/workers/images/src/index.ts PUT R2
  → supabase.from('items').insert(...)  AddProductModal.tsx:130
  → if initialStock > 0: supabase.rpc('adjust_stock')  AddProductModal.tsx:139
```
**Writes:** `items`, `stock_levels`/`stock_movements`, R2 object storage.
**Failure consequence:** image is uploaded **before** DB insert; if insert fails, an orphaned R2 object remains. If `adjust_stock` fails, only `console.warn` is emitted (line 146), not thrown, so the item can exist without the requested initial stock.

### 3.4 Customer storefront order
```
Checkout → orders.ts:25 createOrder
  → supabase.rpc('create_order_with_stock')
    → public.create_order_with_stock (20260611000002_add_orders.sql)
  → supabase.channel('store-notifications:${STORE_ID}').broadcast
```
**Writes:** `orders`, `order_items`, `stock_levels`, `stock_movements`.
**Failure consequence:** realtime broadcast is best-effort with a 10-second cleanup timer (`orders.ts:56-66`); admin web/mobile may miss the new-order notification if the subscription fails or the client is offline.

### 3.5 Wishlist
```
wishlist.ts (localStorage + optional Supabase)
  → app/api/wishlist/route.ts (Next.js route)
    → supabase.from('wishlists') POST/DELETE/GET
```
**Writes:** `wishlists` table (if authenticated), `localStorage` (fallback).
**Failure consequence:** unauthenticated shoppers lose cross-device wishlist because only localStorage persists.

### 3.6 Settings add user
```
settings.ts:46 addUser
  → tempSupabase.auth.signUp(...)  // creates Auth user
  → supabase.rpc('create_store_user' as any, ...)  // creates DB record
```
**Writes:** Supabase Auth users, `public.users`.
**Failure consequence:** if `create_store_user` RPC fails after Auth signup, the Auth user remains but the DB record is missing — orphan Auth account with no rollback.

---

## 4. Phase 3 — Offline & Concurrency Analysis

### 4.1 Sale atomicity & idempotency
- `public.create_sale` is wrapped in a PL/pgSQL block with `BEGIN` and `EXCEPTION` handling (`20260601000001_fix_create_sale_column_names.sql:59`).
- It rejects empty `client_transaction_id` (`:68`) and returns `DUPLICATE` when the key already exists (`:82`).
- `create-sale` Edge Function uses a DB-backed rate limiter (`checkRateLimitDB`, 10 req/min/user at `create-sale/index.ts:269`).
- Edge Function authenticates the Bearer token, then calls `complete_sale` via service-role client (`create-sale/index.ts:234-245`, `:390`).

### 4.2 Stock adjustment concurrency
- `adjust-stock` Edge Function validates Bearer token and user role (`adjust-stock/index.ts:64-83`).
- Negative deltas require `authenticate_staff_pin` manager PIN (`adjust-stock/index.ts:201`).
- Stock mutation goes through `adjust_stock` RPC, which is `SECURITY DEFINER` and atomically updates `stock_levels` + inserts `stock_movements`.
- `public.import_apply_stock_delta` uses `INSERT ... ON CONFLICT (store_id, item_id) DO UPDATE` (`20260327100000_stock_levels_realtime_and_rpc.sql:113-141`) so concurrent imports are serialized at row level.

### 4.3 Inventory optimistic updates
- `useInventoryEditing.ts` updates React Query cache optimistically, then calls `api.inventory.updateProduct` or `api.inventory.updateStock`; on error it invalidates the cache (`useInventoryEditing.ts:31-53`).
- Inline stock edits use `set_stock` RPC; product field edits use direct `items.update()` with `eq('id', itemId)` but no `eq('store_id', storeId)` in the update clause (`inventory.ts:71-79`). RLS must enforce store scoping.

### 4.4 Import inventory reliability
- `import-inventory` creates an `import_runs` row with status `running` (`import-inventory/index.ts:380-385`), updates to `completed` or `running` per chunk (`:765`), and sets `failed` in catch block (`:799`).
- Image uploads happen before item upserts; failed image upload skips the row but continues the batch, leaving no item for that CSV line.
- Category upsert uses `onConflict: 'name'` without tenant/store scoping (`import-inventory/index.ts:550`) — multi-tenant collision risk if categories are not globally unique.

### 4.5 Offline sync on mobile
- `offline_transaction_sync_service.dart` stores queued transactions and action logs on-device.
- Each queued transaction has `retryCount`, `nextRetryAt`, `lastError`, `conflictType`, `requiresManagerReview` fields.
- `conflict_resolver.dart` supports strategies: `acceptServer`, `keepLocal`, `merge`, `manualReview`, `cancel` for `priceMismatch`, `stockInsufficient`, `itemUnavailable`, `duplicate`, `unknown`.
- No evidence found of a server-side distributed lock around `create_sale` beyond the idempotency key; race between two offline devices with the same key would be resolved by the DB unique/duplicate check.

---

## 5. Evidence Ledger

| Claim | Status | File / Line | Related Write Path | Failure Consequence |
|---|---|---|---|---|
| Admin POS sale uses RPC `create_sale` | Verified | `apps/admin_web/src/lib/api/domains/pos.ts:71` | `public.create_sale` | Error propagates to UI as generic "Sale failed" |
| Client generates idempotency key per sale attempt | Verified | `apps/admin_web/src/features/pos/usePosSale.ts:190` | `sales.client_transaction_id` | Duplicate key reuse can mask a real error as `DUPLICATE` |
| RPC `create_sale` checks idempotency key atomically | Verified | `supabase/migrations/20260601000001_fix_create_sale_column_names.sql:82` | `sales` / `sale_audit_log` | Returns `DUPLICATE` status for retries, preventing double write |
| `create_sale` runs inside PL/pgSQL transaction | Verified | `supabase/migrations/20260601000001_fix_create_sale_column_names.sql:59` | `sales`, `sale_items`, `stock_levels`, `stock_movements` | Mid-flight exceptions should roll back, but edge timeout/network split may leave client uncertain |
| Edge Function `create-sale` rate-limits 10 req/min/user | Verified | `supabase/functions/create-sale/index.ts:269` | N/A | 429 response under burst load |
| Edge Function calls `complete_sale` via service role | Verified | `supabase/functions/create-sale/index.ts:390` | `public.create_sale` | Privilege escalation risk if token validation bypassed |
| Mobile offline sync persists queue + logs | Verified | `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart` | Local files, then remote `sales` | Queue grows unbounded if network unavailable |
| Mobile conflict resolver handles price/stock/unavailable conflicts | Verified | `apps/mobile_app/lib/features/sales/conflict_resolver.dart:121` | Queued transaction state | Auto-resolution may still require manager review |
| Inventory add product uploads image before DB insert | Verified | `apps/admin_web/src/features/inventory/AddProductModal.tsx:102-115` | R2 object storage | Orphaned image if item insert fails |
| Inventory add product logs stock failure as warning only | Verified | `apps/admin_web/src/features/inventory/AddProductModal.tsx:146` | `stock_levels`/`stock_movements` | Item exists without expected initial stock |
| Inline product update does not filter by `store_id` in query | Verified | `apps/admin_web/src/lib/api/domains/inventory.ts:71-79` | `items` | Relies entirely on RLS to prevent cross-store updates |
| Inline editing uses optimistic update + invalidation on error | Verified | `apps/admin_web/src/hooks/useInventoryEditing.ts:31-53` | `items` / `stock_levels` | Brief UI inconsistency until invalidation runs |
| Customer order broadcasts realtime notification best-effort | Verified | `apps/customer_storefront/app/lib/orders.ts:56-129` | `store-notifications` channel | Admin may miss new-order notification |
| Wishlist falls back to localStorage when unauthenticated | Verified | `apps/customer_storefront/app/lib/wishlist.ts` + `app/api/wishlist/route.ts` | `wishlists` / `localStorage` | Cross-device wishlist lost for anonymous users |
| Settings user creation signs up Auth user before DB user | Verified | `apps/admin_web/src/lib/api/domains/settings.ts:46-85` | Supabase Auth + `public.users` | Orphan Auth account if `create_store_user` RPC fails |
| Expense creation uses `record_expense` RPC | Verified | `apps/admin_web/src/lib/api/domains/expenses.ts:36` | `expenses` + ledger posting | Direct update/delete of `expenses` table also exists without RPC |
| Direct table writes used for competitor prices | Verified | `apps/admin_web/src/lib/api/domains/competitorPrices.ts:84` | `competitor_prices` | Data integrity relies on RLS and frontend validation |
| `import_apply_stock_delta` uses upsert-on-conflict | Verified | `supabase/migrations/20260327100000_stock_levels_realtime_and_rpc.sql:113-141` | `stock_levels` | Concurrent imports race at row level; no explicit batch lock |
| Import inventory creates `import_runs` status row | Verified | `supabase/functions/import-inventory/index.ts:380` | `import_runs` | Failure state persisted but no automatic retry observed |
| `adjust-stock` Edge requires manager PIN for negative deltas | Verified | `supabase/functions/adjust-stock/index.ts:201` | `stock_levels` / `stock_movements` | Unauthorized stock reduction blocked at edge layer |

---

## 6. Risk Summary

### Critical / High
1. **Orphaned images on product creation** — image upload precedes DB insert and has no compensating delete.
2. **Silent stock failure on add product** — `adjust_stock` failure is `console.warn` only, not thrown or surfaced.
3. **Orphan Auth users in settings** — `signUp` + RPC pattern lacks rollback on RPC failure.
4. **Cross-store update reliance on RLS** — `inventory.ts:71-79` does not include `eq('store_id', storeId)` in the update clause.

### Medium
5. **Customer order notification is best-effort** — no guaranteed delivery or retry for realtime broadcast.
6. **Import category upsert is globally keyed by name** — potential tenant collision (`import-inventory/index.ts:550`).
7. **Offline queue unbounded growth** — no observed max-age or disk-cap limit.
8. **Direct table writes bypass RPCs** — competitor prices, expense templates, daily sales, payment methods rely on RLS only.

### Low
9. **Idempotency key is single-attempt random** — a retried request gets a new key, so the DB duplicate check is the only guard against double-submission.
10. **Hardcoded tenant/store IDs in storefront** — `orders.ts:4-5` uses TODO-commented constants.

---

## 7. Recommendations

1. **Wrap add-product writes in a single RPC** that creates the item, uploads the image (or records image key only after item insert), and sets initial stock atomically. Return the final `image_url` from the RPC.
2. **Surface stock-insert failures** in `AddProductModal.tsx` instead of logging to console; consider treating image-upload-after-DB failure as a soft warning, not the current reverse order.
3. **Add `eq('store_id', storeId)` to inventory inline updates** as a defense-in-depth guard even when RLS is present.
4. **Implement transactional user creation** or a cleanup rollback if `create_store_user` fails after Auth signup.
5. **Guarantee order notification delivery** via a server-sent event fallback, persistent notification queue, or SMS/WhatsApp Edge Function call rather than relying solely on Supabase Realtime broadcast.
6. **Scope import category upsert by `tenant_id`** and optionally `store_id` to prevent cross-tenant collisions.
7. **Add bounded queue retention** in mobile offline sync (max retries / TTL) and a dashboard for stuck/conflicted transactions.
8. **Migrate direct table writes to RPCs** for competitor prices, expenses templates, and daily sales so business rules and audit logging live server-side.

---

## 8. Audit Limitations

- Tests were read but not executed; therefore runtime behavior and flakiness were inferred from source, not verified by CI.
- Postgres RPC bodies in older migrations were partially truncated by read budget; the most recent authoritative definitions (`20260601000001_fix_create_sale_column_names.sql`, `20260327100000_stock_levels_realtime_and_rpc.sql`, `20260611000002_add_orders.sql`) were inspected in full.
- Cloudflare Worker R2/env configuration and live Supabase RLS policies were not probed.
