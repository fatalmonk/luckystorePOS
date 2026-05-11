# Eval Authority Restoration Plan (Stage 1)

## Status: TRUST REVOKED
The evaluation harness currently contains structural drift that invalidates deterministic verification.

## 1. Field Mapping Correction Matrix
| Component | Legacy/Incorrect Field | Canonical Runtime Expected | Priority |
|-----------|-------------------------|----------------------------|----------|
| Invariant Verifier | `product_id` (on movements join) | `item_id` (from stock_levels join) | P0 |
| Invariant Verifier | `qty` (on stock_levels) | `qty` (confirmed in schema) | P0 |
| Eval Runner RPC | `p_product_id` | `item_id` (alignment check) | P1 |
| Edge Function | `item_id` (items array) | `item_id` | P1 |
| Edge Function | `qty` (rpc items) | `qty` | P1 |
| Edge Function | `product_id` (snapshot) | `item_id` (alignment) | P1 |
| Edge Function | `quantity` (snapshot) | `qty` (alignment) | P1 |

## 2. Restoration Steps (SAFE READ-ONLY)
1. **[EVAL]** Modify `scripts/evals/invariant-verifier.ts` to correctly join `inventory_movements.product_id` with `stock_levels.item_id`.
2. **[EVAL]** Update `scripts/evals/eval-runner.ts` to use consistent naming for test seeds.
3. **[EDGE]** Standardize snapshot payload in `supabase/functions/create-sale/index.ts` to match the canonical `item_id`/`qty` pattern.

## 3. Verification Contract
Trust is restored ONLY when the following three commands return GREEN:
1. `npm run governance:check` (Schema vs Runtime Check)
2. `npm run replay:test` (Deterministic ID Replay)
3. `npm run evals` (Harness Execution)

## 4. Constraint Checklist
- [ ] No `qty` calculation used without `item_id` context.
- [ ] No `product_id` reference in `stock_levels` table.
- [ ] Snapshot items must be 1:1 match with RPC item params.
