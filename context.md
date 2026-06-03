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
**Inventory Dashboard Refactoring - Phase 3 Complete**
- Extracted: `InventoryItem` interface to `types/inventory.ts` (centralized source of truth)
- Updated: 6 files using centralized type (~90 lines of duplicate interface removed)
- Files updated: `useInventoryEditing.ts`, `useInventoryBulkActions.ts`, `InventoryListPage.tsx`, `InventoryProductCard.tsx`, `InventoryListTable.tsx`, `InventoryListTableRow.tsx`
- Build: ✅ passing

## Previous
**Inventory Dashboard Simplification - Phase 2 Complete**
- Hook extracted: `useInventoryEditing.ts` (single source of truth)
- Components extracted: `AnalyticsWidgets`, `InventoryFilterToolbar`, `InventoryListTableRow`
- `InventoryListPage`: 802 → 548 lines (~254 lines removed)
- `InventoryListTable`: ~620 → 220 lines (row logic extracted)
- Build passes: ✅

## Previous
**Inventory Inline Price Edit - RLS FIX**
- Root cause: Supabase RLS requires `store_id` filter on UPDATE
- Error: PGRST116 — "Cannot coerce result to single JSON object"
- Fix: Added `storeId` parameter to `updateProduct()`, filter by `store_id`

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
