# Audit Log Replay Gap

## Observed Behavior
The `OfflineTransactionSyncService` (Flutter) initializes by loading `SyncActionAuditLog` from `offline_sync_action_logs.json`. However, it NEVER adds new logs or persists changes during the transaction sync process.

## Impact
- No visibility into sync history on the device.
- Replayed transactions are not traced in the local audit log.
- Reliability tracking for offline-to-online transitions is manual.

## Required Fix (Mutation)
- Implement `_persistLogs()` in `OfflineTransactionSyncService`.
- Add audit log entries during `_syncSingle` success/failure paths.
