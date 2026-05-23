# Lucky Store POS

## Stack
React (admin web), Flutter (mobile POS), Supabase, Tailwind, TypeScript

## Current
**Redesign Phase Complete** — Warm Anthropic-inspired redesign fully implemented, verified, build-tested, and documented.

## Done
- PR #121 merged ✓ (ledger multi-item transactions)
- SidebarNew component added
- Mobile overlay behavior added
- User menu footer with avatar added
- WebP conversion for image uploads
- Created `redesignimplementationplan.md` — 10-phase plan for warm Anthropic-inspired redesign
- **Phase 1 Done:** `theme/tokens.ts` + Tailwind warm palette + CSS vars for redesign
- **Phase 2 Done:** SidebarNew with collapse, branch selector, user menu
- **Phase 3 Done:** Layout.tsx dual state, TopHeader collapse prop, CSS grid collapsed width
- **Phase 4 Done:** Dashboard redesign complete:
  - HeaderStats.tsx: 4 stat cards (Revenue, Sales, Customers, Profit) with warm terracotta theme
  - RecentActivity.tsx: activity feed with warm styling
  - DashboardPage.tsx: 2-column layout, welcome header, warm palette charts
  - Quick POS shortcut panel with gradient styling
  - SidebarNew isMobile prop wired for mobile drawer behavior
- **Phase 5 Done:** Inventory table styling:
  - DataTable.tsx: warm container, header/row styling, hover states
  - InventoryListTable.tsx: warm theme, pill badges (OK/LOW/OUT), typography (display+mono)
- **Phase 6 Done:** UI Components Audit:
  - Core component styles updated (Button, Card, Modal, Drawer)
  - Drawer.test.tsx fixed for focus ring adjustments & JSDOM element leakages
- **Phase 7 Done:** TopHeader & Global Navigation:
  - TopHeader styling updated with warm palette search input & interactive profile hover
  - BottomNav.tsx updated for warm mobile view
- **Phase 8 Done:** Responsive Validation:
  - Layout behavior verified across 8 responsive breakpoints (sidebar collapse, horizontal table scroll)
- **Phase 9 Done:** Build & Integration Test:
  - Successful production build (52 chunks) and clean typecheck verification
- **Phase 10 Done:** Context Update & Handoff:
  - Documentation updated, branch `feature/warm-redesign` created
- Branch: `feature/warm-redesign`
- Fixed POS item loading issue (0-price items/corrupt items crashing mapSearchItems)
- Fixed `search_items_pos`, `get_pos_categories`, `lookup_item_by_scan` RPCs (42703 error: `i.active` -> `i.is_active`) via migration `20260523000000_fix_pos_search_is_active.sql`

## Decisions
- Bengali (bn_BD) + English, Hind Siliguri font
- Theme Approach A: Tailwind extension with warm palette
- Keep current nested sidebar structure, add collapse + branch selector
- Keep table view for inventory (style only)
- Retained `StockUpdateDrawer.tsx` per user instruction

## Blockers
- None

## Next
- Review and merge PR #127
- Merge `feature/warm-redesign` to main after final review.

---
ctx: Created PR #127 | done: 53 | next: Review and merge PR
