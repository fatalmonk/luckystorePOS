Here's the implementation plan.

---

# Implementation Plan: Consolidate Products + Inventory → Single Inventory Management Tab

## Overview

Merge the current `Products` and `Inventory` tabs into one unified **Inventory Management** tab. The `InventoryListPage` is already more feature-rich, so it becomes the base. Features from `ProductListPage` (category grid, add product modal, category filtering in grid view) get merged in. The old `/products` route and sidebar item get removed. Duplicate drawers/components get unified.

---

## Current State Analysis

| Aspect | Products Tab (`/products`) | Inventory Tab (`/inventory`) |
|---|---|---|
| **Page** | `ProductListPage.tsx` (437 lines) | `InventoryListPage.tsx` (503 lines) |
| **Listing** | items table, grid/list view, category filter | RPC-backed with stock level, grid/list view, category filter |
| **Add** | `ProductAddModal` | ❌ (no add) |
| **Edit** | `ProductEditDrawer` | `ProductUpdateDrawer` (richer — stock/pricing tabs) |
| **Detail** | `ProductDetailDrawer` | `ProductDetailDrawer` (shared) |
| **Category view** | `CategoryThumbnailGrid` | ❌ (not present) |
| **Analytics** | ❌ | ✅ Valuation, top selling, slow moving, daily trends |
| **Bulk ops** | ❌ | ✅ Bulk price, bulk stock, barcode scan, CSV export |
| **Realtime** | `items` table subscription | `inventory` query key |
| **API module** | `api.products.*` (simple CRUD) | `api.inventory.*` (RPC-based, richer) |
| **Stock mgmt** | ❌ | ✅ Add/remove/set stock, reasons, image upload |

**Conflict:** Both pages query the same `items` table but with different data shapes — Products uses raw DB rows, Inventory uses a RPC aggregation with stock levels. Editing in one doesn't invalidate the other properly. The ProductUpdateDrawer and ProductEditDrawer are two different implementations with overlapping features.

---

## Decision: Inventory Page Becomes the Base

The Inventory tab has richer data (stock levels, analytics, bulk ops, barcode scanning, CSV export). Products tab's unique features: **Add Product modal** and **Category Thumbnail Grid** get merged into Inventory.

---

## Architecture Decisions

1. **New route:** `/inventory` stays. `/products` gets removed (redirect to `/inventory`).
2. **Single entry point:** `InventoryListPage.tsx` absorbs Products features. Products-specific files get deleted.
3. **API layer:** `api.inventory.*` stays as the primary API. `api.products.create` is the only thing needed from the products API — move it to the inventory domain.
4. **Drawers:** Keep `ProductUpdateDrawer` (it has the 3-tab layout: info/stock/pricing + image upload + competitor prices). Delete `ProductEditDrawer` after migrating any unique fields.
5. **Category grid:** Add `CategoryThumbnailGrid` component to the Inventory page header area.
6. **Add product:** Add an "Add Product" trigger button + modal (existing `ProductAddModal` but wired to the inventory API / create flow).

---

## Task List

### Phase 1: Merge Feature Parity

**Task 1 — Add "Add Product" button + modal to Inventory page** (S)
- **Acceptance:** Inventory page has an "Add Product" button that opens a modal/canvas
- **Files touched:** `InventoryListPage.tsx`, `ProductAddModal.tsx` (reuse or inline)
- **Detail:** Wire the existing `ProductAddModal` into the Inventory page header. On success, invalidate `['inventory', storeId]` query key.

**Task 2 — Add Category Thumbnail Grid to Inventory page** (S)
- **Acceptance:** Inventory page header shows category grid above the search/sort bar, matching Products page layout
- **Files touched:** `InventoryListPage.tsx`, `CategoryThumbnailGrid.tsx` (reuse as-is)
- **Detail:** Import `CategoryThumbnailGrid` in InventoryListPage, render it above the filter bar. Category click sets `selectedCategoryId`.

**Task 3 — Remove ProductEditDrawer, unify edit flow** (M)
- **Acceptance:** Clicking "Edit" on a product in Inventory always opens `ProductUpdateDrawer` (not `ProductEditDrawer`). `ProductEditDrawer.tsx` is deleted.
- **Files touched:** `ProductEditDrawer.tsx` (delete), `InventoryListPage.tsx` (remove import), `ProductDetailDrawer.tsx` (check references)
- **Detail:** `ProductDetailDrawer` references `ProductEditDrawer` for the "Edit" button action — redirect that to `ProductUpdateDrawer` instead.

**Task 4 — Move product creation API from products domain to inventory domain** (S)
- **Acceptance:** New products can be created via `api.inventory.create(...)` instead of `api.products.create(...)`
- **Files touched:** `lib/api/domains/inventory.ts`, `lib/api/domains/products.ts`
- **Detail:** Move the `create` function from `products` to `inventory`. Keep the old export as a thin wrapper for backward compat during transition.

---

### Phase 2: Remove Products Tab

