# Codex Token Optimization & Workflow Guidelines

## Core Principles
- **PR-Sized Tasks:** Work on small, manageable changes.
- **Targeted Operations:** Do not perform broad repository scans (`find .`, `grep -R .`, `ls -R`).
- **Surgical Reads:** Read only the files necessary for the current task.
- **Validation:** Always show `git diff` before finalizing changes.
- **Transparency:** Report failing commands exactly as they occur.

## Phase 1 Scope
### Allowed Files (Implementation Permitted)
- `.github/workflows/ci.yml`
- `apps/mobile_app/pubspec.yaml`
- `.env.example`
- `package.json`
- `scripts/security/secret_scan.js`
- `system-docs/env-security.md`

### Forbidden Areas (No Modification)
These remain off-limits for any code changes, edits, or implementation:
- `PosProvider` (and related state management)
- `supabase/migrations/`
- Auth flow logic
- Core business logic

---

## Phase 1A Scope (Read-Only Audit)
Permits read-only inspection of architecture, schema, RLS, queries, data flow,
and configuration for audit and analysis purposes. No implementation is authorized.

### Readable Paths (Inspection Only — No Writes)
- `supabase/migrations/**` — migration SQL files (schema, RLS, RPCs, policies)
- `supabase/functions/**` — Edge Functions (query/mutation boundaries, webhooks)
- `supabase/tests/**` — test fixtures and integration tests
- `supabase/config.toml` — Supabase project configuration
- `supabase/seed/**` — seed data files (read only; never output row contents)
- `supabase/diagnostics/**` — diagnostic SQL scripts
- `apps/mobile_app/lib/**` — Flutter repos, services, providers, models, offline sync
- `apps/admin_web/src/**` — admin web query and mutation boundaries
- `cloudflare/workers/**` — Worker database bindings, storage bindings, wrangler configs
- `apps/*/package.json`, `apps/mobile_app/pubspec.yaml`, `supabase/functions/deno.json`
- `cloudflare/workers/*/wrangler.toml`
- `.github/workflows/**` — CI/CD pipeline definitions

### Audit-Only Constraints
The following remain prohibited under Phase 1A:
- No migration execution (`supabase migration up`, `psql -f`, `supabase db push`)
- No database writes or mutations (INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE)
- No auth behavior changes or auth-flow modifications
- No PosProvider changes (or related state management)
- No core business-logic changes
- No secret output (never print `.env`, credentials, API keys, tokens, or secrets)
- No deployment (`wrangler deploy`, `vercel deploy`, `supabase deploy`, etc.)
- No file modification outside the Phase 1 Allowed Files list

## Standard Workflow
1. **Research:** Target allowed/auditable files only.
2. **Implementation:** Apply changes surgically (Phase 1 files only).
3. **Review:** Run `git diff` and explain changes.
4. **Validation:** Run project-specific lint/test commands.
5. **Report:** Summarize work and status of commands.

## Allowed Commands
### Read-Only Inspection (Phase 1A)
- `git status`
- `git diff`
- `git diff --stat` → prefer `git diff` or `rtk git diff --name-status` for change lists
- `git log` (with optional `--oneline`, `--name-only`, `-n <N>`) → prefer `rtk git log --oneline --name-status`
- `git show <ref>`
- `rg <pattern> <path>` — targeted ripgrep search (no broad `rg .` scans)
- `rtk read <file> <offset> <limit>` — preferred over `sed -n`, `nl -ba`, and `cat` for file reads
- `sed -n '<range>' <file>` — read-only print; use `rtk read` instead when possible
- `cat <file>` — read file contents; use `rtk read` instead when possible
- `head -n <N> <file>` / `tail -n <N> <file>` — read file excerpts; prefer `rtk read` with offset/limit

### Implementation & Validation (Phase 1)
- `node scripts/security/secret_scan.js`
- `npm run lint` → prefer `rtk npm run lint` or the project-specific wrapper if available
- `npm run build` → prefer `rtk npm run build --` or `rtk next build --` for Next.js apps; build logs compress much better under RTK filters
- `flutter analyze`
- `flutter test`
