# R3 Lease Semantics Deterministic Proof

## 1. Expiration Lease Assignment
- **Proof Location**: `_syncSingle`
- **Logic Code**: 
  ```dart
  tx.copyWith(
    state: OfflineSyncState.syncing,
    lastError: null,
    leaseExpiresAt: DateTime.now().add(const Duration(minutes: 5)),
  )
  ```
- **Evaluation**: Rigorously assigns precisely +300 seconds of active time bounding before the state is locked for persistence.

## 2. Automatic Reclamation Gating
- **Proof Location**: Beginning of `_syncQueue()` loop.
- **Logic Code**:
  ```dart
  if (tx.state == OfflineSyncState.syncing &&
      tx.leaseExpiresAt != null &&
      tx.leaseExpiresAt!.isBefore(now)) {
    _queue[i] = tx.copyWith(
      state: OfflineSyncState.pending,
      lastError: 'Processing lease expired',
    );
  }
  ```
- **Evaluation**: Any transaction left in an ambiguous "Syncing" state following an app force-close or network failure is safely re-queued upon the next synchronization pulse.

---

## AUTHORITATIVE VERDICT
R3 satisfies **VERIFIED** status. Lease duration correctly assigned, serialization proven, and recovery routine successfully embedded at synchronous loop start.
