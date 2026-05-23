# Lucky Store POS — Redesign Implementation Plan

**Date:** 2025-05-23  
**Theme Approach:** A (Tailwind Extension with Warm Palette)  
**Design Source:** `@_plans/redesign/luckystorepos-admin.html`  
**Design System:** Anthropic-inspired, luxury admin, warm cream + terracotta

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Keep nested sidebar structure | Current UX tested, users familiar with inventory/purchase children |
| Implement branch selector | Multi-store planned — foundation for store switching |
| Keep table view | Data density required for inventory management; style existing `DataTable` |
| Preserve design interactions | Hover states, collapse animation, focus rings from HTML export |

---

## Model Selection Strategy

| Model | Tier | Use For |
|-------|------|---------|
| **llama4:cloud** | Deep | Complex component architecture, token system design, sidebar state management |
| **qwen3:cloud** | Standard | Component implementation, CSS/Tailwind styling, hook logic |
| **phi4:cloud** | Fast | Token files, config updates, simple components |
| **qwen3.5:cloud** | Vision | Visual validation, screenshot comparison, design fidelity checks |

---

## Phase 1: Design Tokens & Theme Foundation
**Duration:** 45-60 min  
**Model:** `phi4:cloud` (Fast) + `llama4:cloud` (for token architecture)

### Tasks
- [x] Create `apps/admin_web/src/theme/tokens.ts` — warm color scale, typography, radii
- [x] Update `tailwind.config.js` — extend with `warm` color palette
- [x] Add CSS variables to `styles/tokens.css` — runtime token access
- [x] Update `index.css` — import fonts (Georgia system, JetBrains Mono)
- [x] Verify tokens render correctly in browser

### Deliverables
- `theme/tokens.ts` — complete token object
- `tailwind.config.ts` — extended theme
- Warm background renders on root `#app`

---

## Phase 2: Sidebar Redesign
**Duration:** 2-3 hours  
**Model:** `llama4:cloud` (Deep) — complex component, state management required

### Tasks
- [x] Create `components/SidebarNew.tsx` (parallel to existing)
- [x] Implement warm theme styling:
  - `bg-warm-surface` background (`#faf9f5`)
  - `border-right` warm border (`#e8e6dc`)
  - Terracotta logo mark (`#c96442`) + Georgia display font
- [x] Add collapse toggle (260px ↔ 72px):
  - Floating circle button at sidebar edge
  - Chevron icon rotation animation
  - CSS transition on width (0.2s cubic-bezier)
- [x] Keep nested children structure (inventory, purchase)
- [x] Active state: terracotta left border (3px) + accent color
- [x] Hover: warm bg tint + muted→fg color transition
- [x] Add branch selector in footer:
  - Green status dot (success color)
  - Store name (truncated when collapsed)
  - "Switch" subtle text (visible expanded only)
  - Click handler (placeholder for store modal)
- [x] Add user menu footer (avatar + name/role)
- [x] Mobile overlay behavior (preserve existing)

### Deliverables
- `SidebarNew.tsx` — fully styled, collapsible
- Branch selector component integrated
- Smooth width transitions working

---

## Phase 3: Layout Updates
**Duration:** 1 hour  
**Model:** `qwen3:cloud` (Standard) — straightforward state wiring

### Tasks
- [x] Update `components/Layout.tsx`:
  - Replace `sidebarHidden` with dual state: `sidebarHidden` + `sidebarCollapsed`
  - Wire `isMobile` detection for collapse vs hide behavior
  - Pass `collapsed` prop to Sidebar
- [x] Update `app-container` classes:
  - Apply warm bg to root
  - Adjust grid for collapsed sidebar width (72px)
- [x] Update `TopHeader` to accept collapse toggle

### Deliverables
- Layout supports both hidden (mobile) and collapsed (desktop) states
- Smooth sidebar width transitions

---

## Phase 4: Dashboard Redesign
**Duration:** 3-4 hours  
**Status:** ✅ Complete  
**Model:** `llama4:cloud` (Deep) + `qwen3.5:cloud` (Vision for chart styling)

### Tasks Completed
- [x] Create `features/dashboard/HeaderStats.tsx`:
  - 4 stat cards: Revenue, Sales, Customers, Profit
  - Terracotta/warm accent colors: bg-warm-surface, border-warm-border-warm
  - Trend indicators (up/down with warm palette)
- [x] Update `features/dashboard/DashboardPage.tsx`:
  - Welcome header with user name (font-display warm typography)
  - 2-column layout (charts left lg:col-span-2, activity right)
  - Responsive: stack on mobile
  - Integrated HeaderStats component
- [x] Style charts with warm palette:
  - CSS bar charts with warm-success, warm-danger, warm-accent colors
  - Tooltip styling via CSS variables
  - Axis: muted text, subtle warm-border grid
- [x] Create `features/dashboard/RecentActivity.tsx`:
  - Activity feed: icon + text + timestamp using date-fns
  - Warm semantic colors per activity type
  - Subtle dividers, hover states
- [x] Add "Quick POS" shortcut panel
  - Gradient background from warm-accent to warm-accent-light
  - Launch button with warm styling

