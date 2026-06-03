# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**Purchase Receiving - Fix item cost update**
- Issue: `record_purchase_v2` RPC updated `stock_movements` but NOT `items.cost`
- Fix: Added `UPDATE items SET cost = v_new_avg_cost` in the purchase loop
- Migration: `20260603000000_fix_purchase_receipt_update_item_cost.sql`
- Build: ✅ passing

## Previous
**Inline Price Edit - RPC FIX**
- Using `update_item_prices` RPC for price updates (handles NULL tenant_id)
- Added RLS silent failure detection

## Done
- Phase 1-4: Inline editing complete
- Build passes
- Fixed uuid dependency for tests
- Fixed `useEffect` import in InventoryListTable
- Fixed `onInlineSave` prop destructuring
- Fixed EditableCell value comparison bug
- Added string-to-number conversion for numeric fields
- Fixed PGRST116 error — added `store_id` filter for RLS compliance

## Next
Test inventory price editing in browser

## Blocker
None

---
ctx: PGRST116 root cause fixed - RLS requires store_id | build: success | next: verify
