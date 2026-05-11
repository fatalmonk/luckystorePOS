# Bounded Repair Queue: Operational Baseline P5

The following items MUST be executed in sequential order to bring the repository from `PARTIAL MUTATION` to `CERTIFIED BASELINE`.

## Level 1: Codebase Cohesion & Baseline
| ID | Target | Action | Risk | Status |
|---|---|---|---|---|
| BRQ-1 | Full Repo | Run `flutter analyze` and `npm run typecheck` against the inherited 65 modified files to verify if the code even compiles. | Medium | QUEUED |
| BRQ-2 | Supabase Migrations | Run `infra/migration-replay/replay.sh` to verify that the inherited migration diffs actually produce a deterministic success. | High | QUEUED |
| BRQ-3 | Commits | Perform a safety commit of inherited work `chore(stabilization): snapshot of inherited upstream modifications` to lock the baseline state. | Low | QUEUED |

## Level 2: Missing Logic Reconstruction (De-Hallucination)
These satisfy the gap where documentation claimed logic that was never actually written to disk.

| ID | Target | Action | Dependencies | Status |
|---|---|---|---|---|
| BRQ-4 | `offline_transaction_sync_service.dart` | Implement the missing monotonic `sequenceId` model property and the JSON list sorting prior to persistence. | BRQ-3 | QUEUED |
| BRQ-5 | `offline_transaction_sync_service.dart` | Implement `_persistLogs()` for explicit persistence of `_auditLogs`. | BRQ-3 | QUEUED |
| BRQ-6 | `offline_transaction_sync_service.dart` | Implement startup recovery: load `syncing` state as `pending`, and implement `leaseExpirationDuration` checks. | BRQ-4 | QUEUED |

## Level 3: Runtime Certification
| ID | Target | Action | Dependencies | Status |
|---|---|---|---|---|
| BRQ-7 | Mobile App | Validate logic using localized deterministic replay proofs or SOP device verification scripts. | BRQ-6 | QUEUED |
| BRQ-8 | Eval Harness | Verify `scripts/evals/eval-runner.ts` is functioning and execute against a local/staging Supabase to confirm invariant preservation. | BRQ-2 | QUEUED |
| BRQ-9 | Final Seal | Full re-run of `npm run check` and seal of P5 governance lineage. | ALL | QUEUED |

---
**Rules for Queue Advancement**:
1. No item can start unless its dependencies are `COMPLETE` & `COMMITTED`.
2. A failed verification automatically places the queue in `HALT` state.
3. ANY modifications made outside these IDs constitutes an UNAUTHORIZED ESCAPE.
