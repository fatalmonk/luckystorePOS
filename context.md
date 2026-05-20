# Lucky Store POS
## Stack
Flutter, Dart, Supabase, React, TypeScript, Tailwind

## Done (56)
- Drawer fixes: removed z-50 from overlay to fix click handling
- Modal component: added size prop (sm/md/lg/xl), scrollable height, top-aligned
- Ledger transaction modal: size="lg" (wider but shorter with scrolling)
- Inventory dropdown auto-fills description + price
- Multi-item transaction recording with items table
- RPC `update_item_prices` deployed with qualified columns
- Price edit fixed — was ambiguous column reference error
- Added client-side search filter to party list in LedgerPage
- Date range filter added to ledger detail view (`dateFrom`, `dateTo`)
- CSV export feature for ledger detail view
- Inline transaction recording (Record Payment drawer for ledger)
- DailySalesPage: renamed to "Daily Sales & Expenditure Summary"
- DailySalesPage: All Sales Entries table now inline-editable spreadsheet
- DailySalesPage: added Sales Total and Net Total auto-calculated columns

## Current
Daily Sales page improvements complete — renamed, calculated columns, inline editing

## Blockers
None

## Next
Commit daily sales changes, optionally add more polish features

---
ctx: daily sales improvements complete | done: 56 | next: commit
