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
- `docs/env-security.md`

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
