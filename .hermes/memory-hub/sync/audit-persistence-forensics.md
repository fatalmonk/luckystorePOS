# Audit Persistence Forensics: Offline Transaction Sync

## Persistence Lifecycle Map
- **Source**: `SaleTransactionIntent` / `SaleTransactionSnapshot` (Generated at point of sale).
- **Storage**: JSON-based flat file `offline_transaction_queue.json` in `getApplicationDocumentsDirectory()`.
- **Commit Trigger**: `enqueueSale`, `_syncSingle` (start), `_syncSingle` (success), `_syncSingle` (fail).
- **Format**: `{"version": 2, "transactions": [QueuedOfflineTransaction...]}`.

## Queue Hydration Flow
1. `initialize()` calls `_loadQueue()`.
2. File is read via `file.readAsString()`.
3. `jsonDecode` maps to `QueuedOfflineTransaction.fromJson`.
4. Logic check: If process died during sync, item remains in `OfflineSyncState.syncing`.

## Missing Persistence Points (Critical)
- **Audit Logs**: `_auditLogs` are **NEVER PERSISTED**. `_loadLogs` is present, but no write operation exists in the codebase. All user actions (Acknowledged Conflict, Retried Selected) are memory-only for audit purposes.
- **Replay Identity**: Fields like `lineage_parent` and `retry_sequence` (as a separate history) are not persisted. Only `retryCount` is stored.

## Memory-Only State Risks
- **Audit Loss**: Complete loss of administrative trace on app restart.
- **In-Flight Volatility**: `_isSyncing` and `_currentlyProcessing` flags are memory-only. If crash occurs during sync, the system loses the "lock" but keeps the state as `syncing`.

## Crash-Loss Boundaries
- **Deterministic Failure**: If app crashes after line 464 (`state: syncing`) but before line 506 (`state: synced`) or 516 (`state: failed`), the transaction is **ORPHANED**. 
- **Evidence**: `_syncQueue` filter (line 428) explicitly excludes `OfflineSyncState.syncing` from candidates. The system will NOT automatically retry an orphaned "syncing" transaction on restart.