**Task 5 — Remove `/products` route from App.tsx** (XS)
- **Acceptance:** Navigating to `/products` redirects to `/inventory`. No lazy import for `ProductListPage`.
- **Files touched:** `App.tsx`
- **Detail:** Delete the lazy import and route for products. Optionally add a redirect route: `<Route path="products" element={<Navigate to="/inventory" replace />} />`.

**Task 6 — Remove Products nav item from sidebar** (XS)
- **Acceptance:** Sidebar shows only "Inventory" under "Inventory & Sales" group, not "Products" + "Inventory"
- **Files touched:** `SidebarNew.tsx`
- **Detail:** Remove the Products item (line 53: `{ icon: Package, label: t('nav.products'), path: '/products' }`). Keep Inventory with its children (inventory + history). Rename label from "Inventory" to "Inventory" (keep current label).

**Task 7 — Clean up orphaned files** (S)
- **Acceptance:** `ProductListPage.tsx`, `ProductEditDrawer.tsx`, and any products-only files no longer imported anywhere can be safely deleted.
- **Files touched:** `ProductListPage.tsx` (delete), verify no broken imports remain.
- **Detail:** Run build to confirm no dead imports.

---

### Phase 3: Polish Inventory Page

**Task 8 — Add low-stock alert summary section** (S)
- **Acceptance:** Inventory page shows a summary bar with count of low-stock and out-of-stock items, with a quick-filter to show only these
- **Files touched:** `InventoryListPage.tsx`
- **Detail:** Compute from the inventory data. Add clickable pill/chip filters: "All (50) | Low Stock (3) | Out of Stock (1)"

**Task 9 — Add analytics widgets to Inventory header** (M)
- **Acceptance:** Page header shows compact analytics: total stock value, total items, avg margin, fastest movers
- **Files touched:** `InventoryListPage.tsx` (stats section around line 179), `api/inventory.ts` (already has getStockValuation, getTopSellingItems, getSlowMovingItems)
- **Detail:** Use existing RPCs to show 4 compact metric cards above the filter bar. Show top 5 fastest movers in a mini-list or tooltip.

**Task 10 — Add price history inline in ProductUpdateDrawer pricing tab** (S)
- **Acceptance:** Pricing tab in the update drawer shows recent price change history
- **Files touched:** `ProductUpdateDrawer.tsx`, `PriceHistoryModal.tsx` (reuse component)
- **Detail:** Import `PriceHistoryModal` or inline a mini price history list in the pricing tab area.

---

### Verification / Checkpoints

**Checkpoint 1 (after Tasks 1-2):** Both new features (Add Product, Category Grid) work on `/inventory` page. Build passes.

**Checkpoint 2 (after Tasks 3-4):** Edit drawer unified. Create product works via inventory API. Build passes.

**Checkpoint 3 (after Tasks 5-7):** `/products` redirects to `/inventory`. Sidebar has only one Inventory entry. Build clean with no dead imports.

**Checkpoint 4 (after Tasks 8-10):** Full feature set live. Low stock alert, analytics widgets, price history all work on the single Inventory page.

---

## Files to Delete
- `apps/admin_web/src/features/products/ProductListPage.tsx`
- `apps/admin_web/src/features/products/ProductEditDrawer.tsx`

## Files to Modify
- `apps/admin_web/src/app/App.tsx` — remove products route, add redirect
- `apps/admin_web/src/components/SidebarNew.tsx` — remove products nav item
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx` — add product modal, category grid, low-stock alerts, analytics
- `apps/admin_web/src/features/inventory/ProductUpdateDrawer.tsx` — add price history
- `apps/admin_web/src/lib/api/domains/inventory.ts` — add create function
- `apps/admin_web/src/lib/api/domains/products.ts` — optionally keep as thin wrapper or remove

## Files Fully Reused (no changes)
- `ProductAddModal.tsx`
- `CategoryThumbnailGrid.tsx`
- `ProductDetailDrawer.tsx`
- `PriceHistoryModal.tsx`
- `BulkPriceModal.tsx`, `BulkStockModal.tsx`, `BarcodeScannerModal.tsx`
- All inventory components

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `ProductEditDrawer` has unique fields not in `ProductUpdateDrawer` | Med | Review both drawers before deleting — migrate any missing fields (e.g. short_code, brand, supplier) |
| Products page may be referenced by other routes/components | Low | Search for cross-references before deletion |
| Query cache invalidation: products queries still invalidate keys | Low | Remove `['products']` query key after migration — inventory uses `['inventory', storeId]` |
| Translation keys for `nav.products` still used elsewhere | Low | Check i18n files — remove if only referenced in sidebar |

---

## Open Questions

1. Should the **add product** flow open a full modal (like current `ProductAddModal`) or a drawer consistent with the `ProductUpdateDrawer` design? **Recommendation:** Use the modal — adding a product (name, SKU, price, category) is simpler than the edit drawer's 3-tab complexity.