### Deliverables
- `HeaderStats.tsx` — warm-themed stat cards ✓
- `RecentActivity.tsx` — activity feed ✓
- `DashboardPage.tsx` — redesigned with 2-column layout ✓
- All components using warm design tokens ✓

---

## Phase 5: Inventory Table Styling
**Duration:** 1.5 hours  
**Status:** ✅ Complete  
**Model:** `qwen3:cloud` (Standard)

### Tasks Completed
- [x] Update `components/data-display/DataTable.tsx`:
  - Border radius: `xl` (12px)
  - Border: warm subtle
  - Header: surface bg with slightly different tint
- [x] Update `components/inventory/InventoryListTable.tsx`:
  - Stock badges: pill style with status colors
    - OK: success/10 bg + success text
    - Low: warning/10 bg + warning text  
    - Critical: danger/10 bg + danger text
  - Product name: Georgia display font
  - SKU: JetBrains Mono font
  - Hover row: warm bg tint
- [x] Keep existing functionality (sort, filter, pagination)

### Deliverables
- Table renders with warm styling ✓
- Stock badges match design spec ✓
- Typography hierarchy correct ✓

---

## Phase 6: UI Components Audit
**Duration:** 2 hours  
**Model:** `phi4:cloud` (Fast) for simple components

### Tasks
- [x] Update `components/ui/Button.tsx`:
  - Primary: terracotta bg + white text
  - Secondary: warm surface + border
  - Ghost: transparent + hover warm bg
- [x] Update `components/ui/Card.tsx`:
  - Surface background
  - Warm border
  - xl radius standard
- [x] Update `components/ui/Modal.tsx`:
  - Backdrop: dark with warm tint
  - Container: surface bg, xl radius
- [x] Update `components/ui/Drawer.tsx`:
  - Same warm styling as modal

### Deliverables
- All base components use warm tokens
- Consistent radius/border/shadow

---

## Phase 7: TopHeader & Global Navigation
**Duration:** 1 hour  
**Model:** `qwen3:cloud` (Standard)

### Tasks
- [x] Update `components/TopHeader.tsx`:
  - Warm surface background
  - Search bar: warm bg, rounded-lg, accent focus ring
  - Icon buttons: hover warm bg
  - User menu: warm hover state
- [x] Update `components/BottomNav.tsx` (mobile):
  - Warm surface background
  - Active icon: terracotta accent

### Deliverables
- Header matches warm theme
- Mobile bottom nav styled

---

## Phase 8: Responsive Validation
**Duration:** 1 hour  
**Model:** `qwen3.5:cloud` (Vision) — screenshot comparison

### Tasks
- [x] Test viewport matrix:
  - 360×800, 390×844, 430×932 (mobile)
  - 820×1180, 1024×768 (tablet)
  - 1366×768, 1440×900, 1920×1080 (desktop)
- [x] Verify no horizontal overflow
- [x] Verify sidebar collapse at all sizes
- [x] Verify table scrolls (not overflows)
- [x] Screenshot compare with design HTML

### Deliverables
- Responsive test report
- Screenshots at key breakpoints
- No horizontal scroll verification

---

## Phase 9: Build & Integration Test
**Duration:** 30 min  
**Model:** `phi4:cloud` (Fast) — CLI commands

### Tasks
- [x] Run `npm run typecheck` — zero errors
- [x] Run `npm run build` — successful production build
- [x] Run `npm run lint` — pass (0 new errors from redesign; 274 pre-existing)
- [x] Verify `@_plans/redesign/` assets not in build
- [x] Preview build locally

### Deliverables
- Clean build output
- Console error-free

---

## Phase 10: Context Update & Handoff
**Duration:** 15 min  
**Model:** Direct

### Tasks
- [x] Update `context.md`:
  - Add "Redesign Phase Complete"
  - List token files, component changes
  - Note multi-store foundation (branch selector)
- [x] Document new components in README or ADR
- [x] Branch: `feature/warm-redesign`

---

## Total Duration Estimate

| Phase | Time | Model |
|-------|------|-------|
| 1 | 1h | phi4 + llama4 |
| 2 | 2.5h | llama4 |
| 3 | 1h | qwen3 |
| 4 | 3.5h | llama4 + qwen3.5 |
| 5 | 1.5h | qwen3 |
| 6 | 2h | phi4 |
| 7 | 1h | qwen3 |
| 8 | 1h | qwen3.5 |
| 9 | 0.5h | phi4 |
| 10 | 0.25h | Direct |
| **Total** | **~14h** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Token drift from design | Locked in `tokens.ts` — single source of truth |
| Sidebar collapse breaks mobile | Maintain `hidden` state separate from `collapsed` |
| Table loses functionality | Style only — keep existing DataTable logic |
| Build size increase | Tree-shake unused old components post-migration |

---

## Next Steps

1. **Start Phase 1** — generate token files
2. Create branch `feature/warm-redesign`
3. Run Phase 1 → 3 in first session (foundations)
4. Demo to user before Phase 4 (dashboard)
5. Complete Phase 4 → 10 in second session

**Ready to begin Phase 1?** Say `/plan start phase 1` or specify which phase to begin.
