# LuckyStorePOS Frontend-Backend Relationships

## Relationship Overview

All data flows through Supabase. No direct peer connections between frontend apps.

```
Mobile POS ──RPC──┐
                  ├──> Supabase PostgreSQL <── Admin Web
Scraper ──REST────┘      ↑
                    Realtime subscriptions
```

## Mobile POS <-> Supabase

**Protocol**: Supabase Dart SDK (REST + WebSocket)
**Auth**: JWT via Supabase Auth
**Data Access**: RPC functions only (no direct table reads for mutations)
**Offline Path**: Local SQLite -> queue -> sync -> RPC

**Critical Flow**: Sale completion
```
Cart checkout -> OfflineTransactionSyncService
  -> queue file (offline_transaction_queue.json)
  -> sync engine -> complete_sale() RPC
  -> PostgreSQL ledger + inventory movement
```

**Key Files**:
- `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- `apps/mobile_app/lib/offline/sync_engine.dart`
- `apps/mobile_app/lib/offline/manager.dart`

## Admin Web <-> Supabase

**Protocol**: Supabase JS SDK (REST + WebSocket subscriptions)
**Auth**: JWT via Supabase Auth
**Data Access**: RPC functions + RLS-filtered table queries for lists
**Offline Path**: Service worker cache for static assets only

**Critical Flow**: Inventory update
```
User action -> useUpdateInventory hook -> RPC call
  -> PostgreSQL stock_ledger + inventory_movements
```

**Key Files**:
- `apps/admin_web/src/lib/api.ts`
- `apps/admin_web/src/hooks/mutations/useUpdateInventory.ts`
- `apps/admin_web/src/lib/api/withSerializableRetry.ts`

## Scraper <-> Supabase

**Protocol**: Supabase JS SDK (REST)
**Auth**: Service role key (server-side only)
**Data Access**: Direct table inserts to competitor data tables
**Schedule**: Manual / cron

**Key Files**:
- `apps/scraper/scrape-shwapno.js`

## Backend Evolution Contract

**RPC Signature Stability**:
- `complete_sale(...)` has evolved through 7 signature versions across migrations
- Each evolution captured in `scripts/governance/baseline.json` as forward dependency
- Current canonical signature: `complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)`

**Schema Field Migration**:
- `product_id` -> `item_id` (incomplete: still referenced in `pos_provider.dart`, `reconciliation_adjustment.dart`, `supabase/functions/create-sale/index.ts`)
- `qty` -> `quantity` (incomplete: still in `pos_provider.dart`, `reports.ts`, `types.ts`)
- `active` -> `is_active` (incomplete: still in `pos_provider.dart`)

## Privilege Boundary

**Mobile POS**: `authenticated` role via RLS
**Admin Web**: `authenticated` role via RLS
**Scraper**: `service_role` (backend-only, never exposed to clients)
**Migration Replay**: `postgres` superuser (Docker local only)

## Failure Propagation

| Failure Point | Mobile Impact | Admin Impact |
|---|---|---|
| Supabase RPC timeout | Queue accumulation, retry backoff | UI error, data stale |
| RLS misconfiguration | Auth failure, sync blocked | Data invisible, writes rejected |
| Schema mismatch (legacy field) | Malformed payload, sync failure | N/A (uses current schema) |
| Service role key exposure | N/A (mobile cannot access) | CRITICAL: full database access |
