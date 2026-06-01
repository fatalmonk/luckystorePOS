# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**ALL 14 Critical bugs fixed** in Flutter mobile app. Build passes with only minor linting warnings.

**Critical Fixes (C1-C14):**
- C1: `totalAmount` now subtracts cart-level discount
- C2: Removed service role key, added `authHeaders()` for session JWT
- C3: Removed manager credential bootstrap, added auth state listener
- C4: Added `Supabase.initialize` in background sync isolate
- C5: Switch on `SyncActionType` to call correct RPC (insert/update/delete)
- C6: Added `orElse` to `firstWhere` in `completeSale`
- C7: Added `dispose()` to `CustomerPhoneLookup`
- C8: Fixed malformed printer URL endpoint
- C9: Removed duplicate `_totalPrintAttempts++` in `_updateAveragePrintTime`
- C10: Fixed print retry queue circular dependency with factory injection
- C11: File picker API already correct (v11)
- C12: Guarded backspace on empty buffer in `BarcodeListener`
- C13: Clamped `leftPanelWidth` to non-negative
- C14: Added discount validation in `setLineDiscount` (≤ item price)

**Additional fixes:**
- C37: Implemented `insertSyncAction` in `OfflineDatabase`
- C46: Fixed jitter calculation in print retry queue (±10% uniform)

## Done
- **ALL Critical bugs fixed (14/14)** — Security, crash, and data integrity issues resolved
- **P0 Critical Fixes**: 10 security/crash bugs fixed, auth hardened
- **PR #139 Merged**: Warm redesign complete — squashed to d792f27.
- **POS Provider Fix**: Resolved nested `SaleTransactionSnapshot` class bug in `pos_provider.dart`. Restored missing fields, methods, imports. Committed `8fc664c`.
- **Flutter Doctor**: All green — accepted Android licenses, Android SDK/Studio detected.
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
- **Database Cleanup**: Removed test users from auth.users and related tables.
- **Dashboard KPIs**: Added retail KPIs (ATV, UPT, Gross Margin) to Dashboard and `HeaderStats`, backed by `get_retail_kpis` RPC.
- **Karbar Features**: Added missing UI metrics (To Receive/Give, Total Balance) right below Trend Cards, fixed Gamification SVG, and added Quick Action Modals to `DashboardPage.tsx` with `get_dashboard_missing_metrics` RPC.
- **MoM Trend Metrics**: Added `TrendCard` component, backed by `get_monthly_trend_metrics` RPC (sourced from `daily_sales` and displaying the actual month name). Removed duplicate Total Balance card.
- **Cashflow Chart**: Added dynamic filterable `CashflowChart` component using `recharts`, backed by `get_cashflow_data` CTE RPC, replacing the static chart.
- **Stock Inventory Refactor (Phase 1)**: Integrated `@tanstack/react-virtual` virtualization into both grid (cards) and list (table) layouts, implemented responsive sidebar collapsing/expansion, added a sticky category/search toolbar, and fixed Taka icon on Inventory value.
- **Stock Inventory Refactor (Phase 2)**: Added advanced sorting, bulk action bar, bulk price/stock modals, grid selection checkboxes, and Barcode Scanner Simulation Modal integration.

## Next
- Awaiting next feature requests or tasks.

## Blocker
None

---
ctx: Stock Inventory Refactor Phase 2 complete | done: Sorting, bulk actions, barcode modal | next: Next feature