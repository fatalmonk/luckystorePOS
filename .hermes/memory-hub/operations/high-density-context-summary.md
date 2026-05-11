# High-Density Context Summary (Agent Bootstrap)

## Topology
- **Monorepo**: Flutter (Mobile), React (Admin), Supabase (Backend).
- **Architecture**: RPC-Authoritative, Serializable Transactions, Immutable Stock Ledger.
- **Critical Paths**: `complete_sale` -> `deduct_stock` -> `inventory_movements`.

## Current Drift/Debt
- **Field Naming**: item_id (new) vs product_id (legacy).
- **Eval Harness**: Stale identifiers; unauthoritative.
- **Audit Logs**: Mobile sync worker does not persist local action logs.

## Safeguards
- **Protected**: `supabase/migrations/`, `apps/mobile_app/lib/offline/`.
- **Mode**: READ-ONLY by default.
- **Gate**: Human approval for any mutation in Protected Zones.
