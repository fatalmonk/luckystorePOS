# AGENTS.md
## Project
Lucky Store POS monorepo with a Vite admin app, Supabase backend, scraper scripts, and ops scripts.

## Runtime
- Node.js 20+
- npm with a root `package-lock.json`
- Local Supabase via `npx supabase`
- Local Supabase API: `http://127.0.0.1:54321`
- Local Supabase Studio: `http://127.0.0.1:54323`
- Local Postgres: `127.0.0.1:54322`
- Frontend dev server expected on `3000` or `5173`

## Hard Safety Rules
- Never edit `.env`, `.env.local`, production credentials, or real API keys.
- Never commit service role keys, database passwords, access tokens, OAuth secrets, payment secrets, or scraper credentials.
- Never run `supabase link`, `supabase db push`, or any production migration command without explicit human approval.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to Vite or browser code.
- Never push directly to `main`.
- Never force-push unless explicitly requested.
- Work only in the current branch or worktree.
- Prefer small, reviewable patches over broad rewrites.

## Local Supabase Rules
- Use local Supabase for development.
- Use `npm run supabase:status` to inspect local URLs and generated keys.
- Use `npm run supabase:reset` only with human approval because it is destructive to local data.
- Schema source is `schema_dump.sql`.
- Seed source is `supabase/seed.sql`.
- Commit schema, migration, and seed changes intentionally.

## Verification Commands
Run the available commands after changes when relevant:

```bash
npm run lint
npm run typecheck
npm run build
npm run check
npm run supabase:types
```

If a command is unavailable or fails because the repo is missing prerequisites, report that directly.

## Agent Workflow
1. Read this file first.
2. Inspect `package.json`, `supabase/config.toml`, and `.env.local.example`.
3. State a plan before editing.
4. Modify only files relevant to the task.
5. Run verification.
6. Report changed files, commands run, results, and remaining risks.
