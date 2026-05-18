# Lucky Store POS

## Stack
Flutter, Dart, Supabase, React, TypeScript, Tailwind, sqflite, Riverpod

## Current
Web admin inventory UI complete — awaiting next task

## Done
- Inventory catalogue screen with product grid, category tabs, search
- LedgerPage null safety fix for current_balance
- Parties RLS policies fix for admin dashboard
- Flutter analyze errors resolved
- Created dedupe migrations: daily_sales + parties RLS policies
- Created duplicate row removal migration (9 tables)
- Navigation rail: 64px→220px collapse, slate-50 bg, 4px accent bar
- Metric cards: horizontal layout, semantic colors (emerald/amber/red/slate)
- Command bar: search, category dropdown, status filter, Grid/List toggle
- Product shelf cards: 1:1 image, status pills, Update Stock button
- Inventory list table: sticky header, status pills, overflow menu actions
- Dashboard sales trend: removed mockup fallback, use real RPC data
- Vercel build: fixed JSX entities, added i18next deps
- Categories RLS: restored permissive SELECT policy (was blocking 22 categories)
- Stock update drawer: solid backdrop (slate-900/60), white bg, proper shadows/z-index

## Blockers
None

## Next
Apply duplicate removal migrations via `supabase db push`

---
ctx: drawer visual fix | done: 13 | next: migrate dedupe
