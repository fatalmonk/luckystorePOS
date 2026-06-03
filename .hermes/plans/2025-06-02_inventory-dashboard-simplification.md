# Implementation Plan: Inventory Dashboard Simplification

**Generated:** 2025-06-02  
**Scope:** Web Portal Inventory Dashboard Refactoring  
**Goal:** Reduce complexity, eliminate duplication, improve maintainability

---

## Overview

The inventory dashboard has grown to 1,566+ lines across 3 core files. Code review identified duplication, file size creep, and prop drilling. This plan breaks the simplification work into incremental, verifiable tasks.

**Target Outcomes:**
- ~300 lines removed from oversized files
- Single source of truth for `handleInlineSave`
- Consistent `InventoryItem` type definition
- Smaller, focused components

---

## Architecture Decisions

1. **Hook extraction over context** — Inline editing state is local to the table; hook is lighter than context
2. **Co-locate types** — Centralize `InventoryItem` in `types/inventory.ts` (new file)
3. **Preserve exports** — Keep component APIs identical to avoid breaking changes
4. **Test after each phase** — Verify before proceeding

---

## Phase 1: Extract Hook (Foundation)

### Task 1: Create `useInventoryEditing` hook

**Description:** Extract duplicated `handleInlineSave` logic from both `InventoryListPage` and `InventoryListTable` into a reusable hook.

**Acceptance criteria:**
- [ ] Hook created at `hooks/useInventoryEditing.ts`
- [ ] Accepts `storeId: string`, returns `{ handleInlineSave }`
- [ ] Handles optimistic updates, API calls, error rollback
- [ ] Converts string numbers to actual numbers for price/cost/mrp/current_qty

**Verification:**
- [ ] Hook compiles without errors
- [ ] Logic matches existing implementations exactly

**Dependencies:** None

**Files likely touched:**
- `apps/admin_web/src/hooks/useInventoryEditing.ts` (new)

**Estimated scope:** Small (1 file, ~60 lines)

---

### Task 2: Update `InventoryListPage` to use hook

**Description:** Replace inline `handleInlineSave` (lines 141-177) with hook usage.

**Acceptance criteria:**
- [ ] Import `useInventoryEditing` hook
- [ ] Remove inline `handleInlineSave` callback
- [ ] Use `handleInlineSave` from hook in `onInlineSave` prop
- [ ] No behavioral changes

**Verification:**
- [ ] `npm run build` succeeds
- [ ] TypeScript check: `npx tsc --noEmit` (if available)

**Dependencies:** Task 1

**Files likely touched:**
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx`

**Estimated scope:** Small (1 file, ~40 lines removed)

---

### Task 3: Update `InventoryListTable` to use hook (or prop)

**Description:** The table currently has fallback logic when `onInlineSave` is not provided. Remove this duplication; rely on prop from parent.

**Acceptance criteria:**
- [ ] Remove fallback `handleInlineSaveProxy` (lines 87-112)
- [ ] Keep `onInlineSave` as required prop
- [ ] Remove `storeId`, `notify`, `queryClient` dependencies (now in hook at parent)

**Verification:**
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors

**Dependencies:** Task 2

**Files likely touched:**
- `apps/admin_web/src/components/inventory/InventoryListTable.tsx`

**Estimated scope:** Small (1 file, ~30 lines removed)

---

### Checkpoint: Phase 1 Complete
- [ ] All builds pass
- [ ] No TypeScript errors
- [ ] Hook tested in isolation (if tests exist)
- [ ] Ready for Phase 2

---

## Phase 2: Component Extractions

### Task 4: Extract `AnalyticsWidgets` component

**Description:** Move analytics widgets (lines 381-471) from `InventoryListPage` into separate component.

**Acceptance criteria:**
- [ ] New file: `components/inventory/AnalyticsWidgets.tsx`
- [ ] Accepts `topSellingItems`, `slowMovingItems`, `dailyTrend` props
- [ ] Accepts loading states for each
- [ ] Uses warm theme colors (existing)

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Widgets render identically in browser

**Dependencies:** Phase 1 checkpoint

**Files likely touched:**
- `apps/admin_web/src/components/inventory/AnalyticsWidgets.tsx` (new)
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx` (reduce by ~90 lines)

**Estimated scope:** Medium (2 files, ~100 lines moved)

---

### Task 5: Extract `InventoryFilterToolbar` component

**Description:** Move filter toolbar UI (lines 474-550~ area) into separate component.

**Acceptance criteria:**
- [ ] New file: `components/inventory/InventoryFilterToolbar.tsx`
- [ ] Accepts all filter state props: `stockFilter`, `minPrice`, `maxPrice`, `sortBy`, etc.
- [ ] Accepts setter callbacks
- [ ] Preserves "Show Filters" / "Hide Filters" toggle logic

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Filters work identically in browser

**Dependencies:** Task 4

