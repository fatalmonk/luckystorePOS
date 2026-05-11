# Mutation Gating Specification: P5

This document defines the strict procedural barriers preventing unmanaged drift and hallucinated completions.

## 1. Pre-Mutation Verification Protocol
BEFORE any tool writes to the filesystem (excluding `.hermes/`), the following MUST be asserted:

1. **Authorization Explicit Check**: "Does this match EXACTLY ONE task ID from `bounded-repair-queue.md`?"
2. **Diff Safety Assessment**: "Are the files being touched outside the scope of the current Queue ID?"
3. **Rollback Checkpoint**: Current `git hash` is stored.

## 2. Post-Mutation Verification Protocol
AFTER a file modification occurs, the agent MUST IMMEDIATELY:

1. **Diff Readback**: Use `git diff` or `cat` to visually confirm the modification contains the intended logic (guards against "Hallucinated Writes").
2. **Validation Execution**:
   - If `*.dart` changed: Run `flutter analyze`.
   - If `*.sql` changed: Run `infra/migration-replay/replay.sh`.
   - If `*.ts/tsx` changed: Run `npm run typecheck`.

## 3. The "Write Confirm" Barrier
To combat the hallucinated completions detected in P3, every mutation cycle must produce a direct artifact of PROOF:

- **Level A**: `cat [FILE]` output in the terminal demonstrating the code exists.
- **Level B**: `git add [FILE]` immediately to secure the delta from overwrites.

## 4. Escalation Conditions
The cognitive cycle MUST terminate immediately if:
- An automated test fails and isn't resolved in exactly one (1) corrective cycle.
- A `Protected Critical Zone` needs unplanned modification.
- The USER provides explicit "HALT" syntax.

## 5. Approved Modification Flow
```
1. Select Task from Queue.
2. Declare Intent to USER.
3. Perform Mutation.
4. CONFIRM code is physically present (via tool call).
5. Run Verification Command.
6. Stage Code (`git add`).
```
