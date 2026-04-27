# Conflict Resolution Policy - Lucky Store POS

## Executive Summary

This document defines the rules and procedures for resolving data conflicts in the Lucky Store POS system, particularly in the context of offline-first operations and eventual consistency.

## Core Principle: Server is Single Source of Truth

**The server (Supabase) is ALWAYS the authoritative source of truth.** All offline operations are queued and applied to the server first. The server's decision is final and must be accepted by all clients.

---

## 1. Conflict Scenarios

### 1.1 Inventory Conflicts

**Scenario:** Two POS terminals sell the same product while offline, both expecting to consume the same stock.

**Resolution Strategy: Server-Authoritative**

1. **Queue-based Processing:** Offline operations are queued with timestamps
2. **Server Validation:** Server validates operations in queue order
3. **Atomic Deduction:** Server uses `FOR UPDATE` locks to prevent race conditions
4. **Conflict Detection:** If inventory goes negative, the sale fails at the server end
5. **Client Notification:** Client receives error and displays "Insufficient stock"

**Example:**
```
POSCalculator A goes offline with 10 units of SKU-001
POSCalculator B goes offline with 10 units of SKU-001
Both sell 5 units offline
Server queue order: A first, then B

Result:
- A's sale: SUCCESS (10 → 5)
- B's sale: SUCCESS (5 → 0)
- Both POS shows success
- Server ledger shows both transactions
```

### 1.2 Product Update Conflicts

**Scenario:** Product price updated offline before and after server update.

**Resolution Strategy: Last-Write-Wins + Server Version**

1. **Server Version Tracking:** Each record has a `version` column
2. **Optimistic Concurrency:** Client sends expected version number
3. **Server Validation:** 
   - If version matches: accept and increment
   - If version doesn't match: reject and return latest version
4. **Client Action:** Fetch latest data and apply changes

```sql
UPDATE products 
SET price = ?, 
    version = version + 1
WHERE id = ? AND version = ?
```

### 1.3 Sale Transaction Conflicts

**Scenario:** Duplicate sale submissions from offline POS.

**Resolution Strategy: Idempotency Keys**

1. **Unique Idempotency Key:** Each offline sale gets a UUID as idempotency key
2. **Server-Side Deduplication:**
   ```sql
   CREATE UNIQUE INDEX CONCURRENTLY 
   ON sales (idempotency_key) 
   WHERE idempotency_key IS NOT NULL;
   ```
3. **Duplicate Detection:** Server rejects duplicate idempotency keys
4. **Client Recovery:** Client retrieves original sale from server response

---

## 2. Sync Queue Processing

### 2.1 Queue Ordering

Operations are processed in the following priority order:

1. **Critical Operations** (Priority 1):
   - Stock deduction
   - Stock ledger entries
   - Sale transactions

2. **High Priority** (Priority 5):
   - Inventory updates
   - Price changes

3. **Normal Priority** (Priority 10):
   - User profile updates
   - Settings changes

4. **Low Priority** (Priority 15):
   - Audit logs
   - Analytics data

### 2.2 Queue Processing Order

```
1. Check connection status
2. Clear any failed sync retries
3. Process critical operations from sync queue
4. Process high priority operations
5. Process normal priority operations
6. Process low priority operations  
7. Clean up local cached sales
8. Refresh local inventory data from server
```

### 2.3 Retry Strategy

**Exponential Backoff with Maximum Retries:**

| Attempt | Delay | Status |
|---------|-------|--------|
| 0 | Initial | `pending` |
| 1 | 10 seconds | `retrying` |
| 2 | 20 seconds | `retrying` |
| 3 | 30 seconds | `retrying` |
| 4 | 60 seconds | `retrying` |
| 5+ | 120 seconds | `retrying` |
| 10+ | 300 seconds | `max_retries` → `failed` |

---

## 3. Data Integrity Rules

### 3.1 Inventory Integrity

**Rule 1: Never Allow Negative Stock**
- All stock deductions must pass validation check
- If validation fails, operation is rejected
- User is notified and sale is prevented

**Rule 2: Always Log Stock Movements**
- Every stock change must create a `stock_ledger` record
- Ledger records include `previous_quantity` and `new_quantity`
- No direct stock updates allowed (use `deduct_stock` RPC only)

**Rule 3: Audit Trail is Immutable**
- Once a ledger entry is created, it cannot be modified
- Reversals must create new negative entries
- Never update existing ledger records (use INSERT, not UPDATE)

### 3.2 Sale Integrity

**Rule 1: Atomic Transaction**
- Sale creation and stock deduction happen atomically
- If either fails, both are rolled back
- No partial sales allowed

**Rule 2: Never Delete Sales**
- Voided sales create reversal entries
- Original sale remains in history
- Reversal includes reason and reference to original