**Files likely touched:**
- `apps/admin_web/src/components/inventory/InventoryFilterToolbar.tsx` (new)
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx` (reduce by ~75 lines)

**Estimated scope:** Medium (2 files, ~85 lines moved)

---

### Task 6: Extract `InventoryListTableRow` component

**Description:** Move row component (lines 241-620) into separate file. Currently internal function, make it proper component.

**Acceptance criteria:**
- [ ] New file: `components/inventory/InventoryListTableRow.tsx`
- [ ] Export `InventoryListTableRow` function
- [ ] Import in `InventoryListTable.tsx`
- [ ] Props interface preserved

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Table renders identically in browser
- [ ] Virtualization still works

**Dependencies:** Task 5

**Files likely touched:**
- `apps/admin_web/src/components/inventory/InventoryListTableRow.tsx` (new, ~380 lines)
- `apps/admin_web/src/components/inventory/InventoryListTable.tsx` (reduce significantly)

**Estimated scope:** Medium (2 files, reorganization)

---

### Checkpoint: Phase 2 Complete
- [ ] All builds pass
- [ ] Components render correctly in browser
- [ ] `InventoryListPage` under 600 lines target
- [ ] `InventoryListTable` under 400 lines target

---

## Phase 3: Type Consolidation

### Task 7: Create `types/inventory.ts`

**Description:** Centralize `InventoryItem` interface and related types.

**Acceptance criteria:**
- [ ] New file: `lib/types/inventory.ts` (or `types/inventory.ts` if dir exists)
- [ ] Unified `InventoryItem` with all fields from both definitions:
  - `id`, `name`, `sku`, `barcode`, `current_qty`, `reorder_status`
  - `price`, `cost`, `mrp`, `min_qty`, `category_id`, `category_name`
  - `image_url`, `last_purchased_date`, `is_active`, `last_updated`
- [ ] Export from index if needed

**Verification:**
- [ ] TypeScript compiles without conflicts
- [ ] No duplicate interface definitions

**Dependencies:** Phase 2 checkpoint

**Files likely touched:**
- `apps/admin_web/src/types/inventory.ts` (new)
- `apps/admin_web/src/features/inventory/InventoryListPage.tsx` (remove type def)
- `apps/admin_web/src/components/inventory/InventoryListTable.tsx` (remove type def)

**Estimated scope:** Small-Medium (3 files, ~20 lines each changed)

---

### Checkpoint: Phase 3 Complete
- [ ] All builds pass
- [ ] Single source of truth for types
- [ ] No type drift between components

---

## Phase 4: Verification & Polish

### Task 8: Full build verification

**Description:** Complete verification of all changes.

**Acceptance criteria:**
- [ ] Production build: `npm run build` (or equivalent)
- [ ] No console errors in browser
- [ ] Inline editing works end-to-end
- [ ] Virtualization scrolls smoothly
- [ ] Filters and sorting work
- [ ] Analytics widgets load data

**Verification:**
- [ ] Manual browser testing of inventory page
- [ ] Test inline edit on price, stock, name fields
- [ ] Verify tab navigation between cells

**Dependencies:** Phase 3 checkpoint

**Files likely touched:** None (verification only)

**Estimated scope:** Small (testing activity)

---

### Task 9: Dead code check

**Description:** Verify no orphaned code from extractions.

**Acceptance criteria:**
- [ ] Search for unused imports
- [ ] Check for orphaned helper functions
- [ ] Verify no lingering type definitions

**Verification:**
- [ ] `npm run lint` (or equivalent) passes
- [ ] No "unused variable" warnings

**Dependencies:** Task 8

**Estimated scope:** XS (scan activity)

---

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review
- [ ] All builds green

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component extraction breaks prop passing | High | Export same prop interface, test in browser after each task |
| Type consolidation causes conflicts | Medium | Choose most inclusive type definition, verify all usages compile |
| Virtualization breaks after row extraction | Medium | Test scroll behavior, verify row heights |
| Inline editing stops working | High | Test tab navigation, save/cancel flows manually |

---

## Open Questions

1. Should we also simplify the global `editablecell:tab` event system, or is prop passing sufficient?
2. Is there a `types/` directory already, or should types live in `lib/types/`?
3. Are there existing tests for `handleInlineSave` that need updating?

---

## Summary

| Phase | Tasks | Est. Time | Lines Changed |
|-------|-------|-----------|---------------|
| 1 | 3 tasks | ~45 min | -90 lines |
| 2 | 3 tasks | ~60 min | -200 lines, reorganization |
| 3 | 1 task | ~20 min | -20 lines (duplication) |
| 4 | 2 tasks | ~30 min | Verification |
| **Total** | **9 tasks** | **~2.5 hrs** | **~310 lines net removal** |

**Recommended starting point:** Phase 1, Task 1 (hook extraction) — lowest risk, highest impact.