# Eval Authority Restoration Report (P0)

## 1. Inspection Findings

### Exact Drift Locations
- **`scripts/evals/invariant-verifier.ts` (Line 41)**: Joins `stock_levels.item_id` to `inventory_movements.product_id`. This is a semantic link built on a naming disconnect. 
- **`scripts/evals/invariant-verifier.ts` (Line 30/47)**: References `qty` as the authoritative current stock.
- **`supabase/functions/create-sale/index.ts` (External context reflection)**: The edge function uses `quantity` in its interface but maps to `qty` for RPCs. The Eval harness currently masks this transformation by only checking RPC results.

### Unsafe Assumptions
- **Assumption**: `stock_levels.qty` is the source of truth. **Reality**: In an append-only ledger architecture, the latest `inventory_movements.new_quantity` is the authoritative truth; `stock_levels` is a cached optimization for fast reads.
- **Assumption**: All `inventory_movements` have a valid `product_id`. **Reality**: Orphaned ledger entries are not checked by the current verifier (it starts from `stock_levels` rows).

### False-Authority Logic
- The verifier claims `✅ All stock levels perfectly match their ledger sums` without verifying the *sequential sequence* (latest row vs total sum).

## 2. Restored Proof Classifications
All evaluations will now emit one of the following statuses:
- **AUTHORITATIVE**: Direct match on canonical fields (`item_id`, `qty`). No fallbacks.
- **TRANSITIONAL**: Logic proves correctness but uses legacy-to-canonical field mapping (e.g., `product_id` -> `item_id`).
- **NON_AUTHORITATIVE**: Proof relies on unverified derived state or unmapped legacy fields.
