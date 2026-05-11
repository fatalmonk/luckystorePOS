# Root-Cause Pattern Synthesis

## A. Replay Nondeterminism
- **Cause**: Client-generated `created_at` used for server-side ledger ordering.
- **Fix**: Use Server `now()` or Sequence IDs.

## B. Orphaned Transactions
- **Cause**: Sale record created but stock deduction failed (pre-SERIALIZABLE debt).
- **Fix**: Wrap in RPC transaction block.

## C. Field Drift (The ID Trap)
- **Cause**: `product_id` vs `item_id` in joins.
- **Fix**: Standardize on `item_id` for table columns, `product_id` for RPC params.
