# Transitional Proof Limitations (P0)

## 1. Unresolved Semantic Drift
Although the `invariant-verifier.ts` now identifies naming drift, it still **masks** structural drift by performing internal mapping.

- **Proof Downgrade**: All proofs joining `stock_levels` (item_id) and `inventory_movements` (product_id) are classified as **TRANSITIONAL**. 
- **Reason**: The "Authority" of a field named `product_id` in a ledger that must remain immutable is questionable when the rest of the system has moved to `item_id`.

## 2. Replay Illusion Persistence
The eval harness checks idempotency via `p_operation_id`. However, because the `OfflineTransactionSyncService` (Flutter) does not currently persist the audit trail of *failed* sync attempts (P1), the eval harness cannot prove:
- That a failed sync attempt correctly logged an error *locally* before retrying.
- That the local audit log exactly matches the server `inventory_movements` entry for a given `client_transaction_id`.

## 3. Authority Imposter Risk
Until the Edge Function (`create-sale`) is normalized (P2), there remains a risk that it transforms payloads in a way that *appears* valid to the RPC but violates the canonical contract (e.g., mismapping nested snapshot data). The eval harness currently only validates the **result** of the RPC, not the **fidelity** of the incoming edge function payload.
