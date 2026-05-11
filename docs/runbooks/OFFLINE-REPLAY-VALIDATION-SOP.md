# Offline Replay Validation SOP

## Scope

This runbook is the authoritative operational proof procedure for offline replay in LuckyStorePOS during the current stabilization phase.

It is intentionally evidence-based:

- It documents the replay paths that exist in code today.
- It names the instrumentation that already exists.
- It identifies unproven surfaces explicitly.
- It does not claim end-to-end replay correctness without runtime evidence.

## Current Implementation Surfaces

### Mobile sale queue

Primary queue path:

- [offline_transaction_sync_service.dart](/Users/ioriimasu/dev/luckystorePOS/apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart)

Key properties:

- sale queue persisted to `offline_transaction_queue.json`
- queue schema version enforced with `version: 2`
- legacy unversioned queue invalidated to `offline_transaction_queue.legacy_v1.json`
- replay target is `public.complete_sale(...)`
- retry backoff is exponential with jitter
- conflict outcomes remain in queue with `state=conflict`
- failed retries remain in queue with `state=failed`

### Drift-based generic event queue

Generic event queue path:

- [db.dart](/Users/ioriimasu/dev/luckystorePOS/apps/mobile_app/lib/offline/db.dart)
- [sync_engine.dart](/Users/ioriimasu/dev/luckystorePOS/apps/mobile_app/lib/offline/sync_engine.dart)
- [manager.dart](/Users/ioriimasu/dev/luckystorePOS/apps/mobile_app/lib/offline/manager.dart)

Key properties:

- `offline_events` table keyed by `operation_id`
- duplicate event injection blocked at enqueue boundary
- hard DLQ exists via `dead_letter_events`
- conflict rows captured in `sync_conflicts`
- this path currently covers event-style replay, not the canonical queued sale file path

### Server-side replay/idempotency surfaces

Key migration/runtime evidence:

- [20260511130244_harden_inventory_movements.sql](/Users/ioriimasu/dev/luckystorePOS/supabase/migrations/20260511130244_harden_inventory_movements.sql)
- [20260511131100_serializable_rpcs.sql](/Users/ioriimasu/dev/luckystorePOS/supabase/migrations/20260511131100_serializable_rpcs.sql)
- [20260423123000_offline_sync_idempotency.sql](/Users/ioriimasu/dev/luckystorePOS/supabase/migrations/20260423123000_offline_sync_idempotency.sql)
- [20260426213841_domain_rpcs_trust_engine.sql](/Users/ioriimasu/dev/luckystorePOS/supabase/migrations/20260426213841_domain_rpcs_trust_engine.sql)

Observed guarantees:

- `inventory_movements.operation_id` used for replay-safe deduplication on inventory RPCs
- append-only inventory movement table with non-negative and arithmetic checks
- sale sync conflict logging infrastructure exists server-side
- `complete_sale(...)` remains the canonical mobile sale replay RPC boundary

## Evidence Limits

The following are not yet sufficient as proof on their own:

- [docs/architecture/offline-sync.md](/Users/ioriimasu/dev/luckystorePOS/docs/architecture/offline-sync.md)
  - currently placeholder-level only
- [scripts/evals/eval-runner.ts](/Users/ioriimasu/dev/luckystorePOS/scripts/evals/eval-runner.ts)
  - still contains stale `product_id`, `qty`, and `active` assumptions
- [scripts/evals/invariant-verifier.ts](/Users/ioriimasu/dev/luckystorePOS/scripts/evals/invariant-verifier.ts)
  - still queries legacy column names

Conclusion:

- replay infrastructure exists
- replay proof is partial
- operational validation must currently be manual-first

## Replay Validation Matrix

