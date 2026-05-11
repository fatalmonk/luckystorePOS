# Local Development And Validation Runbook

## Strategic Mode
LuckyStorePOS uses two different validation modes. They are not interchangeable.

### 1. Runtime Stabilization
Use local apps against the real staging Supabase project.

Topology:
`Admin Web / Flutter App -> staging Supabase`

This is the default mode for:
- auth validation
- inventory rendering
- reconciliation flows
- telemetry checks
- offline sync behavior
- pilot-readiness validation

### 2. Migration Reset Stabilization
Use local Docker and local Supabase only to validate migration determinism and local replay safety.

Topology:
`local Docker -> local Supabase CLI stack -> migration replay/reset checks`

This mode is limited to:
- `infra/migration-replay`
- `supabase start`
- `supabase db reset --local --yes`
- local type generation from the local database

Do not treat the local Supabase stack as the canonical runtime validation target.

## Safety Rules
- Never edit `.env`, `.env.local`, or real credentials in automation.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend or mobile code.
- Never run `supabase db reset`, `supabase db push`, `supabase migration repair`, or `supabase migration up` against staging or production without explicit human approval.
- Never bypass RPC inventory mutations or write directly to `stock_levels`.
- Preserve immutable ledger, RLS, idempotency, and `SERIALIZABLE` guarantees.

## Runtime Validation Workflow
Use this when validating actual app behavior.

### Admin Web
File:
`apps/admin_web/.env.local`

Required shape:
```env
VITE_SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_STAGING_ANON_KEY
VITE_APP_ENV=staging
```

Start:
```bash
npm --prefix apps/admin_web install
npm --prefix apps/admin_web run dev -- --host 127.0.0.1
```

Expected local frontend URL:
- `http://127.0.0.1:5173`
- or `http://127.0.0.1:3000`

### Flutter Mobile
Required environment:
```env
SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_STAGING_ANON_KEY
APP_ENV=staging
```

Required hardware:
- physical Android device
- Bluetooth enabled
- printer paired

Start:
```bash
cd apps/mobile_app
flutter pub get
flutter run
```

### Runtime Validation Checks
Validate these against staging:
- auth hydration
- inventory rendering
- category loading
- low-stock dashboards
- reconciliation pages
- telemetry rendering
- offline queue startup
- replay restoration
- printer initialization
- cart restoration

## Migration Reset Stabilization Workflow
Use this only when replay, migrations, or local reset determinism are under repair.

### 1. Start Infrastructure
From repo root:
```bash
docker compose up -d
docker ps
supabase start
supabase status
```

Expected outcome:
- Docker services are healthy
- local Supabase services are healthy

### 2. Run Replay Validation
From repo root:
```bash
cd infra/migration-replay
./replay.sh
```

Expected artifacts under `artifacts/`:
- `replay-report.json`
- `entropy-report.json`
- `governance-summary.json`
- `replay.log`

Mandatory rule:
- replay must be green before merging migration changes

### 3. Run Local Reset Gate
From repo root:
```bash
supabase db reset --local --yes
```

This is the hard gate before entering runtime stabilization after migration repairs.

If reset fails:
- stop immediately
- classify the deterministic blocker
- repair the migration chain
- rerun reset

Do not proceed to runtime validation while reset is red.

### 4. Generate Local Database Types
Only after local reset succeeds:
```bash
supabase gen types typescript \
  --local \
  --schema public \
  > apps/admin_web/src/types/database.types.ts
```

Check for forbidden legacy drift:
- no `active`
- no `qty`
- no `product_id`

Canonical field expectations:
- `is_active`
- `qty_on_hand`
- `discount_amount`
- `item_id`

## Verification Gates

### Web
```bash
npm run typecheck
npm run build
```

### Flutter
```bash
cd apps/mobile_app
flutter analyze
```

### Distributed Safety
Run when replay logic, inventory logic, reconciliation logic, or offline sync logic changes:
```bash
npm run check
```

## Recommended Daily Flow

### Normal Runtime Work
1. Point admin web and Flutter to staging.
2. Start the admin web dev server.
3. Run runtime checks against staging.
4. Run `npm run typecheck`, `npm run build`, and `flutter analyze` before handoff.

### Migration Work
1. Run replay validation.
2. Run `supabase db reset --local --yes`.
3. Regenerate local types after reset is green.
4. Run `npm run typecheck` and `npm run build`.
5. Enter runtime stabilization only after the local reset gate is green.

## Shutdown

### Frontend
Stop the dev server with `Ctrl+C`.

### Local Supabase
```bash
supabase stop
```

### Docker
```bash
docker compose down
```

To wipe local infrastructure state only:
```bash
docker compose down -v
supabase stop --no-backup
```

## Non-Negotiable Gates

| Gate | Required |
|------|----------|
| replay green | YES |
| local reset green | YES |
| typecheck green | YES |
| build green | YES |
| governance artifacts generated | YES |

Never treat runtime validation as complete if any of those five gates are red.
