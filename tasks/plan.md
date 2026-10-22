# Implementation Plan: Admin Horizontal Width Constraints

## Overview

Harden horizontal sizing across `admin_web` so long strings, large prices, dense tables, grids, and flex children cannot widen the viewport or make the page slide sideways. Start with the product card and its feed, then verify the shared application shell and address only the page-level sources demonstrated by inspection or browser evidence. The current request is width containment first; a general shadcn component migration is outside this plan.

## Current State and Evidence

- The admin app already has a shared shell and existing UI components/styles. Preserve the incumbent visual system while correcting sizing behavior.
- The existing `InventoryCardFeed`, `InventoryProductCard`, and `layout.css` contain uncommitted horizontal-constraint edits. Treat those as the baseline worktree state: review and build upon them, do not discard or overwrite them.
- A prior route-load audit visited 27 admin routes at a 390px viewport and found no document or `.main-content` horizontal overflow during initial load. It did not exercise all interactions, long-content states, or swipe behavior, so it does not establish that the reported page sliding is fixed.
- `.main-content` is used as an inventory scroll parent; its actual relationship to the application shell needs verification before changing shell overflow behavior.
- Source audit found the POS layout retained a fixed 350px billing column at mobile widths, despite already hiding the desktop billing panel and using a mobile cart sheet. This creates a narrow or empty product track; the POS grid now collapses to one track on mobile.
- Automated verification in the scoped worktree passes. Its local browser app cannot render because the worktree lacks Supabase environment configuration; do not treat the original checkout's browser state as verification of the scoped branch.

## Architecture and UX Decisions

- Constrain layout at each sizing boundary: shell, page root, grid track, grid cell, card, and intrinsic content. Prefer `min-w-0`/`max-w-full` and `minmax(0, 1fr)` where flex/grid intrinsic minimums are the cause.
- Preserve necessary horizontal scrolling for genuinely tabular or navigational content. Do not hide overflow globally to conceal content or break intended scrolling.
- Keep long identifiers and prose readable via appropriate wrapping; keep amounts and numeric values legible using responsive rows or deliberate line breaks rather than clipping.
- Keep this work focused on layout. Do not alter pricing, inventory, ledger, or other business behavior.
- Use the existing design system and UI primitives. Any later broad shadcn adoption requires a separate scoped plan and a reviewed decision.

## Task List

### Phase 1: Confirm the horizontal constraint foundation

#### Task 1: Review the existing inventory and shell edits

**Description:** Inspect current diffs and the relevant component/shell structure, preserving all existing work. Confirm that sizing classes are on the correct grid/flex boundaries and that overflow clipping does not suppress required content.

**Acceptance criteria:**
- [x] Existing edits in `InventoryCardFeed.tsx`, `InventoryProductCard.tsx`, and `layout.css` are reviewed in place.
- [x] Product titles wrap, price rows can shrink, and currency values wrap instead of being visually truncated.
- [x] Inventory feed grid tracks and cells can shrink to the available viewport width; track sizing is assigned as an inline grid template so every responsive column count is emitted.
- [ ] Verify long product names and large currency amounts in the scoped browser at narrow and desktop widths.

**Verification:** Review the focused diff and inspect the inventory screen at narrow and desktop widths with long product names and large prices.

**Dependencies:** None.

**Files likely touched:**
- `apps/admin_web/src/components/inventory/InventoryCardFeed.tsx`
- `apps/admin_web/src/components/inventory/InventoryProductCard.tsx`
- `apps/admin_web/src/styles/layout.css`

**Estimated scope:** Medium.

#### Task 2: Trace and constrain the application shell

**Description:** Trace the route layout to the element carrying `.main-content`; identify whether the swipe displacement comes from a flex/grid intrinsic minimum, transformed descendant, overlay, or intentional horizontal scroller. Apply the narrowest shell constraint that prevents page-level widening while preserving intended scroll regions.

**Acceptance criteria:**
- [x] The shell and `.main-content` sizing/overflow chain is traced: shell columns and `.main-content` have zero-minimum sizing; content width is bounded; the main scroller clips horizontal overflow.
- [x] Earlier route-load evidence found no document-width overflow at 390px; category chips use an intentional local horizontal scroller.
- [ ] Reproduce the user's left/right swipe against the scoped worktree and confirm whether any displacement remains.

