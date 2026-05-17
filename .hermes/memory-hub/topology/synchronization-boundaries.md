# Synchronization Boundaries

- **Clock Drift**: Replay relies on server-received timestamps for ordering.
- **Queue State**: Transition from `pending` -> `synced` -> `archived`.
- **Conflict Strategy**: Server-side resolution for inventory (LWW - Last Write Wins not allowed for ledger).
