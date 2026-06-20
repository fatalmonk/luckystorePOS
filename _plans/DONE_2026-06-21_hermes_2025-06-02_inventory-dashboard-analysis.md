# Inventory Dashboard Structure Analysis

**Generated:** 2025-06-02  
**Scope:** Web Portal Inventory Dashboard (`apps/admin_web/src/features/inventory`)  
**Lines of Code:** ~1,566 (just core files)

---

## Goal

Analyze the current inventory dashboard architecture for maintainability, RLS compliance, and extensibility; identify consolidation opportunities and technical debt.

---

## Current Structure Summary

### 1. File Inventory

| Layer | Files | Purpose |
|-------|-------|---------|
| **Page** | `InventoryListPage.tsx` (802 lines) | Main container, state, filtering, sorting |
| **Table** | `InventoryListTable.tsx` (620 lines) | Virtualized table with inline editing |
| **API** | `inventory.ts` (144 lines) | Supabase RPC + direct table calls |

### 2. Component Architecture

```
InventoryListPage (container)
├── Stats Header (metrics)
├── Analytics Widgets (top selling, slow moving, trend)
├── CategoryThumbnailGrid (filter)
├── Filter Toolbar
├── View Toggle (grid/list)
│   ├── InventoryListTable (virtualized, 620 lines)
│   └── InventoryProductCard (grid view)
└── Drawers/Modals (add, edit, bulk actions)
```

---

## Strengths

1. **Clean separation of concerns** — API layer isolated from UI
2. **RLS-compliant updates** — `store_id` filtering implemented for PGRST116 fix
3. **Virtualization** — `@tanstack/react-virtual` for large lists
4. **Optimistic updates** — `queryClient.setQueryData` for snappy UI
5. **Inline editing** — Full keyboard navigation (Tab) between cells
6. **Type safety** — `InventoryItem` interface defined

---

## Risk Areas

### 1. File Size Creep

| File | Lines | Status |
|------|-------|--------|
| `InventoryListPage.tsx` | 802 | ⚠️ Too long |
| `InventoryListTable.tsx` | 620 | ⚠️ Too long |

**Recommendation:** Split into sub-components (~300 lines each ideal)

### 2. Inline Edit Logic Duplication

```typescript
// DUPLICATION PATTERN
// InventoryListPage.tsx: Lines 141-177
// InventoryListTable.tsx: Lines 87-112
```

Both files define `handleInlineSave` with identical logic. If one changes, the other breaks.

**Fix:** Move handler to hook or API layer; pass as prop only.

### 3. Prop Drilling

`InventoryListTableRow` receives 13+ props. Some (like `onTabNavigation`, `setEditingCell`) are passed through 3+ layers.

### 4. Type Defs Duplication

```typescript
// Defined in BOTH files:
interface InventoryItem { ... }  // InventoryListPage
interface InventoryItem { ... }  // InventoryListTable (slightly different!)
```

Page has: `cost`, `mrp`, `is_active`  
Table has: `barcode`, `min_qty` (no `is_active`)

**Fix:** Centralize in `types/inventory.ts`

### 5. EditableCell Event System

Uses global `document.addEventListener` with custom events for tab navigation:

```typescript
document.addEventListener('editablecell:tab', handleTab);
```

Works but harder to trace/debug than React context or ref-based solution.

---

## RLS Compliance Status

| Function | RLS Safe? | Notes |
|----------|-----------|-------|
| `api.inventory.list()` | ✅ | Uses `get_inventory_list` RPC |
| `api.inventory.updateProduct()` | ✅ | Filters by `store_id` |
| `api.inventory.updateStock()` | ✅ | Uses `set_stock` RPC |
| `api.inventory.create()` | ⚠️ | Direct insert, no `store_id` visible |

**Concern:** `create` passes `product` without explicit `store_id`. If `items` table has RLS INSERT policy requiring `store_id = auth.store_id()`, this will fail.

---

## RPC Dependencies

```sql
get_inventory_list       -- list view
adjust_stock             -- stock adjust
set_stock                -- inline stock edit  
get_stock_history_simple -- history page
get_inventory_summary    -- dashboard stats
get_stock_valuation      -- analytics
get_top_selling_items    -- widget
get_slow_moving_items    -- widget
get_daily_movement_trend -- widget
get_price_history        -- drawer
```

All RPCs require `p_store_id` parameter — correct.

---

## Recommendations

### Immediate (Low Risk)

1. **Extract `InventoryItem` interface** to `types/inventory.ts`
2. **Deduplicate `handleInlineSave`** — use `useOptimisticMutation` hook or merge into API layer
3. **Verify `create()` RLS** — ensure `store_id` is passed or `auth.store_id()` is used server-side

### Short-term (Medium Risk)

4. **Split `InventoryListPage.tsx`**:
   - Extract `AnalyticsWidgets` component
   - Extract `FilterToolbar` component  
   - Keep only orchestration logic in page

5. **Split `InventoryListTable.tsx`**:
   - Extract `InventoryListTableRow` to separate file (already function, just move)
   - Extract `useInventoryEditing` hook for cell state

### Long-term (Higher Risk)

6. **Replace global event** with React context or callback refs for tab navigation
7. **Consider Zustand** for inventory-specific state (selection, editing, filters)

---

## Test Targets

```
✅ api.inventory.updateProduct() with store_id filter (PGRST116 regression)
✅ Inline editing: Tab navigation between cells
✅ Bulk selection across virtualized rows
✅ Filter + sort combinations (stock, price range, category)
✅ Optimistic updates rollback on error
```

---

## File Paths for Changes

| Current | Recommended Location |
|---------|----------------------|
| `features/inventory/InventoryListPage.tsx` | Keep, but -200 lines after extraction |
| `features/inventory/InventoryListTable.tsx` | Same |
| (inline types) | `types/inventory.ts` (new) |
| (inline hooks) | `hooks/useInventoryEditing.ts` (new) |
| `components/inventory/BulkEditBar.tsx` | Already exists — use as pattern |

---

## Open Questions

1. Does `items` INSERT RLS policy require explicit `store_id` check? (Test: try creating product without passing store_id)
2. Are there any other direct `.insert()` calls in the codebase without store_id?
3. Is there a reason for mixing RPCs and direct table queries vs. unified pattern?

---

## Summary

The inventory dashboard works well functionally but carries technical debt from rapid iteration. The PGRST116 fix (RLS store_id filter) is correctly implemented. Main priorities:

1. Consolidate duplicated inline edit logic
2. Extract oversized components  
3. Centralize type definitions
4. Verify create/insert RLS compliance

**Estimated effort:** 2-3 hours of refactoring for immediate items; 1-2 days for full cleanup.