| Scenario | Trigger | Expected invariant | Instrumentation required | Observable success condition | Failure signal | Risk |
|---|---|---|---|---|---|---|
| 1. Offline enqueue | Complete sale while `_offlineSafeMode` is enabled | Canonical queue payload is persisted with `item_id`, `quantity`, `discount_amount` and queue `version=2` | Mobile app logs, local app documents directory, queue file inspection | `offline_transaction_queue.json` contains one queued transaction with canonical keys only | Missing queue file, legacy keys present, duplicate enqueue for same `client_transaction_id` | High |
| 2. Restart hydration | Restart app after offline enqueue | Queue entries survive restart and rehydrate without schema drift | Queue screen, local file inspection, startup logs | Queued item reappears with same `client_transaction_id`, state, retry count, and snapshot | Queue silently disappears, malformed parse, state reset | High |
| 3. Reconnect replay | Restore connectivity and trigger sync | `complete_sale(...)` is called once per queued sale and synced entries transition to `synced` | Queue screen, Supabase SQL editor, app logs | Queue item moves to `synced`, `synced_at` set, corresponding sale exists server-side | Item loops between states, remains pending indefinitely, RPC error with no retry state | High |
| 4. Duplicate replay prevention | Trigger replay twice for same transaction | Replay is idempotent and does not create duplicate business effect | Queue file, sales table, inventory movement/ledger inspection | One sale effect only for one `client_transaction_id` | Duplicate sale rows, duplicate inventory movement, ledger double-posting | Critical |
| 5. Partial replay failure | Force RPC/network failure mid-replay | Failed item remains recoverable and moves to `failed` with incremented retry metadata | Queue screen, app logs, queue file | `retry_count` increments, `next_retry_at` populated, item not deleted | Item disappears, duplicate retry storm, corrupted state | High |
| 6. Dead-letter routing | Exhaust retries on Drift event queue path | Hard failures are preserved in DLQ instead of silently dropped | Drift DB inspection via debug tooling or custom probe, dead-letter UI | `dead_letter_events` row exists with `operation_id` and `failure_reason` | Event vanishes after max retries | Medium |
| 7. Queue invalidation handling | Start app with legacy unversioned queue file | Legacy file is quarantined, active queue becomes canonical empty v2 queue | App documents directory inspection | `offline_transaction_queue.legacy_v1.json` created and active queue rewritten with `version=2` | Legacy queue ingested directly, malformed replay attempted | High |
| 8. Reconciliation consistency | Replay a sale, then inspect reconciliation workflows | Replay does not bypass later reconciliation accounting expectations | Supabase Studio, reconciliation screens, reconciliation tables | Reconciliation surfaces remain internally consistent after replayed sale | Variance mismatches or orphan reconciliation entries | High |
| 9. Ledger consistency | Replay a sale and inspect ledger consequences | Replay produces one immutable accounting effect for one business event | SQL checks on ledger tables and sale linkage | One ledger chain per sale, no duplicate posting for repeated replay | Duplicate ledger postings or missing sale linkage | Critical |
| 10. Inventory consistency | Replay a sale and inspect inventory state | Server-authoritative stock result remains non-negative and movement math holds | `inventory_movements`, stock queries, invariants | `previous_quantity + quantity_delta = new_quantity` and stock matches expected post-sale | Negative stock, duplicate decrement, movement math mismatch | Critical |
| 11. Retry/idempotency behavior | Force transient error, then retry later | Retries preserve transaction identity and do not mutate canonical payload | Queue file, logs, repeated server-side lookup by `client_transaction_id` | Same transaction reattempted with same identity, later success yields one business effect | New transaction IDs generated on retry, multiple sales for same logical action | Critical |
| 12. Conflict attribution integrity | Force server conflict on stale snapshot or inventory drift | Conflict result is attributable to the correct transaction and preserved for review | Queue screen, conflict UI, `conflict_meta`, server conflict tables | Correct `client_transaction_id`, reason, and snapshot context preserved | Conflict shown with wrong transaction, missing metadata, no review path | High |

## Manual Validation SOP

### Prerequisites

Run against the real staging-backed app topology, not local Supabase as a runtime substitute.

Required:

1. Admin/mobile runtime pointed at staging
2. A test store and cashier account
3. Known item with visible stock and price
4. SQL access to staging-safe validation queries
5. Physical device or emulator with access to app documents directory or equivalent debug tooling

### SOP 1: Canonical offline enqueue

1. Start mobile app.
2. Confirm `_offlineSafeMode` path is active in the test session.
3. Add one item to cart.
4. Complete sale while disconnected.
5. Inspect local queue file.

Expected:

- file exists at app documents path as `offline_transaction_queue.json`
- root object contains `version: 2`
- queued entry contains `client_transaction_id`
- item rows contain `item_id`, `quantity`, `unit_price`, `discount_amount`, `unit_cost`
- no `product_id`, `qty`, or `discount` legacy payload keys

Rollback/recovery:

