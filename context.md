# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**POS Tablet Refactor Complete** — Unified 2-column layout, circular avatar cards, sticky footer numpads, global shortcut bindings, and high-fidelity single-screen checkout modal.

## Done
- **Core Redesign**: `theme/tokens.ts`, Tailwind warm palette, CSS vars.
- **Components**: SidebarNew (collapse, branch selector), HeaderStats, RecentActivity, Quick POS panel, InventoryListTable, Drawer fixes.
- **Layout Shell**: 2-column dashboard, dual-state `Layout.tsx`, responsive breakpoints.
- **POS Optimization**:
  - Tablet CSS Grid (`1fr 350px`), independent pane scrolling.
  - Redesigned `ProductCard.tsx` with circular 64px avatar, glanceable prices, and dynamic stock warning badges.
  - Fixed Numpad integration inside `CartPanel.tsx` for custom discount values.
  - Fast-checkout `PaymentModal.tsx` in a dual-pane responsive widescreen grid.
  - Integrated speed POS keyboard shortcuts (`F2`, `F12`, `Escape`, `Ctrl+K`).
- **Backend**: Fixed `search_items_pos` 42703 error via `20260523000000_fix_pos_search_is_active.sql`.

## Decisions
- Bengali/English + Hind Siliguri font.
- Tailwind extension with warm palette.
- Keep nested sidebar structure (collapsible).
- POS categories are horizontal pills for tablet space.
- Retained `StockUpdateDrawer.tsx`.

## Blockers
- Manual Supabase DB SQL execution required for `search_items_pos` fix.

## Next
- Execute SQL in Supabase Dashboard.
- Merge `feature/warm-redesign` to main.

---
ctx: POS tablet layout refactor complete | done: 54 | next: execute sql in supabase dashboard