**Verification:** In mobile browser DevTools, compare `scrollWidth`/`clientWidth` for `documentElement`, body, shell, and `.main-content` before and after a left/right swipe; inspect computed overflow and identify the responsible element if a difference remains.

**Dependencies:** Task 1.

**Files likely touched:**
- `apps/admin_web/src/styles/layout.css`
- The component that defines the admin shell and `.main-content` (locate during implementation).

**Estimated scope:** Small to Medium.

### Checkpoint: Inventory and shell

- [ ] Inventory cards remain readable with long text and large currency values.
- [ ] Mobile swipe does not displace the whole page, or a remaining source is isolated to a named page/element.
- [ ] Review findings before expanding constraints to other routes.

### Phase 2: Find and fix route-level width sources

#### Task 3: Audit admin routes for intrinsic-width content

**Description:** Inspect all admin pages and shared components for wide grid tracks, non-shrinking flex children, long unbroken strings, fixed-width controls, and tables. Group findings by shared cause so fixes can be applied to common layouts rather than repeated page-specific overrides.

**Acceptance criteria:**
- [x] The existing 27-route, 390px route-load sweep found no document overflow on initial load; the source audit identified the POS fixed-width billing track as a responsive layout defect.
- [ ] Suspected but unverified cases are labeled separately from reproduced defects.
- [ ] Existing intentional horizontal scrolling is identified and excluded from page-level clipping changes.

**Verification:** Exercise the admin route set at 390px and desktop widths with DevTools overflow measurements; include relevant empty, long-content, and expanded states where reachable.

**Dependencies:** Task 2.

**Files likely touched:** Audit findings first; implementation files are determined by reproduced causes.

**Estimated scope:** Medium.

#### Task 4: Fix shared page and content boundaries

**Description:** Apply reusable min-width and grid-track corrections to shared page containers and the smallest set of page components that reproduce overflow. Ensure headings, filters, action rows, cards, and tables wrap or scroll within their own intended bounds.

Implementation slices:
- **Task 4a:** POS responsive grid: keep the products track shrinkable and use one column on mobile, where billing is provided by the existing cart sheet.
- **Task 4b:** Dashboard and product grid tracks/cells: use zero-minimum tracks while retaining explicitly intentional mobile scrollers.
- **Task 4c:** Correct additional route-specific boundaries only after a cause is reproduced.

**Acceptance criteria:**
- [ ] No reproduced route causes the document viewport to expand horizontally at 390px.
- [ ] Long labels and identifiers remain accessible by wrapping, truncating with an accessible full value, or scrolling in an explicitly bounded region.
- [ ] Desktop layout and existing business interactions remain intact.

**Verification:** Re-run the route/viewport checks from Task 3 and inspect all changed screens at mobile and desktop sizes.

**Dependencies:** Task 3.

**Files likely touched:** Shared page layout and only the reproduced route components.

**Estimated scope:** Break into one task per independent shared cause if more than five files are required.

### Checkpoint: Route coverage

- [ ] Every admin route has a recorded mobile and desktop overflow result.
- [ ] Any intentional scroll containers are bounded and usable.
- [ ] Browser console has no new errors during the checked routes.
- [ ] Human review before any broader design-system or component migration.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Global `overflow-x: hidden/clip` masks broken content | High | Diagnose the expanding element first; constrain locally and preserve purposeful scrollers. |
| Fixed badges/actions compete with variable-length prices | Medium | Let secondary metadata move to another row at narrow breakpoints; test long currency values. |
| `.main-content` also owns vertical scrolling or virtualization | Medium | Trace scroll ownership before changing overflow or sizing; keep vertical scroll behavior intact. |
| Initial route screenshots miss interaction-driven overflow | Medium | Exercise swipes, menus, filters, expanded rows, and long-content cases during route audit. |
| Existing unrelated worktree changes are lost | High | Preserve all unrelated dirty files and review only focused diffs. |

## Open Questions

- Which routes beyond Inventory reproduce the page slide when tested with the same mobile swipe?
- Which admin tables are intentionally horizontally scrollable on mobile?
- Does the shell use a drawer/sidebar transform that participates in the swipe displacement?

## Out of Scope

- Broad shadcn migration across all admin pages.
- Visual redesign or replacement of the incumbent admin design system.
- Changes to inventory, pricing, sales, finance, or ledger logic.
- Production deployment, PR creation, or merge.
