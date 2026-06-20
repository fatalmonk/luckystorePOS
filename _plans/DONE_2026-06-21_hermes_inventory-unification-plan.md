# Plan: Consolidate Products + Inventory → Single Inventory Management Tab

## Overview
Merge the `Products` (`/products`) and `Inventory` (`/inventory`) tabs into one unified **Inventory Management** tab at `/inventory`. The `InventoryListPage` is richer (stock levels, analytics, bulk ops, barcode scanning, CSV export, RPC-backed data). `ProductListPage`'s unique features (Add Product modal, Category Thumbnail Grid) get absorbed.

## Architecture Decisions
- Route: `/inventory` stays. `/products` gets a `<Navigate to="/inventory" />` redirect.
- Base page: `InventoryListPage.tsx` — absorbs Products features. Products-specific files deleted.
- API: `api.inventory.*` is primary. Move `api.products.create` into inventory domain.
- Drawers: Keep `ProductUpdateDrawer` (3-tab: info/stock/pricing + image + competitor prices). Delete `ProductEditDrawer`.
- Add product: Enhanced modal with image upload, MRP, cost, initial stock qty, purchase date, notes.
- Public catalogue potential: After unification, the items table serves both admin Inventory (filtered by store) and a future customer-facing catalogue (filtered by active=true). That's a separate phase.

## Task List

### Phase 1: Enhance Add Product Modal
**T1 — Enhanced Add Product Modal with full field set** (M)
- Rewrite `ProductAddModal.tsx` with:
  - Image upload → Supabase storage bucket `product-images`
  - MRP, Cost Price, Sales Price
  - Initial Stock Quantity, Purchase Date
  - SKU (with generate button), Barcode, Category selector
  - Notes field
- On submit: upload image → create item row → create INITIAL stock movement via `adjust_stock` RPC
- Invalidate `['inventory', storeId]` (not `['products']`)
- Move `api.products.create` → `api.inventory.create`; keep backward-compat wrapper

### Phase 2: Add Missing Inventory Features
**T2 — Category Thumbnail Grid to Inventory page** (S)
- Import `CategoryThumbnailGrid` from products/ into `InventoryListPage`
- Render above the search/sort bar
- Category click sets `selectedCategoryId`

**T3 — Low-stock alert summary and quick filters** (S)
- Summary bar showing: total items, low stock count, out of stock count
- Clickable filter pills: "All | Low Stock (3) | Out of Stock (1)"
- Reorder status logic from existing inventory data

**T4 — Analytics widgets in Inventory header** (M)
- 4 compact metric cards: total stock value, total items, avg margin, top sellers
- Uses existing RPCs: `getStockValuation`, `getTopSellingItems`
- Wire to `useQuery` calls in `InventoryListPage`

**T5 — Price history in ProductUpdateDrawer pricing tab** (S)
- Import `PriceHistoryModal` and show inline mini price history list in pricing tab
- Fetch via `api.inventory.getPriceHistory`

### Phase 3: Remove Products Tab
**T6 — Unify edit drawers, remove ProductEditDrawer** (M)
- Delete `ProductEditDrawer.tsx`
- `ProductDetailDrawer` "Edit" button → opens `ProductUpdateDrawer` instead
- Verify no missing fields (migrate short_code, brand, supplier etc. if present in EditDrawer)

**T7 — Remove Products route + sidebar item** (XS)
- `App.tsx`: remove lazy import for `ProductListPage`, remove `/products` route, add redirect
- `SidebarNew.tsx`: remove Products nav item from "Inventory & Sales" group

**T8 — Clean up orphaned files + dead code** (S)
- Delete `ProductListPage.tsx`
- Remove `['products']` query key references
- Build check for no dead imports
- Optionally clean i18n keys for `nav.products`

## File Changes Summary

### Delete
- `apps/admin_web/src/features/products/ProductListPage.tsx`
- `apps/admin_web/src/features/products/ProductEditDrawer.tsx`

### Modify
- `apps/admin_web/src/app/App.tsx` — remove products route, add redirect
- `apps/admin_web/src/components/SidebarNew.tsx` — remove products nav item
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx` — T1-T4 changes
- `apps/admin_web/src/features/products/ProductAddModal.tsx` — T1 enhancements
- `apps/admin_web/src/features/inventory/ProductUpdateDrawer.tsx` — T5 price history
- `apps/admin_web/src/lib/api/domains/inventory.ts` — add create function
- `apps/admin_web/src/features/products/ProductDetailDrawer.tsx` — T6 edit link update

### Keep Unchanged
- `CategoryThumbnailGrid.tsx`
- `ProductDetailDrawer.tsx`
- `PriceHistoryModal.tsx`
- `BulkPriceModal.tsx`, `BulkStockModal.tsx`, `BarcodeScannerModal.tsx`
- `InventoryListTable.tsx`, `InventoryProductCard.tsx`
- All inventory components

## Checkpoints
- **CP1** (after T1): Add product modal works with image/MRP/cost/stock
- **CP2** (after T2-T5): Category grid, low-stock alerts, analytics, price history live
- **CP3** (after T6-T8): Products tab gone, sidebar clean, build passes

## Risks
- **Duplicate edit logic:** ProductEditDrawer may have unique fields not in ProductUpdateDrawer — audit before deleting
- **Query cache fragmentation:** Remove `['products']` key refs; inventory uses `['inventory', storeId]`
- **i18n keys:** `nav.products` may be used elsewhere — verify before cleanup
