# Eval Drift Emission Spec

## 1. Structured Logging Format
When a verification check uses a non-authoritative path, it must emit:
`[EVAL-DRIFT] <Type> | Expected: <Canonical> | Actual: <Legacy/Compatibility> | Impact: <DowngradeLevel>`

## 2. Drift Types Handled by P0
- **Naming Drift**: `item_id` (Canonical) vs `product_id` (Legacy Ledger).
- **Cache Drift**: `stock_levels.qty` vs latest `inventory_movements.new_quantity`.
- **Param Drift**: `p_quantity` vs `p_quantity_delta` inconsistency.

## 3. Success Gate Logic
- **Success Criteria**: 0 Anomalies.
- **Authority Gate**: If `DriftCount > 0`, the total run status is **TRANSITIONAL_PASS**, never **SUCCESS**.