**Rule 3: Payment Reconciliation**
- Payment amounts must match sale total
- Refunds must reference original sale
- Never modify completed payment records

---

## 4. Conflict Detection and Resolution Process

### 4.1 Detection Checklist

When a sync completes, check for these conflicts:

1. **Inventory Discrepancies:**
   ```dart
   if (localStock != serverStock) {
     logError("Inventory mismatch for SKU: $sku");
     triggerServerFetch();
   }
   ```

2. **Sale Quantity Mismatches:**
   ```dart
   if (localItems.any((item) => item.quantity != serverItem.quantity)) {
     throw SyncValidationError("Item quantity mismatch");
   }
   ```

3. **Missing Records:**
   ```dart
   if (localRecordCount != serverRecordCount) {
     triggerFullSync();
   }
   ```

### 4.2 Resolution Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Sync Completed                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  Check for Conflicts     │
              └──────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
    NO CONFLICTS                    CONFLICTS DETECTED
              │                           │
              ▼                           ▼
    ┌────────────────┐          ┌──────────────────┐
    │ Mark as Synced │          │  Resolve Conflict│
    └────────────────┘          └──────────────────┘
              │                           │
              ▼                           │
    ┌────────────────┐                    │
    │ Clean up local │                    │
    └────────────────┘                    │
              │                           │
              └───────────┬───────────────┘
                          ▼
              ┌──────────────────┐
              │  Success Message │
              └──────────────────┘
```

### 4.3 Conflict Resolution Methods

**Method A: Server Wins (Default)**
- Most common case
- Server data replaces local data
- User notified of changes

**Method B: Merge Strategy**
- Used for non-critical data
- User edits are merged with server edits
- Example: Custom product notes

**Method C: Manual Resolution (Rare)**
- Critical conflicts
- User must choose which data to keep
- Admin override available

---

## 5. Implementation Guidelines

### 5.1 Error Handling

```dart
try {
  final result = await _dbHelper.syncOperation(operation);
  if (result.isFailure) {
    // Log the failure
    Logger.error('Sync failed: ${result.data}');
    
    // Update status
    await _updateSyncStatus(syncId, SyncStatus.failed);
    
    // Schedule retry with incrementing delay
    scheduleRetry(syncId, delay: calculateRetryDelay(attemptCount));
  }
} catch (e) {
  Logger.error('Unexpected error during sync', e);
  await _updateSyncStatus(syncId, SyncStatus.error, error: e.toString());
}
```

### 5.2 Validation Before Sync

```dart
Future<Result<void>> validateBeforeSync(List<OfflineSale> sales) async {
  for (final sale in sales) {
    // Check required fields
    if (sale.totalAmount <= 0) {
      return Failure<void>('Invalid sale amount');
    }
    
    if (sale.items.isEmpty) {
      return Failure<void>('Sale must have at least one item');
    }
    
    // Check stock availability (pre-sync validation)
    for (final item in sale.items) {
      final available = await _getAvailableStock(item.productId);
      if (available < item.quantity) {
        return Failure<void>('Insufficient stock for ${item.productId}');
      }
    }
  }
  
  return Success<void>(null);
}
```

### 5.3 Logging and Monitoring

**What to Log:**
- All sync operations (start, success, failure)
- Conflict detection and resolution
- Retry attempts with backoff timing
- Data discrepancies found

**What Not to Log:**
- Customer PII (payment info, personal data)
- System passwords or secrets
- Complete sale payloads (log summary only)

---

## 6. Testing Checklist

### 6.1 Unit Tests

- [ ] Stock deduction prevents negative values
- [ ] Idempotency keys prevent duplicate sales
- [ ] Retry logic follows exponential backoff
- [ ] Sync queue processes in correct priority order

### 6.2 Integration Tests

- [ ] Offline → Online sync sequence
- [ ] Concurrent offline sales on different devices
- [ ] Network interruption during sync
- [ ] Failed sync after max retries

### 6.3 Edge Cases

- [ ] Zero stock on offline sale attempt
- [ ] Product price changes during offline session
- [ ] Multiple retry failures in a row
- [ ] Server goes down during sync

---

## 7. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-27 | Initial implementation |

---

## Appendix A: Database Schema References

### Stock Deduction RPC
```sql
CREATE OR REPLACE FUNCTION public.stock_deduce(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer
) RETURNS jsonb
```

### Stock Ledger Table
```sql
CREATE TABLE public.stock_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  entry_type text NOT NULL,
  reason text NOT NULL,
  reference_id text,
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
```

---

## Glossary

- **Idempotency Key:** Unique identifier that prevents duplicate operations
- **Optimistic Concurrency:** Version-based conflict detection
- **Eventual Consistency:** System becomes consistent over time
- **FOR UPDATE Lock:** Database lock that prevents concurrent modifications
- **Exponential Backoff:** Increasing delay between retry attempts
