# Local Development

## Prerequisites
- Node.js 20 or newer
- Docker running locally for Supabase
- npm

## Install Dependencies
```bash
npm install
```

This repo uses `apps/admin_web` as the Vite frontend. Root scripts proxy into that app so every agent can use the same commands.

## Configure Local Environment
1. Copy `.env.local.example` to `.env.local`.
2. Start Supabase locally.
3. Run `npm run supabase:status`.
4. Replace the placeholder anon and service-role keys in `.env.local` with the local keys shown by the status command.

Do not commit `.env.local`.

## Start Local Supabase
```bash
npm run supabase:start
npm run supabase:status
```

Endpoints:
- API: `http://127.0.0.1:54321`
- Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323`
- Inbucket: `http://127.0.0.1:54324`

## Reset Local Database
Requires human approval because this deletes local data.

```bash
npm run supabase:reset
```

The reset loads schema from `schema_dump.sql` and seed data from `supabase/seed.sql`.

## Generate Supabase Types
```bash
npm run supabase:types
```

This writes TypeScript database types to `apps/admin_web/src/lib/database.types.ts`.

## Start the Frontend
```bash
npm run dev
```

## Verification
```bash
npm run lint
npm run typecheck
npm run build
```

Or run the combined check:

```bash
npm run check
```

## Multi-Agent Workflow
Create one git worktree per agent and keep each tool on its own branch:

```bash
mkdir -p ../luckystorePOS-agents
git worktree add ../luckystorePOS-agents/codex -b agent/codex
git worktree add ../luckystorePOS-agents/claude -b agent/claude
git worktree add ../luckystorePOS-agents/gemini -b agent/gemini
git worktree add ../luckystorePOS-agents/antigravity -b agent/antigravity
```

Recommended flow:
1. Write the task in `AI_TASKS.md`.
2. Assign one implementation agent to one worktree.
3. Use a second agent only for review.
4. Run verification commands.
5. Merge back manually after review.
