# create-sale Edge Function Drift

## Legacy Keys Identified
The `create-sale` edge function (Supabase Function) provides a mapping layer that contains internal drift.

| Location | Legacy Key Used | Correct Key |
|----------|-----------------|-------------|
| `rpcItems` | `qty` | `quantity` (or delta) |
| `snapshot` | `product_id` | `item_id` (standard) |
| `snapshot` | `quantity` | `qty` (table field) |

## Risk
Drift between the `snapshot` stored in the `sales` table and the actual RPC parameters used for stock deduction makes post-hoc reconciliation difficult.
