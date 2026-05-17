# Audit Replay Persistence Lineage

## Problem: The "Memory Leak" for Forensic Replay
The `OfflineTransactionSyncService` successfully creates `SyncActionAuditLog` entries in memory but fails to persist them to disk. This breaks the "Gold Source" replay requirement.

## 1. Lineage Trace
- **Source**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Mechanism**: `_auditLogs` (List<SyncActionAuditLog>)
- **The Gap**: No call to `_persistLogs()` or equivalent after `_syncSingle`.
- **The Culprit**: `_loadLogs()` exists but is "orphaned" (the corresponding writer is missing).

## 2. Impact on Replay Authority
1. **Vanishing Proof**: Successfully synced transactions generate audit logs that disappear on restart.
2. **Attribution Drift**: Replay retries (retryCount increment) are visible in the queue but the *reason* for previous failure (found in audit logs) is lost.
3. **Ambiguous Conflict**: Conflicts requiring manager review lack a locally persisted history of *why* they were flagged during that specific sync attempt.

## 3. Required Correction Strategy (SAFE READ-ONLY)
1. **Define `_persistLogs()`**: Create a serialization method targeting `offline_sync_action_logs.json`.
2. **Hook Persistence**: Every `_replace` or `_syncSingle` outcome must trigger `_persistLogs()`.
3. **Audit Log Type Check**: Ensure `SyncActionAuditLog` includes `client_transaction_id` and `server_status`.

## 4. Operational Invariant
> "A sync attempt without a persisted audit log is a non-event."
