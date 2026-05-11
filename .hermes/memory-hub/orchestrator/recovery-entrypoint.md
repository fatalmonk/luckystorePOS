# Recovery Entrypoint: Canonical System Handover

**AUTHORITY**: P6 Cognition Session  
**STATUS**: HANDOVER READY  
**TIMESTAMP**: 2026-05-11T21:14Z

This document ensures continuity for subsequent cognitive agents inherited following an upstream failure. DO NOT deviate from this entrypoint.

## 1. Current Repository State
- **Classification**: `PARTIAL_MUTATION` (High-Volume Working Tree)
- **Modified Files**: 65 Total (Supabase Migrations: 22, Mobile App: 25, Admin Web: 14, Evals: 2, Other: 2)
- **Untracked High-Density Artifacts**: `infra/`, `artifacts/`, `scripts/governance/`, `.hermes/`
- **Critical Finding**: 4 claimed repairs from the `P3` phase are **HALLUCINATED** and must be rewritten to satisfy the governance design specifications.

## 2. Operational Constraints (Lock State)
- **Active State**: `MUTATION_LOCKED`
- **Allowed Operations**: 
  - READ-ONLY file analysis
  - EXECUTION-ONLY local verification script invocation (`flutter analyze`, `npm run check`)
  - Markdown creation in `.hermes/memory-hub/`
- **Prohibited Operations**:
  - ANY editing of source code (`*.dart`, `*.sql`, `*.ts`, `*.tsx`)
  - `git reset`, `git stash`, or clearing the working tree (Data Loss Risk)
  - Self-authorized transitions to `GOVERNED_EXECUTION`

## 3. Authority Hierarchy Dependencies
1. **Root Authority**: Git Working Tree (The Ground Truth)
2. **Execution Authority**: `forensics/continuity-audit.md` & `mutation-surface-catalog.md`
3. **Planning Authority**: `orchestrator/bounded-repair-queue.md`
4. **Secondary Authority**: Inherited `.md` logs in `repairs/` (TREAT WITH SKEPTICISM due to hallucination potential).

## 4. Deterministic Restart Sequence
The next agent entering this cognition shell MUST execute these exact steps sequentially:

### STEP A: LOCK CONFIRMATION
Load `.hermes/memory-hub/forensics/continuity-audit.md` and confirm file checksums (implicitly, verify 65 files remain modified).

### STEP B: VALIDATION (NO-EDIT)
Run `flutter analyze` in `apps/mobile_app` AND `cd infra/migration-replay && ./replay.sh` to determine if the current uncommitted state is functionally functional or broken.

### STEP C: EXECUTABLE ACTION
Proceed to the Bounded Repair Queue node: **BRQ-1**.

---

## 5. Exact Next Executable Repair Task

| TASK ID | TARGET | MANDATORY VERIFICATION |
|---|---|---|
| **BRQ-1** | FULL REPO | Run `flutter analyze` + `npm run typecheck` to baseline compilation health of the inherited 65 modified files. |

**Failure Condition**: If compilation fails, generate a `COMPILE_ERRORS_LOG.md` and halt for USER instruction. DO NOT attempt auto-repair of compilation errors until ordered.
