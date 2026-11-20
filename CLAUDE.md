# Claude Token Optimization & Workflow Guidelines

This file contains token-optimization guidance and references unique to Claude-style agents working in LuckyStore. Permanent repository rules live in [AGENTS.md](AGENTS.md); task-specific Phase 1 restrictions live in [system-docs/agents/phase-1-scope.md](system-docs/agents/phase-1-scope.md).

## Permanent repository rules
See [AGENTS.md](AGENTS.md) for the canonical source of all permanent repository rules, including core principles, workflow, scope, security boundaries, and deployment environments.

## Phase 1 scope
See [system-docs/agents/phase-1-scope.md](system-docs/agents/phase-1-scope.md) for the Phase 1 file allowlist, forbidden areas, research limits, and command allowlist. Phase 1 applies only when the current task explicitly invokes it; permanent repository safeguards always apply.

## Agent skills

- Before creating, updating, or reporting work items, read
  `system-docs/agents/issue-tracker.md`. The Lucky Store Notion Tasks database is the
  authoritative tracker.
- Before changing domain behavior, terminology, data ownership, or boundaries,
  read `system-docs/agents/domain.md`, then `CONTEXT-MAP.md`, the relevant
  `CONTEXT.md`, and applicable ADRs.

<!-- rtk-instructions v2 -->
# Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk proxy <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.
<!-- /rtk-instructions -->
