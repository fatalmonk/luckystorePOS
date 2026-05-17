# R3 Lease Ownership Repair Log

## 1. Operational Metrics
- **Target**: Zombie Session Recovery
- **Files Modified**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Replay-Risk Classification**: **HIGH-PROTECTION** (Enables safety recovery).

## 2. Lease Lifecycle Implementation
1. **ACQUIRE**: When starting `_syncSingle`, `leaseExpiresAt` is set to `now + 5 minutes`.
2. **LOCKED**: The record enters `syncing` state. The active lease is recorded on the immutable object copy.
3. **RELEASE**: 
   - Upon success OR recognized error completion, the standard `copyWith` transition omits `leaseExpiresAt`, clearing it automatically.
   - If the system crashes during RPC, the lease remains on disk in JSON.
4. **RECLAIM**: On the NEXT call to `_syncQueue()` (triggered manually or by Timer), a safety sweep identifies records whose `leaseExpiresAt` is before `now`, forcefully reverting them from `syncing` to `pending`.

## 3. Proof Coverage
- **Compiler Verification**: `flutter analyze` completed with ZERO syntax errors.
- **Logical Safety**: Reversion is strictly gated to `state == OfflineSyncState.syncing` ensuring no already-synced transactions are mistakenly back-propagated.
