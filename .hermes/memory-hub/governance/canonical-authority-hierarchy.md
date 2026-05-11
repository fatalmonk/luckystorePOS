# Canonical Authority Hierarchy

## Objective
Provide the tie-breaking logic for all drift reconciliation. In any conflict between subsystems, the Authority Ranking below prevails.

## 1. Domain Authority Ranking
| Domain | Primary Authority (Gold Source) | Secondary Authority (Derived) |
|--------|---------------------------------|-------------------------------|
| **Sale Intent** | Mobile Canonical Queue (`offline_transaction_queue.json`) | Web Admin, Edge Function Logs |
| **Inventory Math** | Supabase Ledger (`inventory_movements`) | `stock_levels` table, Mobile Local Cache |
| **Idempotency** | `p_client_transaction_id` (Unique Index) | `operation_id`, Snapshot IDs |
| **Replay Status** | Sync Engine Execution State | Mobile UI Labels, Audit Logs |
| **Fulfillment Policy** | `p_fulfillment_policy` (RPC Entry) | Mobile App Settings |
| **Product Metadata** | `inventory_items` Table | Point-of-Sale UI Labels |

## 2. Invariant Ownership Matrix
| Invariant | Owner (Enforcement Point) | Target Artifact |
|-----------|---------------------------|-----------------|
| **Double-Spend/Replay** | Sync Engine / Postgres Index | `p_client_transaction_id` |
| **Ledger Zero-Sum** | SQL Invariant Verifier | `verifyLedgerSums()` |
| **Append-Only Integrity**| Postgres Trigger | `prevent_inventory_movement_update` |
| **Forensic Trace** | Audit Persistence Layer | `offline_sync_action_logs.json` |
| **Semantic Payload** | Canonical Contract v1 | `eval-runner.ts` |

## 3. Arbitration Hierarchy
1. **The Ledger**: If the ledger says a movement happened, it happened.
2. **The Queue**: If the queue contains a pending transaction, it is the intent of record.
3. **The Snapshot**: Snapshots are for reconstruction ONLY; they never override the Queue or the Ledger.
