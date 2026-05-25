# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
None

## Done
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

## Next
None

## Blocker
None

---
ctx: Dashboard layout tweaks | done: Fix duplicate card, Gamification SVG, and row hierarchy | next: Reports Hub (/reports)