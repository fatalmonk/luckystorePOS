# Implementation Plan: Inline Editing & Fast Inventory Management

## Overview
Transform the inventory dashboard from a read-only display into an Excel-like fast-editing environment. Target: React/TypeScript admin_web (Phase 1-3), Flutter mobile to follow (Phase 4).

## Architecture Decisions
- **Optimistic updates**: Immediate UI feedback, background sync w/ rollback on error
- **TanStack Query mutations**: Leverage existing query cache invalidation patterns
- **Editable cell abstraction**: Reusable `InlineEditCell` component supporting text/number/date
- **react-dropzone**: Image drag-drop (lightweight, already compatible with Vite bundler)
- **react-hotkeys-hook**: Keyboard shortcuts (`⌘K`, `Shift+E`, arrows)

## Task List

### Phase 1: Inline Editing Core (~2.5h)
**Recommended model:** `gpt-oss:120b-cloud` — complex state, optimistic updates

| Task | Est | Files |
|------|-----|-------|
| **Task 1.1: Create EditableCell primitive** | S | `src/components/ui/EditableCell.tsx` |
| **Task 1.2: Add inline mutations to api.inventory** | XS | `src/lib/api.ts` |
| **Task 1.3: Refactor InventoryListTable for inline editing** | M | `src/components/inventory/InventoryListTable.tsx` |
| **Task 1.4: Add EditMode to InventoryProductCard** | M | `src/features/inventory/InventoryProductCard.tsx` |
| **Task 1.5: Optimistic update hook** | S | `src/hooks/useOptimisticMutation.ts` |

**Acceptance criteria (Phase 1):**
- [ ] Click any cell in List View → instant input (Product Name, MRP, Selling Price, Cost, Stock Quantity)
- [ ] `Enter` saves with green flash animation; `Tab` moves to next editable field
- [ ] Grid View: hover reveals pencil icon → click enters edit mode on card
- [ ] On failed save: instant toast error + UI reverts
- [ ] 0 modals required for single-field edits

**Verification:**
- [ ] Edit product in list view → see green flash → refresh page → change persisted
- [ ] Edit product in grid view → validation error → toast shown → value reverts
- [ ] Press Tab 3 times → cycles through editable fields

### Checkpoint: Phase 1
- [ ] All tests pass, build clean
- [ ] Manual QA: 10 sequential edits zero-modals

---

### Phase 2: Drag-and-Drop Media Management (~2h)
**Recommended model:** `gemma4:e2b` — DOM manipulation, image handling

| Task | Est | Files |
|------|-----|-------|
| **Task 2.1: Install react-dropzone** | XS | `package.json` |
| **Task 2.2: ImageUploadZone component** | S | `src/components/inventory/ImageUploadZone.tsx` |
| **Task 2.3: Integrate into InventoryProductCard** | M | `src/features/inventory/InventoryProductCard.tsx` |
| **Task 2.4: Integrate into InventoryListTable row** | M | `src/components/inventory/InventoryListTable.tsx` |
| **Task 2.5: Upload API endpoint + hook** | S | `src/lib/api.ts`, `src/hooks/useImageUpload.ts` |

**Acceptance criteria (Phase 2):**
- [ ] "No Image" shows dashed-border placeholder with "+" icon
- [ ] Hover existing image → semi-transparent overlay with camera icon
- [ ] Drag image file onto card/row → instant upload → spinner → new image replaces
- [ ] Click placeholder → native file picker opens

**Verification:**
- [ ] Upload valid image → success toast → persists after refresh
- [ ] Upload 5MB+ image → validation error → no crash
- [ ] Drag-drop works in both list and grid views

### Checkpoint: Phase 2
- [ ] Image upload E2E flow verified

---

### Phase 3: Financial Controls & Date Editing (~2h)
**Recommended model:** `kimi-k2.6:cloud` — date handling, edge cases

| Task | Est | Files |
|------|-----|-------|
| **Task 3.1: Extend InlineEditCell for date type** | S | `src/components/ui/EditableCell.tsx` |
| **Task 3.2: Add Date of Purchase inline edit** | M | `src/components/inventory/InventoryListTable.tsx`, `InventoryProductCard.tsx` |
| **Task 3.3: Add SKU/Barcode inline edit** | M | Same files |
| **Task 3.4: Margin auto-recalculation on edit** | S | `src/lib/calc.ts` util + component updates |

**Acceptance criteria (Phase 3):**
- [ ] Editable fields expanded: Name, SKU, Barcode, Cost Price, MRP, Selling Price, Stock Quantity, **Date of Purchase**
- [ ] Type Cost → margin badge instantly recalculates before hitting save
- [ ] Date picker inline (native date input or lightweight picker)
- [ ] Invalid price (> MRP) shows live validation

**Verification:**
- [ ] Edit Cost from 50→60 → margin % updates live
- [ ] Edit Price > MRP → red validation border before commit
- [ ] Edit Date of Purchase → persists correctly (timezone-safe)

### Checkpoint: Phase 3
- [ ] All fields editable inline, no drawer needed for basic edits
- [ ] Margin calc verified accurate

---

### Phase 4: Speed, Polish & Keyboard Shortcuts (~2h)
**Recommended model:** `deepseek-v4-flash:cloud` — config-heavy, utility work

| Task | Est | Files |
|------|-----|-------|
| **Task 4.1: Install react-hotkeys-hook** | XS | `package.json` |
| **Task 4.2: Command palette expansion** | M | `src/components/CommandPalette.tsx` or existing ⌘K menu |
| **Task 4.3: Arrow key navigation in list** | M | `src/components/inventory/InventoryListTable.tsx` |
| **Task 4.4: Shift+E bulk edit mode** | S | `src/features/inventory/InventoryListPage.tsx` |
| **Task 4.5: Low stock visual feedback animation** | S | `src/components/inventory/StatusBadge.tsx` |

**Acceptance criteria (Phase 4):**
- [ ] `⌘K` menu shows: Toggle Grid/List, Enter Bulk Edit Mode, Add Product, Export
- [ ] `Shift+E` → enters bulk edit (checkboxes visible, multi-select enabled)
- [ ] Arrow keys navigate list cells (Up/Down/Left/Right)
- [ ] Stock update to < Threshold → status badge animates (pop → red)
- [ ] Batch edit action bar (already exists: `BulkEditBar`) polished

**Verification:**
- [ ] Press Shift+E → checkboxes appear, can multi-select
- [ ] Arrow keys navigate → Enter edits cell
- [ ] Update stock to 1 (threshold 5) → status animates to LOW

### Checkpoint: Phase 4 Complete
- [ ] All acceptance criteria met
- [ ] Ready for Flutter mobile parity (separate plan)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Virtual scroll conflicts with inline editing | High | Disable virtualizer during active edit; or use absolute-positioned edit overlay |
| Date timezone mishandling | Med | Store UTC in DB, display local; use date-fns (already installed) |
| Image upload race conditions | Med | AbortController per upload; disable save while uploading |
| Optimistic update rollback UX | Low | Toast + visual "reverted" state; not silent |

## Open Questions
- **Date picker component**: Native `<input type="date">` or install `react-datepicker`? (Recommend native to avoid dep bloat)
- **Image storage**: Existing Supabase Storage bucket? Or need new bucket?

## Dependencies to Install
```bash
npm install react-dropzone react-hotkeys-hook
```

## Flutter Mobile Phase (separate plan)
- Parity: Inline editing in DataTable
- Image upload: ImagePicker + camera
- Same API endpoints as web

---

**Next action:** Pick Phase 1, Task 1.1 to begin `EditableCell` primitive.
