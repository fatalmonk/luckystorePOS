# Replay Reactivation Semantics

## 1. Post-Restart Classification
When `_loadQueue` encounters existing entries:

| Saved State | Reactivation State | Classification |
|---|---|---|
| `pending` | `pending` | **Recoverable** (Scheduled) |
| `failed` | `failed` | **Recoverable** (Backoff preserved) |
| `syncing` | `pending` | **Ambiguous** (Assume incomplete) |
| `conflict` | `conflict` | **Blocked** (Awaiting Review) |
| `synced` | `synced` | **Terminal** (Archival) |

## 2. Ambiguity Handling
If an item was `syncing` during a crash:
1. **Pessimistic Reversion**: Reset to `pending`.
2. **Re-Replay**: The next sync attempt will hit the server.
3. **Idempotency Reconciliation**: The server RPC MUST handle the "Success-from-previous-run" case (Status: `ALREADY_SYNCED`).
