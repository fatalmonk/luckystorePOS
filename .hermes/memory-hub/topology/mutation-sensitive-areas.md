# Mutation Sensitive Areas

## Database (Supabase)
- `public.stock_levels` (Direct edits forbidden)
- `public.ledger_entries` (Append-only)
- `public.inventory_audit_log` (ReadOnly via RPC)

## Infrastructure
- `supabase/migrations/`
- `infra/migration-replay/`
- `scripts/governance/`

## Mobile Offline Layer
- `apps/mobile_app/lib/offline/`
- `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
