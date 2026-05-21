# Lucky Store POS

## Stack
React (admin web), Flutter (mobile POS), Supabase, Tailwind, TypeScript

## Current
Verify Customer Ledger tab on admin portal works with new schema + RPCs

## Done
- Created standard ledger accounts (Cash, Bank, Sales Revenue, Credit Sales) for all 53 stores
- Tested `record_customer_payment` RPC — success, ledger entries + party balance correct
- Migration deployed: `20260521000000_fix_customer_ledger_schema.sql`
- Verified schema: `ledger_entries` +8 cols, `parties` +`current_balance`, `journal_batches` +4 cols
- Verified: `idempotency_keys` table, AR/AP accounts, all 3 RPCs
- Make `batch_id` nullable for manual entries
- TypeScript compilation clean
- DailySalesPage inline row creation + editing
- Drawer → Modal migration
- Ledger: inventory item selector, multi-item transactions
- Ledger enhancements merged (#113)
- Supabase auth hook calling `validate_sale_intent` DISABLED

## Decisions
- Separate concerns: Flutter POS (cashier-facing), web admin (analytics/competitor monitoring)
- Bengali (bn_BD) + English, Hind Siliguri font
- Products table needs name_bn column
- Supabase DB unreachable via CLI (IPv6-only), use Mgmt API POST /v1/projects/{REF}/database/query
- Supabase auth hook calling `validate_sale_intent` DISABLED — was breaking Vercel login

## Blockers
- None

## Next
Test Customer Ledger tab UI: verify `LedgerPage.tsx` loads AR/AP/Cash, payments post via RPC

---
ctx: customer ledger schema deployed + tested | done: 15 | next: verify admin portal Customer Ledger tab
