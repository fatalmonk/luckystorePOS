# Local Development

## Prerequisites
- Node.js 20 or newer
- Flutter SDK (stable)
- npm

## Runtime Topology
**Local Apps -> REAL Supabase STAGING project**
Do NOT use local Supabase Docker stack for operational validation. You are validating operational behavior, not backend primitives.

## Apps Setup

### 1. Admin Web
File: `apps/admin_web/.env.local`

**Required Configuration:**
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_REAL_ANON_KEY
VITE_APP_ENV=staging
```

**Start:**
```bash
cd apps/admin_web
npm install
npm run dev
```

### 2. Flutter Mobile
Use existing config system.

**Required Configuration:**
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_REAL_ANON_KEY
APP_ENV=staging
```

**Prerequisites:**
- Physical Android device
- Bluetooth enabled
- Printer paired

**Start:**
```bash
cd apps/mobile_app
flutter pub get
flutter run
```

## Verification Commands
Run these after making significant changes:

```bash
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
