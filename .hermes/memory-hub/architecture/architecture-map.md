# LuckyStorePOS Architecture Map

## System Overview

LuckyStorePOS is a multi-platform retail management system for Bangladeshi retail businesses, consisting of:

- **Flutter Mobile POS App** - In-store sales, inventory, barcode scanning, offline support
- **React + Vite Admin Dashboard** - Analytics, inventory control, sales history
- **Supabase Backend** - PostgreSQL, auth, RLS, RPC functions, real-time
- **Migration Replay Infrastructure** - Deterministic schema validation
- **Distributed Eval System** - Chaos testing and reconciliation validation

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Flutter Mobile App (POS)    │  React Admin Web (Dashboard)  │
│  - Sales & Checkout           │  - Analytics & Reports        │
│  - Inventory Management       │  - Inventory Control         │
│  - Barcode Scanning           │  - Sales History              │
│  - Label Printing             │  - Purchase/Expense Mgmt      │
│  - Offline Sync               │  - Customer/Supplier Ledgers │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Flutter Services              │  React Services              │
│  - Supabase Client             │  - Supabase Client            │
│  - Offline Queue               │  - RPC Functions             │
│  - Sync Engine                 │  - Query Hooks                │
│  - Telemetry                   │  - Mutation Hooks            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database          │  Supabase Services           │
│  - Core Tables                 │  - Authentication             │
│  - RLS Policies                │  - Realtime Subscriptions     │
│  - RPC Functions               │  - Edge Functions             │
│  - Triggers                    │  - Storage                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Migration Replay System      │  Distributed Eval System      │
│  - Schema Validation           │  - Chaos Testing              │
│  - Dependency Tracking         │  - Reconciliation Validation  │
│  - Governance Enforcement      │  - Deterministic Testing      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Mobile App (Flutter)
- **Location**: `apps/mobile_app/`
- **Features**: Sales, checkout, inventory, auth, print, offline sync
- **Key Directories**:
  - `lib/features/` - Feature modules (sales, auth, checkout, etc.)
  - `lib/offline/` - Offline queue and sync logic
  - `lib/sync/` - Synchronization engine
  - `lib/telemetry/` - Telemetry collection

### Admin Web (React + Vite)
- **Location**: `apps/admin_web/`
- **Features**: Dashboard, products, inventory, sales, reports
- **Key Directories**:
  - `src/features/` - Feature modules (dashboard, products, sales, etc.)
  - `src/lib/` - Shared utilities and Supabase client
  - `src/services/` - API service layer
  - `src/hooks/` - React hooks for state management

### Supabase Backend
- **Location**: `supabase/`
- **Components**:
  - `migrations/` - PostgreSQL schema migrations (80+ files)
  - `functions/` - Edge functions
  - `config.toml` - Local Supabase configuration

### Migration Replay System
- **Location**: `infra/migration-replay/`
- **Purpose**: Deterministic schema validation and replay
- **Components**:
  - `build_function_registry.cjs` - RPC function registry
  - `build_migration_dependencies.cjs` - Migration dependency graph
  - `build_ownership_graph.cjs` - Table ownership tracking
  - `replay.sh` - Migration replay orchestration
  - `replay_report.cjs` - Replay analysis and reporting

### Governance System
- **Location**: `scripts/governance/`
- **Purpose**: Enforce architectural rules and invariants
- **Components**:
  - `enforce-governance.cjs` - Governance rule enforcement
  - `baseline.json` - Governance baseline definitions

### Distributed Eval System
- **Location**: `evals/distributed/`
- **Purpose**: Chaos testing and reconciliation validation
- **Components**:
  - `chaos-runner.cjs` - Chaos testing framework
  - `reconciliation-eval.cjs` - Reconciliation validation

## Data Flow

### Sales Transaction Flow
```
Flutter POS → Offline Queue → Sync Engine → Supabase RPC → PostgreSQL
     ↓              ↓               ↓              ↓            ↓
  Local DB    Queue Storage   Conflict Res.   Validation   Ledger Update
```

### Admin Dashboard Query Flow
```
React Admin → Supabase Client → RPC Functions → PostgreSQL → Results
     ↓              ↓               ↓              ↓          ↓
  UI Render   Auth/RLS Check   Data Transform   Query    Response
```

### Migration Replay Flow
```
Migration File → Dependency Graph → Schema Snapshot → Replay → Validation
      ↓                ↓                ↓            ↓          ↓
   Parse          Build Graph      Capture State   Apply    Compare
```

## Key Architectural Patterns

### 1. Multi-Tenant Architecture
- Tenant isolation at database level
- Store-level scoping within tenants
- RLS policies enforce data boundaries

### 2. Offline-First Mobile
- Local SQLite database for offline operations
- Operation queue for deferred sync
- Conflict resolution on reconciliation

### 3. RPC-Backed Data Layer
- All admin queries use Supabase RPC functions
- Centralized business logic in database
- Consistent data access patterns

### 4. Immutable Ledger Pattern
- All mutations create ledger entries
- Stock adjustments are append-only
- Audit trail preserved

### 5. Deterministic Replay
- Migrations are replayable
- Schema changes are validated
- Governance rules enforced

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter, Dart |
| Admin Web | React, Vite, TypeScript |
| Backend | Supabase, PostgreSQL |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Local Dev | Supabase CLI, Docker |
| Deployment | Vercel (admin), APK (mobile) |
| Printer | MHT-P29L Bluetooth |
| Maps | Google Maps |
| Payment | SSLCommerz |

## Critical Invariants

1. **Ledger Immutability** - Stock adjustments cannot be deleted
2. **RLS Enforcement** - All data access respects tenant/store boundaries
3. **RPC Idempotency** - RPC functions are idempotent where possible
4. **Offline Consistency** - Sync preserves data integrity
5. **Migration Determinism** - Schema changes are replayable
6. **Governance Compliance** - All changes respect governance rules

## Mutation-Sensitive Areas

- `supabase/migrations/` - Schema changes
- `apps/mobile_app/lib/offline/` - Offline sync logic
- `apps/mobile_app/lib/features/sales/` - Sales transaction logic
- `infra/migration-replay/` - Replay infrastructure
- `scripts/governance/` - Governance enforcement
- RPC functions in Supabase
- Inventory ledger tables

## Operational Boundaries

### Runtime Boundaries
- **Local Development**: Supabase Docker stack
- **Staging**: Remote Supabase project
- **Production**: Remote Supabase project (same as staging)

### Synchronization Boundaries
- **Mobile ↔ Supabase**: Offline sync queue
- **Admin ↔ Supabase**: Real-time subscriptions
- **Migration Replay**: Local Docker environment

### Failure Propagation Paths
- **Offline Sync Failure**: Queue accumulation, data divergence
- **RPC Failure**: Admin dashboard data unavailability
- **Migration Failure**: Schema drift, replay divergence
- **Governance Failure**: Architectural rule violations