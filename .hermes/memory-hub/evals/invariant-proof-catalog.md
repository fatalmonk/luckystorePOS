# Invariant Proof Catalog

## 1. Zero-Sum Ledger Integrity
**Description**: The current quantity in `stock_levels` must exactly equal the sum of all `quantity_delta` in `inventory_movements` for that item/store.
- **SQL Proof**: `SELECT qty - (SELECT SUM(quantity_delta) FROM inventory_movements WHERE product_id = item_id) FROM stock_levels;`
- **Eval**: `scripts/evals/invariant-verifier.ts` -> `verifyLedgerSums()`

## 2. Append-Only Sequential Math
**Description**: For every movement, `previous_quantity + quantity_delta` must equal `new_quantity`.
- **SQL Proof**: `SELECT id FROM inventory_movements WHERE previous_quantity + quantity_delta != new_quantity;`
- **Eval**: `scripts/evals/invariant-verifier.ts` -> `verifyAppendOnlyMath()`

## 3. Idempotency Boundary
**Description**: Replaying the same `operation_id` must result in the same `movement_id` and zero secondary stock mutation.
- **Eval**: `scripts/evals/eval-runner.ts` -> `testDuplicateReplay()`

## 4. Conflict Determinism
**Description**: Any difference between `p_expected_quantity` (client) and `v_current_quantity` (server) MUST trigger a Conflict/Reject response.
- **Eval**: `scripts/evals/eval-runner.ts` -> `testStaleDeviceConflict()`

## 5. Drift Detection Threshold
**Description**: If `syncValidationState` transitions to `MAJOR_DRIFT`, the system must force a reconciliation event.
