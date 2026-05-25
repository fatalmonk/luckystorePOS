# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
Merge feature/warm-redesign to main (conflicts resolved)

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
- **Mobile App**: Updated font tokens, fixed payment methods RLS issue (added service account to users), resolved `notifyListeners` build exceptions.
- **Merge Conflicts**: Resolved 5 conflicts in `payment_screen.dart`, `pos_main_screen.dart`, `pos_screen.dart`

## Next
Push and merge PR #135
- Tailwind extension with warm palette.
- Keep nested sidebar structure (collapsible).
- POS categories are horizontal pills for tablet space.
- Retained `StockUpdateDrawer.tsx`.

## Blocker
None

## Next
Merge feature/warm-redesign to main

---
ctx: mobile app payment method fixes | done: 55 | next: merge branch
