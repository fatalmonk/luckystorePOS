# AGENTS.md
## Project
Lucky Store POS monorepo with a Vite admin app, Supabase backend, Flutter mobile app, and operational validation toolchain.

## System Maturity
**Current Phase**: Pre-production Operational Validation
The system contains: immutable inventory ledger, deterministic replay infrastructure, offline sync, reconciliation workflows, telemetry aggregation, and distributed eval infrastructure. This is NOT a prototype environment.

## Runtime Topology
- **Correct Workflow**: Local Admin Web / Flutter App -> **REAL Supabase STAGING Project**.
- **Deprecated**: Local Supabase Docker stack for validation (validation must occur against staging).
- **Local Frontend**: Expected on `3000` or `5173`.
- **Flutter Setup**: Physical device, Bluetooth enabled, printer paired, pointing to staging.

## Hard Safety Rules
### Security
- NEVER edit `.env`, `.env.local`, production credentials, or real API keys.
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to Vite, Flutter, or any frontend/mobile code.
- NEVER commit access tokens, database passwords, or secrets.

### Commands
- NEVER run `supabase db reset`, `supabase db push`, `supabase migration repair`, or `supabase migration up` against real environments without explicit human approval.
- NEVER push directly to `main`.
- NEVER force-push.
- Work only in current branch/worktree.

### Architecture & Ledger
- NEVER bypass RPC inventory mutations or directly modify `stock_levels`.
- NEVER remove append-only ledger guarantees.
- NEVER weaken RLS protections.
- NEVER remove idempotency protections or `operation_id` replay protections.
- PRESERVE `SERIALIZABLE` transaction guarantees.

## Reusable Agent Execution Prompt
You are operating inside the LuckyStorePOS distributed retail infrastructure.

### Required Architecture Rules
- **Frontend**: Rendering, orchestration, interaction.
- **Hooks**: Optimistic state, query management, mutations.
- **Service**: Supabase interaction, RPC execution, transport handling.
- **Database**: Consistency, invariants, ledger correctness, concurrency control.

### Priority Order
1. Data correctness
2. Ledger safety
3. Replay determinism
4. Environment safety
5. Operational simplicity
6. UX speed
7. Feature velocity

*Never optimize developer convenience over operational correctness.*

## Required Output Format
**Before changes**:
- Explain the implementation plan.
- Identify affected invariants.
- Identify operational risks.
- Identify migration risks.

**After changes**:
- Summarize changed files.
- Summarize operational impact.
- Summarize rollback strategy.
- Summarize verification performed.

## Verification Workflow
Run verification AFTER EVERY CHANGE relevant to the platform:

### Web
```bash
npm run typecheck
npm run build
```

### Flutter
```bash
flutter analyze
```

### Distributed Safety
Run distributed evals when replay logic, inventory logic, reconciliation, or offline logic changes.
- `npm run check` (combined suite)

Report commands run and results transparently.
