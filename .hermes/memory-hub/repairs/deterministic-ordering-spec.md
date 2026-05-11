# Deterministic Ordering Specification

## 1. Monotonic Ordering Source
Replay order is defined by an explicit `sequence_id` assigned at `enqueueSale`.

## 2. Queue Mutation Invariants
- **Stable Sorting**: `_queue` MUST be sorted by `sequence_id` before every `_persistQueue`.
- **No Positional Authority**: The physical index in the JSON array is a serialization detail, not evidence of intent order.

## 3. Serialization Invariants
- `jsonEncode` of the queue must preserve `sequence_id` integrity.
- `_loadQueue` must sort the resulting list by `sequence_id` before notifying listeners.

## 4. Stable Replay Guarantees
- Deletion of `sequence_id: N` does not affect the ordering of `N-1` and `N+1`.
