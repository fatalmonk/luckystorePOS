# Logic Flow Synthesis: Checkout & Inventory

1. [MOBILE] Sale Intent -> local_transaction_queue.json
2. [SYNC] SyncService.dart -> Supabase Function `create-sale`
3. [GATE] Edge Function -> `complete_sale` RPC
4. [TRANSACTION] `complete_sale` (SERIALIZABLE)
   a. Insert `sales`
   b. Insert `sale_items`
   c. Call `adjust_inventory_stock`
5. [LEDGER] `adjust_inventory_stock`
   a. Lock `stock_levels` (FOR UPDATE)
   b. Update `stock_levels.qty`
   c. Insert `inventory_movements` (Immutable)
6. [VERIFY] If Success -> Clear Mobile Queue Item
