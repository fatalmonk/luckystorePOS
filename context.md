# Lucky Store POS - Implementation Context

## Current Branch
`fix/production-ready-stabilization`

## Current Status
Production-ready stabilization in progress. Phase 1 (Critical POS Fixes) complete.

## Completed Recently
- ✅ Phase 1: Critical POS Fixes
  - Fix layout overflow (Flexible + ConstrainedBox)
  - Add ProductSearchBar with debounce
  - PaymentScreen exists with 4 payment methods
  - Fix flutter analyze errors (voice_search, manager_pinch)
  - Add shared_preferences dependency
- ✅ Remove competitor price monitoring from Flutter app (web dashboard only)
- ✅ Defensive drop/create for competitor_prices table
- ✅ Competitor Price Monitoring Dashboard (web admin)
  - Types: CompetitorPrice, PriceAlert, filters
  - API: fetch, add, update, delete, alerts
  - UI: Page with alerts summary, filters, DataTable
  - Route: /competitor-prices
  - Nav: Sidebar integration with TrendingDown icon
- ✅ Manual competitor price entry modal
  - Product search with live results
  - Competitor name autocomplete
  - Form validation

## Active Work
- Stabilization fixes for production readiness

## Decisions
- 20240514-1: Singleton for offline sync (single queue guarantee)
- 20240514-2: Drift for offline storage (SQLite, no deps)
- 20240514-3: 50 BD SKUs for demo mode (top 20 favorites)
- 20240514-4: speech_to_text disabled (Flutter 3.29+ incompatibility)
- 20240514-5: PyJWT not python-jose (lighter, sufficient)
- 20240514-6: Conflict resolver with last-write-wins + merge strategies
- 20240514-7: Competitor prices table with 90-day retention (web only)
- 20240514-8: Quick-add favorites grid (sales velocity sort)
- 20240514-9: Customer phone lookup (last 4 digits → auto-fill)
- 20240514-10: Offline queue badge (green/yellow/red status)
- 20240514-11: Printer health indicator (BT + battery)
- 20240514-12: Competitor price monitoring belongs in web dashboard, not mobile POS

## Blockers
- None active

## Next
- Phase 2: Inventory & Catalogue OR merge to main

---
Context updated: 2026-05-14