- delete the queued test item from the sync queue screen or remove the queue file from the test device after evidence capture

### SOP 2: Restart hydration

1. With queued item present, kill the app fully.
2. Relaunch the app.
3. Open sync queue UI.

Expected:

- same queued transaction visible
- same transaction ID
- no spontaneous duplicate row
- no reset to empty queue

Failure signals:

- queue disappears
- queue rewrites to empty unexpectedly
- transaction state or payload mutates across restart

### SOP 3: Reconnect replay

1. Re-enable network.
2. Trigger manual sync from queue UI or wait for worker tick.
3. Observe queue state transition.
4. Verify sale server-side using `client_transaction_id`.

Expected:

- queue item leaves `pending`/`failed` and becomes `synced`
- `synced_at` populated
- one sale exists server-side for that client transaction

Failure signals:

- repeated retries with no terminal state
- duplicate sale creation
- queue item disappears without a sale result

### SOP 4: Duplicate replay proof

1. Keep one captured `client_transaction_id`.
2. Trigger sync again for the same logical transaction, or replay the same server request in a controlled test harness.
3. Query sale, inventory, and ledger state.

Expected:

- second replay does not create a second sale effect
- inventory effect remains single-application only
- ledger effect remains single-application only

Failure signals:

- duplicate sale row
- stock decremented twice
- second ledger posting chain

### SOP 5: Retry and failure handling

1. Queue a sale offline.
2. Reconnect with an intentionally broken endpoint or invalid auth/network path.
3. Trigger sync.
4. Observe `retry_count`, `next_retry_at`, and `last_error`.

Expected:

- item transitions to `failed`
- retry metadata advances deterministically
- item remains present for later retry

Failure signals:

- item deleted on failure
- retry metadata not updated
- duplicate parallel retries

### SOP 6: Conflict attribution

1. Queue a stale transaction against stock that will change before replay.
2. Mutate server-side stock by a competing action.
3. Replay original queued transaction.
4. Inspect queue screen and conflict metadata.

Expected:

- item lands in `conflict`
- `requires_manager_review = true`
- `conflict_meta` contains server response context
- correct transaction remains selectable in conflict/review UI

Failure signals:

- transaction marked `synced` despite conflict
- conflict is not attributable to the original transaction
- manager review path missing

### SOP 7: Legacy queue invalidation

1. Seed app documents directory with an old unversioned queue file.
2. Start the app.
3. Inspect queue files after startup.

Expected:

- old file copied to `offline_transaction_queue.legacy_v1.json`
- active queue rewritten to `version: 2` with empty `transactions`

Failure signals:

- old queue loaded directly
- active queue remains unversioned
- malformed payload proceeds into replay path

## Required SQL Verification Targets

Use staging-safe read queries only.

Verify:

- sale count by `client_transaction_id`
- inventory movement count and math for the replayed item
- ledger posting uniqueness for the replayed sale
- reconciliation records for the affected store/date if applicable

Minimum invariants:

1. One logical sale produces one business effect.
2. Inventory decrement is applied once.
3. Ledger posting is append-only and non-duplicated.
4. Conflict/rejection states remain inspectable.

## Known Gaps

These surfaces remain unproven or incomplete today:

1. `OfflineTransactionSyncService` loads audit logs but does not persist new audit entries, so audit replay evidence is incomplete.
2. The generic Drift event queue and the canonical sale queue are parallel replay systems with different operational semantics.
3. Existing TypeScript eval harness scripts still contain legacy schema references and cannot currently be used as authoritative replay proof.
4. The edge function [supabase/functions/create-sale/index.ts](/Users/ioriimasu/dev/luckystorePOS/supabase/functions/create-sale/index.ts) still builds a snapshot with `product_id` in one path; that is a drift signal and should not be used as proof of canonical replay integrity.
5. This SOP does not replace CI governance enforcement or SQL privilege normalization.

## Exit Criteria For Replay Operational Proof

Replay correctness can be considered operationally proven only when all of the following are true:

1. SOP scenarios 1 through 7 have been executed and recorded.
2. At least one duplicate replay test has server-side evidence showing a single business effect.
3. At least one conflict scenario has preserved review metadata.
4. Ledger and inventory invariants have been checked after replay.
5. The stale eval harness has either been repaired or explicitly excluded from proof claims in release readiness decisions.
