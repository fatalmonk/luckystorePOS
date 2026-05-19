# Lucky Store POS Flutter

## Stack
Flutter, Dart, Supabase, sqflite, Riverpod, mobile_scanner, intl

## Current
Dashboard responsive overhaul complete

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
- Purposeful motion: card hover (translateY -2px), button press (scale 0.98), skeleton loaders, animated KPIs, toast notifications with product highlight
- Dashboard responsive: sidebar → bottom nav on mobile, KPI cards horizontal scroll, product grid 2 cols tablet/1 col phone
- Stock drawer: bottom sheet with drag handle on mobile (< lg)
- Product cards: 4 critical data points only (image, name, stock, price), tooltips for truncated text
- Tabular numbers: font-variant-numeric for aligned currency/quantity columns
- Indian numbering: lakh/crore abbreviation for large values

## Decisions
- Theme: light primary, dark optional via ThemeProvider
- Offline-first: sqflite cache + background Supabase sync
- Locale: en + bn (intl), products need name_bn column
- State mgmt: Riverpod over Bloc
- Scanner: mobile_scanner (ML Kit)
- One task per Hermes session; images = analyze-only
- Progressive disclosure: hide MRP/SKU/Last Updated in list view, show in detail view
- Touch targets: min 44×44px everywhere per WCAG

## Blockers
- Dashboard zero data binding ⚠️ PARTIAL: RPC exists, mockup removed
- Inventory no product catalogue
- No Bengali translation UI
- No payment method selector (cash/bKash/card/credit)
- No barcode scanner flow
- Theme inconsistency (purchase dark vs POS light)

## Next
Phase 2: Dashboard data binding verification

---
ctx: dashboard responsive overhaul | done: 21 | next: data binding verification
