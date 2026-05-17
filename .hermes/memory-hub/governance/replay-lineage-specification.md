# Replay Lineage Specification v1

## Objective
Establish the formal semantics for replay identity, causal ordering, and inventory conservation. This specification defines the requirements for reaching "Deterministic Replay Certification."

## 1. Replay Identity Model (Core Fields)
To achieve authoritative lineage, every replayable transaction MUST expose:
- `replay_id` (UUID): Unique for every unique intent. Persists across retries.
- `lineage_parent` (UUID|null): Points to the replaced/updated intent if supersession occurs.
- `retry_sequence` (Int): Monotonically increasing counter for attempts of the same `replay_id`.
- `replay_generation` (Int): Increments when a replay logic version changes.
- `originating_device` (String): Fingerprint of the source hardware/session.
- `causal_chain` (String): Deterministic hash of [LineageParent + CurrentIntent].
- `reconciliation_epoch` (Timestamp): The last "Safe State" watermark this replay was validated against.

## 2. Deterministic Replay Ordering
Logic for resolving late arrivals and sequence conflicts:
1. **Monotonic Authority**: Transactions are ordered by `client_created_at` for intent, but pinned by `ledger_sequence` for authority.
2. **Causal Precedence**: If `Intent B` depends on `Intent A`, it MUST carry `Intent A.replay_id` as its `lineage_parent`.
3. **Late-Arrival Handling**: Replays arriving after a newer reconciliation epoch are rejected as "Stale" (Conflict Type: TEMPORAL_DRIFT).
4. **Supersession**: A newer `retry_sequence` for the same `replay_id` invalidates all previous attempts in the sync queue.

## 3. Inventory Conservation Semantics
Formalizing the "Conservation of Matter" in the ledger:
- **Conservation Proof**: `Initial_State + SUM(Delta_1...Delta_N) == Current_State`.
- **Delta Lineage**: Every `quantity_delta` must be attributable to a specific `replay_id`.
- **Mutation Continuity**: A gap in the `ledger_sequence` for a specific store/item invalidates the Current State proof until the gap is filled or reconciled.

## 4. Replay Certification Requirements (The Blockers)
The project CANNOT achieve **AUTHORITATIVE REPLAY PROOF** until:
1. **[BLOCKER P1]**: `OfflineTransactionSyncService` persists `SyncActionAuditLog` with `retry_sequence`.
2. **[BLOCKER P2]**: Edge Function passes `client_transaction_id` as the authoritative internal `operation_id` without transformation.
3. **[BLOCKER P3]**: `inventory_movements` schema is extended to include `replay_id` and `retry_sequence`.

## 5. Transitional Compatibility Expiration Rules
To prevent "Permanent Debt," legacy mappings expire as follows:
- **Naming Drift (`product_id` -> `item_id`)**: Expires at **Migration Epoch 2026.06.01**.
- **Transformation Coercion (`quantity` -> `qty`)**: Expires at **Edge Function v2 Release**.
- **Audit Masking**: Expires immediately upon resolution of P1.
- **Authority Downgrades**: Any eval result still marked `TRANSITIONAL` after Milestone 2 triggers a mandatory "Governance Halt."
