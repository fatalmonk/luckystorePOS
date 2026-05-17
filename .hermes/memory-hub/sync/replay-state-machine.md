# Replay State Machine: Offline Sync

## State Definitions
- **`pending`**: Initial state. Transaction is on disk and candidate for `_syncQueue`.
- **`syncing`**: In-flight. RPC to Supabase `complete_sale` has been initiated. Locked from other sync runs.
- **`synced`**: Terminal (Success). Transaction verified by server.
- **`failed`**: Intermediate Error. Network/Timeout occurred. Candidate for retry after `nextRetryAt`.
- **`conflict`**: Server Rejected. Requires Manager Review. Blocked from automatic retry.

## Legal Transitions
- `pending` -> `syncing`: Picked up by worker.
- `syncing` -> `synced`: Server returns `ADJUSTED` or `SAFE`.
- `syncing` -> `conflict`: Server returns `CONFLICT` or `REJECTED`.
- `syncing` -> `failed`: Exception caught (Timeout, DNS, Auth).
- `failed` -> `pending`: Reached `nextRetryAt` OR manual `retrySelected` triggered.
- `conflict` -> `pending`: Manual `retrySelected` (after review).
- `*` -> `Deleted`: Manual `deleteCorruptedItem`.

## Illegal/Orphaned States
- **`syncing` -> `pending`**: No automatic recovery for app crashes.
- **`synced` -> `pending`**: Impossible; terminal.
