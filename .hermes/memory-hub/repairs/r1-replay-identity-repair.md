# R1 Replay Identity Repair Log

## 1. Operational Metrics
- **Target**: Replay Identity Restoration
- **Files Modified**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Mutation Size**: ~20 lines added, 5 chunks modified.
- **Replay-Risk Classification**: **STABLE** (Contains explicit backward-compatibility fallbacks).

## 2. Ordering Semantics Implementation

### Before State
The queue was maintained as an unordered list in memory, persisted as-is to JSON. On load, order could shift based on file system encoding or arbitrary append timing. No persistent counter guaranteed sequencing.

### After State
1. **Immutable Identifier**: `final int sequenceId` assigned at `enqueueSale`.
2. **Monotonic Counting**: `_nextSequenceId` maintains counter in memory. Derived from `max(sequenceId) + 1` on boot to ensure no reuse.
3. **Enforced Sort**: `_sortQueueBySequenceId()` sorts ascending before ANY write to persistence, guaranteeing sequential iteration in the sync pipeline.

## 3. Legacy Fallback Configuration
To prevent collision or data loss of un-sequenced queue entries from legacy versions:
- **Mapping**: Legacy entries parse their `createdAt.millisecondsSinceEpoch` into the `sequenceId` field.
- **Outcome**: Preserves exact historic temporal ordering without violating the monotonic integer type guarantee.

## 4. Proof Vector
- **Compiler Proof**: `flutter analyze` passed with 0 errors.
- **Lineage Proof**: Grep trace confirmed `sequenceId` appears in 10 specific propagation blocks spanning serialization, construction, math logic, and list mutators.
- **Verification Command**: `flutter analyze` @ 2026-05-11T21:25Z
