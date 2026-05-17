# Proof Rigor Upgrade (P0)

## 1. Sequence Verification Proof
**Old Proof**: `SUM(deltas) == current_qty`.
**New Rigor**: 
1. `SUM(deltas) == current_qty`
2. `LatestRow.new_quantity == current_qty`
3. `PreviousRow.new_quantity == CurrentRow.previous_quantity`

## 2. Tenant Isolation Proof
**Old Proof**: Ignored tenant boundaries.
**New Rigor**: Every movement must have a `tenant_id` matching its `store_id` (via `stores` table join).

## 3. Replay Forensic Proof
**New Rigor**: Every `deduct_stock` or `adjust_stock` with an `operation_id` must have a corresponding audit entry in `inventory_movements`.
