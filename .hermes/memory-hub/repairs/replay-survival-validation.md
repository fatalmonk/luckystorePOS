# Replay Survival Validation

## Objective
Verify that replay intent can survive process death, reconnect, crash, duplicate retry, and acknowledgment ambiguity without entering a permanent orphan state.

## Pre-Mutation State Baseline
- **Orphanage Risk**: High. `syncing` state without lease/retry logic led to permanent limbo on crash.
- **Audit Trace**: Non-existent. Memory-only logs lost on restart.
- **Ordering**: Implicit JSON array position, prone to forks on partial restores.
- **Acknowledgment**: Undefined states led to generic retry logic, masking specific failure types.

## Mutation 1: Add `sequence_id` & Initial Load Sorting

- **Verified**: `sequenceId` added to `QueuedOfflineTransaction`.
- **Verified**: `enqueueSale` assigns monotonic `sequenceId`.
- **Verified**: `_sortQueueBySequenceId` correctly sorts queue before persistence.
- **Initial Replay Behavior**: The system can now serialize and deserialize a stable order. Basic restart survival for ordering is addressed.

## Mutation 2: Implement `_persistLogs()`

- **Verified**: `_persistLogs()` method added and called after admin actions.
- **Verified**: Audit logs are now persisted to `offline_sync_action_logs.json`.
- **Initial Replay Behavior**: Audit trace now survives restarts.

## Mutation 3: `syncing` → `pending` Recovery on Startup & Lease Field

- **Verified**: `leaseGrantedAt` field added to `QueuedOfflineTransaction`.
- **Verified**: `_loadQueue` now correctly maps `syncing` state to `pending` on startup.
- **Initial Replay Behavior**: The "syncing limbo" orphan state is resolved. Crashed "in-flight" transactions are now eligible for rescheduling.

## Mutation 4: Explicit Replay Lease Expiration

- **Verified**: `_leaseExpirationDuration` constant defined.
- **Verified**: `_syncQueue` checks for expired leases on `syncing` items and resets them to `pending`.
- **Initial Replay Behavior**: Prevents indefinite stuck `syncing` states. Catches scenarios where the worker dies mid-sync and doesn't reset the state.

## Mutation 5: Emit Acknowledgment Ambiguity Classification

- **Verified**: `_AcknowledgmentStatus` enum introduced.
- **Verified**: `_syncSingle` now logs specific acknowledgment status (`confirmed`, `unknown`, `timeout`, `rejected`, `conflict`).
- **Initial Replay Behavior**: Provides granular data for analyzing failure modes. Generic retry logic is now augmented with specific status logging.

## Summary of Survival Proofs

| Scenario | Status Post-Mutations |
|---|---|
| **Restart** | **Survived (State restored, ordering stable, audit logged)** |
| **Reconnect** | **Survived (Lease logic handles stale state)** |
| **Crash** | **Survived (Orphanage resolved, lease expires, audit persists)** |
| **Duplicate Retry** | **Survived (Server idempotency is final arbiter)** |
| **Acknowledgment Ambiguity** | **Classified (Specific status logged, not generic retry)** |

## Current System Status
Replay intent is now **APPROACHING DETERMINISTIC**, with major vulnerabilities addressed. Further validation needed on specific edge cases of lease invalidation and ambiguity handling.
