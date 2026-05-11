# Minimal Replay Repair Plan

## Objective
Convert replay from Probabilistic to Deterministic using the smallest possible mutation set.

## 1. Minimal Mutation Set
| File | Change | Purpose |
|---|---|---|
| `offline_transaction_sync_service.dart` | `_loadQueue()`: Map `state.syncing` -> `state.pending` | Break the startup orphanage loop. |
| `offline_transaction_sync_service.dart` | Implement `_persistLogs()` | Ensure administrative trace survives process death. |
| `offline_transaction_sync_service.dart` | `enqueueSale()`: Assign `sequence_id` | Establish stable replay ordering. |
| `QueuedOfflineTransaction` | Add `int sequence_id` to model | Decouple ordering from JSON array position. |

## 2. Impact & Risk
- **Mutation Blast Radius**: Restricted to `OfflineTransactionSyncService` and its DTOs.
- **Deterministic Impact**: Guaranteed removal of "Syncing Limbo" state.
- **Migration Risk**: Low. New field `sequence_id` can default to 0 for legacy items.
- **Rollback Complexity**: Simple. Revert service logic; schema change is additive.

## 3. Certification Value
High. Resolves **[BLOCKER P1]** (Persistence) and prepares for **[BLOCKER P3]** (Lineage).
