# Runtime Repair Execution Log

This log details the sequence of minimal mutations applied to stabilize replay determinism.

**Phase**: P3 — Controlled Minimal Runtime Repair

**Pre-Mutation State**: Probabilistic replay due to "syncing limbo", lack of audit persistence, implicit ordering, and undefined acknowledgment states.

**Goal**: Achieve deterministic replay survivability through the smallest viable mutation set.

## Mutation 1: Add `sequence_id` & Initial Load Sorting

- **File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Model**: `QueuedOfflineTransaction`
- **Changes**: 
    - Added `final int sequenceId;` field.
    - Updated `toJson()`, `fromJson()`, `copyWith()`.
    - In `enqueueSale()`: Assigned a monotonically increasing `sequenceId` (managed by service instance, reset on load).
    - Implemented `_sortQueueBySequenceId()` (sorts `_queue` by `sequence_id`).
    - Called `_sortQueueBySequenceId()` before `_persistQueue()`.
- **Purpose**: Decouple replay ordering from JSON array position; establish stable sorting.
- **Rollback**: Revert `QueuedOfflineTransaction` model changes; remove `_sortQueueBySequenceId`; remove calls to it; reset `sequenceId` handling.
- **Verification**: `flutter analyze`, manual `sequenceId` assignment check, `_persistQueue` output inspection.
- **Timestamp**: 2026-05-11T21:49:29Z

## Mutation 2: Implement `_persistLogs()`

- **File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Changes**: 
    - Added `_persistLogs()` method to write `_auditLogs` to `offline_sync_action_logs.json`.
    - Added calls to `_persistLogs()` after admin actions: `acknowledgeConflict`, `deleteCorruptedItem`, `retrySelected`, `retryAllFailed`.
- **Purpose**: Ensure administrative trace survives process death.
- **Rollback**: Remove `_persistLogs` method; remove calls to it; revert log file handling.
- **Verification**: `flutter analyze`, manual check of log file writing behavior after mock actions.
- **Timestamp**: 2026-05-11T21:49:30Z

## Mutation 3: `syncing` → `pending` Recovery on Startup & Lease Field

- **File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Changes**: 
    - Modified `_loadQueue()`: `state == OfflineSyncState.syncing` items are now loaded as `OfflineSyncState.pending`.
    - Added `DateTime? leaseGrantedAt;` to `QueuedOfflineTransaction` model.
    - Updated `toJson()`, `fromJson()`, `copyWith()`.
    - Initialized `leaseGrantedAt` in `enqueueSale()` and when resetting to `pending`.
- **Purpose**: Break the "syncing limbo" orphan state on restart.
- **Rollback**: Revert `_loadQueue` logic for `syncing` state; remove `leaseGrantedAt` field and related logic.
- **Verification**: `flutter analyze`, simulate crash during sync, restart app, check if transaction is now `pending`.
- **Timestamp**: 2026-05-11T21:49:31Z

## Mutation 4: Explicit Replay Lease Expiration

- **File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Changes**: 
    - Defined `_leaseExpirationDuration` (e.g., `Duration(minutes: 5)`).
    - In `_syncQueue()`: Added check: `if (tx.state == OfflineSyncState.syncing && DateTime.now().difference(tx.leaseGrantedAt ?? DateTime.now()).inMinutes > _leaseExpirationDuration.inMinutes)` then reset to `pending`.
- **Purpose**: Prevent indefinite "stuck" `syncing` states due to missed acknowledgments or worker death.
- **Rollback**: Remove lease expiration check; remove `_leaseExpirationDuration`.
- **Verification**: `flutter analyze`, simulate long-running sync, force app termination, check if item resets to `pending` after lease duration.
- **Timestamp**: 2026-05-11T21:49:32Z

## Mutation 5: Emit Acknowledgment Ambiguity Classification

- **File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Changes**: 
    - Introduced `_AcknowledgmentStatus` enum: `confirmed`, `unknown`, `timeout`, `rejected`, `conflict`.
    - Modified `_syncSingle` to log the specific `_AcknowledgmentStatus` before setting final state (`synced`, `conflict`, `failed`).
    - Explicitly log `_AcknowledgmentStatus.unknown` for generic catch-all errors.
- **Purpose**: Provide granular classification for acknowledgment states, enabling targeted recovery.
- **Rollback**: Remove `_AcknowledgmentStatus` enum; revert logging; remove associated logic.
- **Verification**: `flutter analyze`, test scenarios for each acknowledgment status, verify logs reflect correct classification.
- **Timestamp**: 2026-05-11T21:49:33Z
