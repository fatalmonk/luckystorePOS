# LuckyStorePOS Sync and Reconciliation Architecture

## Dual Queue System

The mobile app operates TWO parallel offline replay systems with different semantics.

```
┌─────────────────────────────────────────┐
│         Offline Transaction Queue        │
│  (Canonical sale path - file-based)      │
├─────────────────────────────────────────┤
│ File: offline_transaction_queue.json    │
│ Version: 2 (enforced)                   │
│ Target RPC: complete_sale(...)          │
│ Retry: Exponential + jitter              │
│ States: pending -> failed -> synced     │
│ Idempotency: client_transaction_id       │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Generic Event Queue (Drift)      │
│  (Event-style replay - SQLite-based)     │
├─────────────────────────────────────────┤
│ Table: offline_events                     │
│ Key: operation_id                         │
│ Target: Various RPCs                     │
│ DLQ: dead_letter_events                   │
│ Conflicts: sync_conflicts table           │
│ States: queued -> processing -> done    │
│ Idempotency: operation_id dedup at enqueue│
└─────────────────────────────────────────┘
```

## Transaction Queue (Canonical)

**File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`

**Queue schema v2**:
```json
{
  "version": 2,
  "transactions": [
    {
      "client_transaction_id": "uuid",
      "item_id": "uuid",
      "quantity": number,
      "unit_price": number,
      "discount_amount": number,
      "unit_cost": number,
      "state": "pending|failed|synced|conflict",
      "retry_count": number,
      "next_retry_at": timestamp,
      "synced_at": timestamp,
      "conflict_meta": object
    }
  ]
}
```

**Legacy invalidation**: Unversioned queue files are quarantined to `.legacy_v1.json` and rewritten as empty v2.

**Critical invariant**: `client_transaction_id` must be stable across retries. Same logical transaction = same ID = one business effect.

## Event Queue (Drift)

**Files**:
- `apps/mobile_app/lib/offline/db.dart` - Schema and generated code
- `apps/mobile_app/lib/offline/sync_engine.dart` - Sync logic
- `apps/mobile_app/lib/offline/manager.dart` - Queue orchestration

**Tables**:
- `offline_events` - Primary queue
- `dead_letter_events` - Hard failures (preserved, not dropped)
- `sync_conflicts` - Conflict metadata

**Key properties**:
- Duplicate event injection blocked at enqueue boundary
- Hard DLQ exists for unrecoverable failures
- Conflict rows captured for manual review

## Server-Side Idempotency

**Migration**: `20260423123000_offline_sync_idempotency.sql`
**Mechanism**: `inventory_movements.operation_id` used for replay-safe deduplication
**Scope**: Inventory RPCs (`adjust_stock`, `deduct_stock`, `complete_sale`)

**Additional hardening**:
- `20260511130244_harden_inventory_movements.sql` - Append-only with arithmetic checks
- `20260511131100_serializable_rpcs.sql` - `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`

## Reconciliation Architecture

**Files**:
- `apps/mobile_app/lib/features/reconciliation/reconciliation_service.dart`
- `apps/mobile_app/lib/features/reconciliation/models/` - Session, entry, variance, adjustment

**Models**:
- `ReconciliationSession` - Physical count session
- `ReconciliationEntry` - Per-SKU count entry
- `ReconciliationVariance` - Count vs system difference
- `ReconciliationAdjustment` - Approved correction

**Flow**:
```
Start session -> Count items -> Submit counts
  -> System computes variances
  -> Manager review -> Approve adjustments
  -> Adjustments post to inventory_movements (ledger append)
```

## Telemetry

**Files**: `apps/mobile_app/lib/telemetry/`

**Metrics collected**:
- `ConflictRateMetric` - Sync conflict frequency
- `DeviceSyncProfile` - Per-device sync behavior
- `DLQMetric` - Dead letter queue depth
- `InventoryDivergenceMetric` - Count vs system variance
- `OfflineSessionMetric` - Time offline, operations queued
- `QueueDepthMetric` - Pending sync queue size
- `ReplayLatencyMetric` - Time from queue to server confirmation
- `RPCHealthMetric` - RPC success/failure rates
- `SyncHealthMetric` - Overall sync pipeline health

**Storage**: `telemetry_storage.dart` (local persistence)
**Aggregation**: `telemetry_aggregator.dart` (rollup for reporting)
**Streams**: `telemetry_streams.dart` (real-time emission)

## Known Gaps

1. **Dual queue unification unresolved** - Transaction queue and event queue have different retry semantics, state machines, and idempotency models
2. **Audit log incomplete** - `OfflineTransactionSyncService` loads audit logs but does not persist new audit entries during sync
3. **Edge function drift** - `supabase/functions/create-sale/index.ts` still uses `product_id` in snapshot construction
4. **Eval harness stale** - `scripts/evals/eval-runner.ts` still contains legacy column references
