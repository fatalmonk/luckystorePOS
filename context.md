# Lucky Store POS Flutter

## Stack
Flutter, Dart, Supabase, sqflite, Riverpod, mobile_scanner, intl

## Current
Overhaul UI per use cases #1-4

## Done
- UI state analyzed: POS overflow, empty dashboard, import-only inventory, empty dues, dark-theme purchase
- 7-phase implementation plan generated
- Token saver protocol created for Hermes
- POS overflow fixed: LayoutBuilder + SizedBox instead of Flexible + ConstrainedBox
- Search bar debounced: 300ms delay to reduce RPC calls
- Expense duplicate submission fixed: added isPending checks to all mutations
- Expense delete/update fixed: added RLS policies for DELETE/UPDATE
- POS screen rewritten with responsive layout, cart panel, offline queue
- Vercel build command fixed for landing/ folder
- UI: transparent drawer/modal backdrops fixed via inline styles
- Dashboard: removed sales trend mockup fallback, now shows real data or empty state → committed f17e3e5
- Metric cards: 4 horizontal cards with semantic colors (amber/red/emerald/slate)
- Command bar: search + category dropdown + status filter + segmented Grid/List toggle
- Product shelf cards: vertical layout, 1:1 image area, status pills, Update Stock buttons
- Inventory list table: sticky header, clean rows, status pills, actions with overflow menu

## Decisions
- Theme: light primary, dark optional via ThemeProvider
- Offline-first: sqflite cache + background Supabase sync
- Locale: en + bn (intl), products need name_bn column
- State mgmt: Riverpod over Bloc
- Scanner: mobile_scanner (ML Kit)
- One task per Hermes session; images = analyze-only

## Blockers
- Dashboard zero data binding ⚠️ PARTIAL: RPC exists, mockup removed
- Inventory no product catalogue
- No Bengali translation UI
- No payment method selector (cash/bKash/card/credit)
- No barcode scanner flow
- Theme inconsistency (purchase dark vs POS light)

## Next
Phase 2: Dashboard data binding (Flutter)

---
ctx: inventory list table complete | done: 15 | next: commit and push
