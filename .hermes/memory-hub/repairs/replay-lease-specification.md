# Replay Lease Specification

## 1. Replay Lease Lifecycle
A "Lease" is the duration for which a `syncing` state is considered authoritative by the local worker.

- **Lease Grant**: Occurs at `_syncSingle` start.
- **Lease Expiry**: 5 minutes (Internal Constant).
- **Lease Owner**: The active `OfflineTransactionSyncService` instance.

## 2. Stale Lease Recovery
- **Condition**: `tx.state == syncing` AND `DateTime.now() - tx.lease_granted_at > 5m`.
- **Recovery Action**: Revert to `pending`.
- **Duplicate Prevention**: Server-side idempotency (`p_client_transaction_id`) is the final fail-safe.

## 3. Process Death Semantics
On restart, all `syncing` items are treated as "Expired Leases" by the Loader.
