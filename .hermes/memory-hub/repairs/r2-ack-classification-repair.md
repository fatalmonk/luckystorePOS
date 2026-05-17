# R2 ACK Classification Repair Log

## 1. Operational Metrics
- **Target**: Deterministic Acknowledgment Semantics
- **Files Modified**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Replay-Risk Classification**: **HIGH-STABILITY** (Prevents storming condition).

## 2. ACK Taxonomy Defined

| Classification | Type | Trigger Event | Next State |
|---|---|---|---|
| `success` | TERMINAL | RPC 'SUCCESS' \| 'ADJUSTED' | `synced` |
| `retryableNetworkFailure` | RETRY | Socket / Timeout / HTTP Exception | `failed` (Auto-Retry) |
| `retryableServerFailure` | RETRY | Postgres 40001, 40P01, 5xxxx | `failed` (Auto-Retry) |
| `terminalValidationFailure` | TERMINAL | RPC 'REJECTED', 42xxx, generic non-retriable exception | `conflict` (Manual) |
| `terminalConflictFailure` | TERMINAL | RPC 'CONFLICT' | `conflict` (Manual) |
| `unknownFailure` | TERMINAL | Generic catch, Exhausted Max Retries | `conflict` (Manual) |

## 3. Replay State Transition Norms
1. **QUEUED** (`OfflineSyncState.pending`)
2. **PROCESSING** (`OfflineSyncState.syncing`)
3. **GATEWAY** (Execution of `_classifyRpcResponse` or `_classifyException`)
4. **TERMINAL PATHS**:
   - Success → `synced`.
   - Retryable → `failed` (Re-enters loop via incrementing `retryCount`).
   - Terminal / Capped → `conflict` (Locks from future auto-replay, requires manager action).

## 4. Safety Constraints Established
- **INFINITE LOOP PREVENTION**: If `retries >= 15`, classification unconditionally yields `unknownFailure` (Terminal), preventing permanent queue replay storms.
- **PERSISTENCE CONTINUITY**: `lastAckClassification` is saved alongside each transaction for historical tracing.
- **FALLBACK**: Missing legacy classification hydrates as `null`, then fills to `unknownFailure` only if explicitly mapped poorly.
