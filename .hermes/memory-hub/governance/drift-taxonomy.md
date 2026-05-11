# Drift Taxonomy (LuckyStorePOS)

## Type 1: Naming Drift (Syntactic)
- **Example**: `qty` vs `quantity` vs `amount`.
- **Risk**: Low logic risk, high developer frustration/slow evaluation.

## Type 2: Semantic Drift (Structural)
- **Example**: Snapshot containing `product_id` while the RPC expects `item_id`.
- **Risk**: **HIGH**. Fatal replay mismatch.

## Type 3: Authority Drift (Governance)
- **Example**: Edge Function transforming a payload before the Sync Engine validates it.
- **Risk**: Medium. Logic divergence between "Online" and "Offline" paths.

## Type 4: Replay Nondeterminism (Temporal)
- **Example**: Using `now()` for `created_at` instead of the original transaction timestamp.
- **Risk**: High. Breaks forensic reconciliation and ledger ordering.

## Type 5: Proof Drift (Validation)
- **Example**: Evals checking a legacy schema that no longer exists in production.
- **Risk**: **CRITICAL**. Creates false confidence in a broken system.
