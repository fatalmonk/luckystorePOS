# Authoritative Repair Sequence

This document dictates the absolute chronological order of operations required to close the gap between the documented ideal state and actual codebase implementation.

---

## R0 — Lineage Anchor
- **Status**: **COMPLETE**
- **Reference**: Commit `e074760`
- **Description**: Freeze of inherited chaotic state into verifiable baseline history.

---

## R1 — Replay Identity Repair
- **Objective**: Implement missing monotonic `sequenceId` ordering guarantees.
- **Target File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Mutation Class**: Logical Model Refinement (Protected Critical Zone 5)
- **Replay Risk**: HIGH (Changes structure of JSON storage)
- **Rollback Requirement**: Revert to Commit `e074760`.
- **Prerequisite Proof**: `flutter analyze` + Unit proof validating increment.
- **Acceptance Criteria**: `QueuedOfflineTransaction.fromJson` successfully reads and outputs monotonic integer IDs.

---

## R2 — ACK Classification Repair
- **Objective**: Formalize network response categorization.
- **Target File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Mutation Class**: Semantic Error Handling
- **Replay Risk**: MEDIUM
- **Rollback Requirement**: Git checkout file.
- **Prerequisite Proof**: Successful build run.
- **Acceptance Criteria**: An internal `enum` classification distinguishes between deterministic rejection vs network timeout.

---

## R3 — Lease Ownership Repair
- **Objective**: Implement automatic "Limbo" state recovery timer.
- **Target File**: `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart`
- **Mutation Class**: Transient State Expiration
- **Replay Risk**: HIGH (Introduces duplicate retry potential)
- **Rollback Requirement**: Revert specific file.
- **Prerequisite Proof**: `flutter analyze` + deterministic proof showing lease timer triggering.
- **Acceptance Criteria**: An item marked `syncing` reverts automatically to `pending` after 5 minutes of activity absence.

---

## R4 — Eval Harness Restoration
- **Objective**: Un-comment and restore the structural test verification loops.
- **Target File**: `scripts/evals/eval-runner.ts`
- **Mutation Class**: Verification Utility Upgrade
- **Replay Risk**: LOW
- **Rollback Requirement**: Git checkout file.
- **Prerequisite Proof**: `npx ts-node eval-runner.ts` executes syntax-cleanly.
- **Acceptance Criteria**: Replay integration harness successfully communicates with a runtime Supabase client.

---

## R5 — Replay Certification
- **Objective**: Execute full end-to-end deterministic validation suite.
- **Target Subsystem**: `infra/migration-replay`
- **Mutation Class**: Operational Execution (Read-Only Verification)
- **Replay Risk**: CRITICAL
- **Prerequisite Proof**: Local Docker container stack enabled and healthy.
- **Acceptance Criteria**: Production of `CERTIFICATION_PROOF.md` recording ZERO schema drifts across parallel iteration runs.

---

## STRICT SEQUENCING CONSTRAINT
A Phase cannot initiate until all PRECEDING phases satisfy their "Acceptance Criteria" and exist in the current Git lineage. No parallel execution permitted.
