# Runbook: Local Startup

## Prerequisites
- Docker Desktop running (for Supabase local)
- Node.js 18+
- Flutter SDK (for mobile)
- `supabase` CLI installed globally

## Admin Web Startup

```bash
cd /Users/ioriimasu/dev/luckystorePOS
npm run dev
```
- Runs on http://localhost:5173
- Connects to staging Supabase (NOT local)
- Uses `.env.local` for Supabase credentials

## Supabase Local (UI Dev Only)

```bash
supabase start
```
- API: http://localhost:54321
- DB: postgresql://postgres:***@localhost:54322/postgres
- **Deprecated for operational validation** - use staging only

## Mobile App Startup

```bash
cd apps/mobile_app
flutter run
```
- Requires Android emulator or physical device
- Bluetooth enabled for printer pairing
- Points to staging Supabase URL

## Verification

| Check | Command | Expected |
|---|---|---|
| Admin web running | `curl http://localhost:5173` | HTML response |
| Supabase local API | `curl http://localhost:54321` | JSON health |
| Flutter build | `flutter analyze` | No errors |

## Common Issues

1. **Port 54322 already in use**: `supabase stop && supabase start`
2. **Admin web build errors**: `npm run typecheck` then `npm run build`
3. **Flutter dependencies**: `flutter pub get`
