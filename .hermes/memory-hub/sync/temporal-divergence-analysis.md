# Temporal Divergence Analysis: Replay Risks

## Reconnect Race Conditions
- **Sync Overlap**: Timed worker runs every 12s. If an RPC takes > 12s, `_isSyncing` prevents overlap, but on app restart, the "lock" is lost while the state remains `syncing`.
- **Concurrent Modification**: UI allows `deleteCorruptedItem` or `acknowledgeConflict` while worker might be in-flight (though `syncing` state blocks most UI actions).

## Duplicate Reconnect Replay
- **The "Ack Gap"**: If server completes sale but client crashes before updating state to `synced`, the `syncing` state remains on disk. 
- **Hazard**: Since `syncing` isn't retried, the system stays consistent but the sale is never marked "synced" on client, even if it succeeded on server. 

## Stale Queue Resurrection
- **Hazard**: A device offline for weeks. 
- **Risk**: `_syncQueue` just iterates. It does not check for `reconciliation_epoch`. It will attempt to replay transactions that are semantically stale (e.g., price has changed 5 times).
- **Validation**: Current code relies on server-side `complete_sale` for all validation.

## Split-Brain Replay
- **Scenario**: Two tablets at same store, one offline, one online.
- **Divergence**: Local inventory snapshots on mobile are NOT updated until a sync occurs. Replays use stale `p_snapshot`.
