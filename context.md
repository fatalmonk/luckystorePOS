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
- Dashboard: removed sales trend mockup fallback, now shows real data or empty state

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
ctx: dashboard data binding | done: 11 | next: dashboard empty state UX or Phase 3
