# LuckyStorePOS Replay Risk Classification

## Classification System

| Class | Definition | Verification Required |
|---|---|---|
| PROVEN | Tested with server-side evidence | SOP executed, SQL verification passed |
| IMPLEMENTED | Code exists, not runtime-tested | Code review confirms logic, no runtime evidence |
| PARTIAL | Some paths covered, others unknown | Some SOPs pass, others not yet executed |
| UNVERIFIED | Infrastructure exists, no proof | SOPs documented but not executed |
| KNOWN_GAP | Deliberately not implemented | Documented as out of scope or future work |

## Replay Capability Matrix

| Capability | Class | Evidence | Risk |
|---|---|---|---|
| Offline enqueue (v2 schema) | IMPLEMENTED | Code review: `offline_transaction_sync_service.dart` | Low |
| Restart hydration | UNVERIFIED | SOP 2 documented, not executed | High |
| Reconnect replay | PARTIAL | Code exists, one-path only (transaction queue) | Medium |
| Duplicate replay prevention | UNVERIFIED | SOP 4 documented, not executed | CRITICAL |
| Retry metadata persistence | IMPLEMENTED | Code review: retry_count, next_retry_at | Low |
| Dead-letter routing | IMPLEMENTED | Code review: `dead_letter_events` table | Low |
| Legacy queue invalidation | UNVERIFIED | SOP 7 documented, not executed | High |
| Reconciliation consistency | UNVERIFIED | SOP 8 documented, not executed | High |
| Ledger consistency | UNVERIFIED | SOP 9 documented, not executed | CRITICAL |
| Inventory consistency | UNVERIFIED | SOP 10 documented, not executed | CRITICAL |
| Retry idempotency | UNVERIFIED | SOP 11 documented, not executed | CRITICAL |
| Conflict attribution | UNVERIFIED | SOP 12 documented, not executed | High |

## Risk Weighting

**CRITICAL** (unverified): Duplicate replay prevention, ledger consistency, inventory consistency, retry idempotency
**HIGH** (unverified): Restart hydration, legacy queue invalidation, reconciliation consistency, conflict attribution
**MEDIUM** (partial): Reconnect replay
**LOW** (implemented): Offline enqueue, retry metadata, dead-letter routing

## Exit Criteria

Replay can be considered operationally proven when:
1. All CRITICAL capabilities reach PROVEN class
2. All HIGH capabilities reach at least IMPLEMENTED with partial testing
3. SOP scenarios 1-12 executed with evidence
4. Duplicate replay test shows single business effect (server-side SQL proof)
5. Stale eval harness repaired or explicitly excluded from claims
