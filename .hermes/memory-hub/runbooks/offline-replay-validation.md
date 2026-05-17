# Runbook: Offline Replay Validation

## Overview

This is the authoritative operational proof procedure for offline replay.
Source document: `docs/runbooks/OFFLINE-REPLAY-VALIDATION-SOP.md`

## Prerequisites

1. Admin/mobile runtime pointed at staging
2. Test store and cashier account
3. Known item with visible stock and price
4. SQL access to staging-safe validation queries
5. Physical device or emulator with debug tooling

## Canonical SOPs

### SOP 1: Offline Enqueue
1. Start mobile app with `_offlineSafeMode` active
2. Add item to cart
3. Complete sale while disconnected
4. Inspect `offline_transaction_queue.json`

Expected: `version: 2`, `client_transaction_id`, canonical keys (`item_id`, `quantity`, `discount_amount`)

### SOP 2: Restart Hydration
1. With queued item present, kill app
2. Relaunch
3. Open sync queue UI

Expected: Same transaction visible, same ID, no duplicate, no reset

### SOP 3: Reconnect Replay
1. Re-enable network
2. Trigger manual sync
3. Observe state transition

Expected: Item becomes `synced`, `synced_at` populated, one sale server-side

### SOP 4: Duplicate Replay Proof
1. Capture `client_transaction_id`
2. Trigger sync again for same transaction
3. Query sale, inventory, ledger

Expected: One business effect only

### SOP 5: Retry and Failure Handling
1. Queue sale offline
2. Reconnect with broken endpoint
3. Trigger sync

Expected: `retry_count` increments, `next_retry_at` populated, item remains

### SOP 6: Conflict Attribution
1. Queue stale transaction
2. Mutate server-side stock
3. Replay original
4. Inspect conflict metadata

Expected: Item in `conflict`, `requires_manager_review = true`, correct metadata

### SOP 7: Legacy Queue Invalidation
1. Seed old unversioned queue file
2. Start app
3. Inspect files

Expected: Old file quarantined to `.legacy_v1.json`, active queue empty v2

## SQL Verification Targets

```sql
-- Sale uniqueness by client_transaction_id
SELECT client_transaction_id, COUNT(*) 
FROM sales 
WHERE client_transaction_id = 'test-id' 
GROUP BY client_transaction_id;
-- Expected: count = 1

-- Inventory movement math
SELECT previous_quantity + quantity_delta = new_quantity 
FROM inventory_movements 
WHERE operation_id = 'test-op-id';
-- Expected: true

-- Ledger posting uniqueness
SELECT sale_id, COUNT(*) 
FROM ledger_entries 
WHERE sale_id = 'test-sale-id' 
GROUP BY sale_id;
-- Expected: count = expected ledger chain length (not doubled)
```

## Exit Criteria

Replay is operationally proven when:
1. SOPs 1-7 executed and recorded
2. Duplicate replay test shows single effect (SOP 4)
3. Conflict scenario preserves review metadata (SOP 6)
4. Ledger and inventory invariants checked after replay
5. Stale eval harness repaired or excluded from claims
