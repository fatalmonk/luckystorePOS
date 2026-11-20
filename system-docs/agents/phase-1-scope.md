# Phase 1 Scope

This file contains task-specific restrictions for Phase 1 work in LuckyStore. Phase 1 applies **only** when the current task explicitly invokes it. Its restrictions apply for that task only. Permanent repository safeguards in `AGENTS.md` always apply.

## Allowed Files
- `.github/workflows/ci.yml`
- `apps/mobile_app/pubspec.yaml`
- `.env.example`
- `package.json`
- `scripts/security/secret_scan.js`
- `system-docs/env-security.md`

## Forbidden Areas (Do Not Touch)
- `PosProvider` (and related state management)
- `supabase/migrations/`
- Auth flow logic
- Core business logic

## Research Limits
Target allowed files only.

## Command Allowlist
- `git status`
- `git diff`
- `git diff --stat`
- `node scripts/security/secret_scan.js`
- `npm run lint`
- `npm run build`
- `flutter analyze`
- `flutter test`
