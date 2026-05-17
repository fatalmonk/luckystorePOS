# Repair Dependency Graph (Stage 1 Restoration)

## Phase 0: The Baseline
1. **Define Canonical Payload Contract** (DONE)
2. **Define Authority Hierarchy** (DONE)

## Phase 1: Evaluation Integrity (P0)
- **Task 1.1**: Update `invariant-verifier.ts` naming (Depends on: Baseline)
- **Task 1.2**: Update `eval-runner.ts` logic (Depends on: 1.1)
- **Task 1.3**: Validate Eval Pass against Stale Schema (Depends on: 1.2)
- **Result**: Trust in the "Harness" is restored.

## Phase 2: Forensic Continuity (P1)
- **Task 2.1**: Implement Audit Persistence in Flutter (Depends on: Phase 1 Success)
- **Task 2.2**: Force flush logs on every sync attempt.
- **Result**: Replay events leave a permanent, observable trail.

## Phase 3: Runtime Normalization (P2)
- **Task 3.1**: Standardize Edge Function Snapshot Payload (Depends on: Baseline Contract)
- **Task 3.2**: Resolve `item_id`/`product_id` split-brain in RPC.
- **Result**: Zero transformation drift between Mobile and Server.

## Phase 4: Architectural Consolidation (P3)
- **Task 4.1**: Create Unified Replay State Machine Documentation.
- **Task 4.2**: [FUTURE] Refactor Queue Architecture.
- **Result**: Deterministic replay state across all failure modes.
