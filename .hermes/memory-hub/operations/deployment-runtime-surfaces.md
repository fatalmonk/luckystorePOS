# LuckyStorePOS Deployment and Runtime Surfaces

## Runtime Environments

### Staging (Authoritative)
- **Supabase**: Remote staging project
- **Admin Web**: Vercel preview deployment
- **Mobile**: APK pointing to staging URL
- **Usage**: All validation, testing, replay verification

### Production
- **Supabase**: Same project as staging (single project model)
- **Admin Web**: Vercel production
- **Mobile**: APK pointing to production URL
- **Usage**: Live retail operations

### Local Development (Deprecated for validation)
- **Supabase**: Docker stack via `supabase start`
- **Admin Web**: `npm run dev` (Vite dev server, port 5173)
- **Mobile**: Flutter dev server
- **Usage**: UI development only - NOT for operational validation

## Deployment Surfaces

| Surface | Technology | Trigger | Runtime |
|---|---|---|---|
| Admin Web | Vercel | Git push / `vercel deploy` | Edge (serverless) |
| Mobile APK | Flutter build | `flutter build apk` | Android device |
| Supabase schema | Supabase CLI | `supabase db push` | PostgreSQL 15 |
| Scraper | Node.js | Manual / cron | Local/CI |

## Local Startup Procedure

```bash
# 1. Start Supabase local stack (if needed for UI dev)
supabase start

# 2. Start admin web dev server
npm run dev
# -> http://localhost:5173

# 3. Start Flutter (separate terminal)
cd apps/mobile_app
flutter run
```

## Critical Ports

| Service | Port | Configured In |
|---|---|---|
| Admin web dev | 5173 | `vite.config.ts` |
| Supabase API | 54321 | `supabase/config.toml` |
| Supabase DB | 54322 | `supabase/config.toml` |
| Postgres direct | 5432 | Default PostgreSQL |

**Replay script default**: `postgresql://postgres:***@localhost:5432/postgres`
**Supabase local actual**: `postgresql://postgres:***@localhost:54322/postgres`
**Gap**: Replay script must set `DATABASE_URL` explicitly for Supabase local

## Service Worker

**File**: `apps/admin_web/src/sw/sw.ts`
**Build**: `scripts/build-sw.mjs`
**Purpose**: Offline cache for static assets, NOT for data
**Scope**: PWA installation, offline page display

## Docker Surfaces

**Migration Replay Container**:
- `infra/migration-replay/Dockerfile`
- PostgreSQL 15 base
- Node.js for report generation
- Usage: `docker-compose up` in `infra/migration-replay/`

## Environment Variables

**Admin Web** (`.env.local`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Mobile** (`pubspec.yaml` + config):
- Supabase URL (compiled into app)
- Supabase anon key (compiled into app)

**Scripts** (`.env.local` at root):
- `SUPABASE_SERVICE_ROLE_KEY` (backend scripts only)
- `DATABASE_URL` (replay scripts)

**CRITICAL**: `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to:
- Admin web frontend
- Mobile app code
- Vite bundle
- Flutter assets
