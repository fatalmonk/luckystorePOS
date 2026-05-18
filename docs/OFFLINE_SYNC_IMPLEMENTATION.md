# Offline-First Sync Implementation

## Overview

Lucky Store POS uses an offline-first architecture that allows cashiers to continue making sales even when the internet connection is unavailable. Transactions are queued locally and synced to Supabase when connectivity is restored.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Flutter Mobile App                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   POS UI    │    │  Sync Queue │    │ Conflict        │  │
│  │             │◄──►│  Manager    │◄──►│ Resolver        │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┼─────────────────────────────┐  │
│  │                         ▼                             │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │      JSON File Persistence (offline_queue.json) │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (when online)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │  complete_sale  │    │  Conflict Detection & Resolution │  │
│  │  RPC Function   │    │  (Price, Stock, Availability)   │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Sync Queue Manager (`offline_transaction_sync_service.dart`)

The core service that manages the sync lifecycle:

- **Queue persistence**: Transactions stored in JSON file (`offline_transaction_queue.json`)
- **Retry logic**: Exponential backoff with jitter
- **State management**: pending → syncing → synced/failed/conflict
- **Worker timer**: Periodic sync attempts every 12 seconds

### 2. Conflict Resolver (`conflict_resolver.dart`)

Intelligent auto-resolution for common conflict types:

| Conflict Type | Auto-Resolution Strategy | Threshold |
|---------------|------------------------|-----------|
| Price dropped | Auto-accept (customer benefits) | Any |
| Price increase | Auto-accept | ≤ 5% |
| Price increase | Requires review | > 5% |
| Small stock shortage | Auto-adjust quantity | ≤ 10% shortage |
| Large stock shortage | Requires review | > 10% shortage |
| Partial items unavailable | Auto-remove unavailable | Any |
| All items unavailable | Cancel or review | Configurable |
| Duplicate transaction | Deduplicate | Any |

### 3. Retry Logic

Exponential backoff with jitter:

```
retry_count: 1  →  ~2-5 seconds
retry_count: 2  →  ~4-7 seconds
retry_count: 3  →  ~8-11 seconds
retry_count: 4  →  ~16-19 seconds
retry_count: 5+ →  ~32-300 seconds (max 5 min)
```

Formula: `delay = min(2^retry_count + random(0-3), 300)` seconds

### 4. Transaction States

```
PENDING ──► SYNCING ──► SYNCED
   │           │
   │           ▼
   └──► FAILED ◄──► CONFLICT (requires review)
```

## Usage

### Enqueue a Sale (Offline)

```dart
final syncService = OfflineTransactionSyncService.instance;

await syncService.enqueueSale(
  intent: SaleTransactionIntent(
    clientTransactionId: 'tx-store123-cashier456-1234567890-abc123',
    transactionTraceId: 'trace-123',
    storeId: 'store-uuid',
    cashierId: 'cashier-uuid',
    sessionId: 'session-uuid',
    items: [...],
    payments: [...],
    cartDiscount: 0.0,
    fulfillmentPolicy: 'STRICT',
  ),
  snapshot: {'stock_snapshot': ...}, // Optional inventory snapshot
);
```

### Force Sync (Manual Trigger)

```dart
await syncService.forceSyncNow(
  actor: SyncActionActor(
    userId: 'cashier-uuid',
    role: 'cashier',
    device: 'ios-device-001',
  ),
);
```

### Retry Failed Transactions

```dart
// Retry specific transactions
await syncService.retrySelected(
  ['tx-001', 'tx-002'],
  actor: actor,
);

// Retry all failed
await syncService.retryAllFailed(actor: actor);
```

### Acknowledge Conflict

```dart
await syncService.acknowledgeConflict(
  clientTransactionId: 'tx-001',
  actor: actor,
);
```

## Configuration

### Conflict Resolver Thresholds

```dart
const resolverConfig = ConflictResolverConfig(
  maxPriceDifferencePercent: 0.05,    // 5%
  maxStockShortagePercent: 0.10,      // 10%
  autoCancelIfAllUnavailable: false,
  autoAcceptPriceDrop: true,
);
```

### Sync Worker Interval

The sync worker runs every 12 seconds (configurable in `initialize()`).

## Monitoring

### Dashboard Stats

```dart
final stats = syncService.dashboardStats();
print(stats.queuedSalesCount);        // Pending + syncing + failed
print(stats.syncedToday);             // Successfully synced today
print(stats.failedSyncs);             // Failed transactions
print(stats.conflictsNeedingReview);  // Conflicts awaiting manager
print(stats.oldestPendingSaleAge);    // Age of oldest pending tx
```

### Operational Alerts

```dart
final alerts = syncService.operationalAlerts();
for (final alert in alerts) {
  if (alert.notifyManager) {
    // Send notification to manager
  }
}
```

Alert types:
- `pending_queue_escalation`: > 25 pending transactions
- `oldest_pending_escalation`: Transaction pending > 3 hours
- `failure_streak_escalation`: > 10 consecutive failures
- `conflict_present`: Conflicts need review
- `conflict_unresolved_escalation`: Conflict unresolved > 24 hours

## Testing

### Run Integration Tests

```bash
cd apps/mobile_app
flutter test test/integration/offline_sync_test.dart
```

### Test Scenarios

1. **Offline enqueue**: Add transactions while offline
2. **Sync on reconnect**: Verify queue processes when online
3. **Conflict resolution**: Test auto-resolution strategies
4. **Retry logic**: Verify exponential backoff
5. **Deduplication**: Same transaction ID only queued once
6. **Persistence**: Queue survives app restart

## Files

| File | Purpose |
|------|---------|
| `lib/features/sales/offline_transaction_sync_service.dart` | Main sync service |
| `lib/features/sales/conflict_resolver.dart` | Conflict resolution logic |
| `lib/features/sales/offline_sync_operational_alert_engine.dart` | Alert generation |
| `lib/features/pos/presentation/screens/sync_queue_screen.dart` | Queue UI |
| `lib/features/pos/presentation/screens/sync_audit_screen.dart` | Audit log UI |
| `test/integration/offline_sync_test.dart` | Integration tests |

## Data Flow

### Happy Path

1. Cashier completes sale offline
2. Transaction enqueued to `syncService.queue`
3. Queue persisted to JSON file
4. Sync worker runs (every 12s)
5. Transaction sent via `complete_sale` RPC
6. Server returns success → marked `synced`
7. Transaction removed from active queue

### Conflict Path

1. Steps 1-4 same as happy path
2. Server detects conflict (price changed, out of stock, etc.)
3. `ConflictResolver` analyzes conflict type
4. **Auto-resolvable**: Transaction adjusted and retried
5. **Requires review**: Marked `conflict`, manager notified
6. Manager reviews in Sync Queue UI
7. Manager acknowledges or deletes transaction

## Security Considerations

- All sync operations use authenticated Supabase client
- Transaction IDs are cryptographically unique (UUID-based)
- Sensitive data in snapshots should be minimized
- Audit logs track all sync actions with actor attribution

## Future Enhancements

- [ ] Migrate from JSON files to Drift SQLite for better performance
- [ ] Add compression for large transaction snapshots
- [ ] Implement delta sync for partial updates
- [ ] Add network quality detection (sync only on good connections)
- [ ] Support for transaction chains (refunds linked to original sales)
