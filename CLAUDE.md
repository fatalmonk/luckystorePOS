# Claude Token Optimization & Workflow Guidelines

## Core Principles
- **PR-Sized Tasks:** Work on small, manageable changes.
- **Targeted Operations:** Do not perform broad repository scans (`find .`, `grep -R .`, `ls -R`).
- **Surgical Reads:** Read only the files necessary for the current task.
- **Validation:** Always show `git diff` before finalizing changes.
- **Transparency:** Report failing commands exactly as they occur.

## Phase 1 Scope
### Allowed Files
- `.github/workflows/ci.yml`
- `apps/mobile_app/pubspec.yaml`
- `.env.example`
- `package.json`
- `scripts/security/secret_scan.js`
- `system-docs/env-security.md`

### Forbidden Areas (Do Not Touch)
- `PosProvider` (and related state management)
- `supabase/migrations/`
- Auth flow logic
- Core business logic

## Standard Workflow
1. **Research:** Target allowed files only.
2. **Implementation:** Apply changes surgically.
3. **Review:** Run `git diff` and explain changes.
4. **Validation:** Run project-specific lint/test commands.
5. **Report:** Summarize work and status of commands.

## Allowed Commands
- `git status`
- `git diff`
- `git diff --stat`
- `node scripts/security/secret_scan.js`
- `npm run lint`
- `npm run build`
- `flutter analyze`
- `flutter test`

## Agent skills

- Before creating, updating, or reporting work items, read
  `docs/agents/issue-tracker.md`. The Lucky Store Notion Tasks database is the
  authoritative tracker.
- Before changing domain behavior, terminology, data ownership, or boundaries,
  read `docs/agents/domain.md`, then `CONTEXT-MAP.md`, the relevant
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