# LuckyStorePOS Repository Relationship Graph

## Dependency Graph

```
                    ┌─────────────────────┐
                    │    Supabase Project   │
                    │  (Staging/Production)   │
                    └──────────┬────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile POS  │     │  Admin Web   │     │   Scraper    │
│   (Flutter)  │     │  (React+Vite)│     │   (Node.js)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Local SQLite│     │  Browser     │     │  Cron/Manual │
│  + Drift DB  │     │  (Vercel)    │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│ Offline Queue│
│ (file + DB)  │
└──────────────┘
```

## Infrastructure Dependencies

```
supabase/migrations/
  -> infra/migration-replay/
    -> scripts/governance/
      -> artifacts/governance/

evals/distributed/
  -> apps/admin_web/node_modules/@supabase/supabase-js
    -> .env.local (SERVICE_ROLE_KEY)

docs/runbooks/
  -> All operational procedures (no code dependencies)
```

## Critical Operational Paths

### Path 1: Sale Transaction (CRITICAL)
```
Mobile POS -> Offline Queue -> Sync Engine -> complete_sale() RPC
  -> PostgreSQL -> inventory_movements (append)
  -> PostgreSQL -> sales (append)
  -> PostgreSQL -> ledger_entries (append)
```

### Path 2: Inventory Update (CRITICAL)
```
Admin Web -> useUpdateInventory hook -> adjust_stock() RPC
  -> PostgreSQL -> inventory_movements (append)
  -> PostgreSQL -> stock_ledger (append)
  -> Realtime -> Mobile POS subscription
```

### Path 3: Migration Deployment (CRITICAL)
```
Migration file -> PR review -> governance:check
  -> replay.sh (local Docker)
    -> schema snapshots
    -> baseline comparison
      -> supabase db push (STAGING ONLY, explicit approval)
```

## Replay-Sensitive Systems

| System | Sensitivity | Failure Mode |
|---|---|---|
| `infra/migration-replay/replay.sh` | CRITICAL | Schema validation fails |
| `scripts/governance/enforce-governance.cjs` | HIGH | Undetected drift |
| `supabase/migrations/*.sql` | CRITICAL | Production schema corruption |
| `apps/mobile_app/lib/offline/` | CRITICAL | Data loss on sync |
| `apps/mobile_app/lib/features/sales/` | CRITICAL | Financial impact |

## Mutation-Sensitive Areas

| Area | Mutation Type | Protection |
|---|---|---|
| `supabase/migrations/` | Schema change | PR review + replay + governance |
| `apps/mobile_app/lib/offline/` | Sync logic | Unit tests + SOP verification |
| `apps/mobile_app/lib/features/sales/` | Transaction logic | Idempotency checks + SOP |
| `infra/migration-replay/` | Replay engine | Version control + deterministic ordering |
| `scripts/governance/` | Rules | Baseline + hash comparison |

## Privilege Boundaries

```
┌─────────────────────────────────────────┐
│ anon (unauthenticated)                  │
│ - search_items_pos (limited)              │
│ - lookup_item_by_scan (limited)          │
├─────────────────────────────────────────┤
│ authenticated (logged in user)            │
│ - All RPC functions via RLS              │
│ - Table queries filtered by tenant/store │
├─────────────────────────────────────────┤
│ service_role (backend scripts)            │
│ - Full database access                     │
│ - Never exposed to clients               │
├─────────────────────────────────────────┤
│ postgres (migration replay)                 │
│ - Superuser                                │
│ - Local Docker only                        │
│ - Never staging/production                 │
└─────────────────────────────────────────┘
```

## Synchronization Boundaries

| Boundary | Direction | Mechanism |
|---|---|---|
| Mobile <-> Supabase | Bidirectional | RPC + offline queue |
| Admin <-> Supabase | Read + RPC | Realtime subscriptions |
| Scraper -> Supabase | Write-only | Direct inserts (service role) |
| Migration replay -> PostgreSQL | Write-only | psql CLI (local) |

## Failure Propagation Paths

```
Migration error
  -> Replay fails
    -> Governance check fails
      -> CI blocks PR
        -> No deployment

Mobile sync error
  -> Queue accumulation
    -> Device storage growth
      -> Queue overflow
        -> Data loss (if no DLQ)

RLS misconfiguration
  -> Data invisible to users
    -> Operational stop
      -> Manual SQL fix required

RPC timeout
  -> Admin dashboard error
    -> User retries
      -> Load amplification
```
