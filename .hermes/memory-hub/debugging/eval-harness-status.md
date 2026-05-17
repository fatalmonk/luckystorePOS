# Evaluation Harness Status (DEBT)

## Status: UNAUTHORITATIVE
The evaluation scripts (`eval-runner.ts`, `invariant-verifier.ts`) are currently considered stale and unauthoritative for production-grade replay verification due to field drift and path mapping inconsistencies.

## Known Issues
1. **Migration Path Drift**: Inconsistent use of `../../.env.local` vs `../../apps/admin_web/.env.local`.
2. **Column Inconsistency**: Mixed use of `item_id` and `product_id` when joining `stock_levels` and `inventory_movements`.
3. **Table mismatch**: Some scripts reference `items` while others reference `inventory_items`.
4. **Setup/Teardown**: Cleanup phase does not fully remove all test tenants/stores, causing ID collision on repeated runs.

## Required Restoration
- Align all identifiers with the `item_id` standard (or document `product_id` as the required ledger key).
- Add support for the `operation_id` idempotency validation.
