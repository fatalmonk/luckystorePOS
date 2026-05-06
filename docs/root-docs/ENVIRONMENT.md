# Environment Contract

This document defines the single environment variable contract for the repository.

## 1) Required Production

These are required for mobile app startup and role-based PIN sign-in.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `MANAGER_EMAIL`
- `MANAGER_PASSWORD`
- `CASHIER_EMAIL`
- `CASHIER_PASSWORD`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Used by:
- `apps/mobile_app/lib/services/startup_guard_service.dart`
- `apps/mobile_app/lib/providers/auth_provider.dart`

## 2) Required Development

These are required for local scripts and operational tooling.

- `SUPABASE_SERVICE_ROLE_KEY`

Used by:
- `scripts/ops/import-competitor-data.js`
- `scripts/ops/remove-duplicate-items.js`
- `scripts/ops/create-storage-bucket.js`

## 3) Optional Integrations

These are not required for app startup.

- `SSLCOMMERZ_STORE_ID`
- `SSLCOMMERZ_STORE_PASSWORD`
- `SSLCOMMERZ_IS_LIVE`
  - Used by Supabase payment edge functions and deploy scripts.
- `GEMINI_API_KEY`
  - Used by `apps/scraper/ai-mapper.js`.
- `VITE_SUPABASE_URL`
  - Optional fallback for `scripts/ops/create-storage-bucket.js`.

## 4) Deprecated (remove)

These variables are no longer used by active app/runtime code and should be removed from `.env`:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_IMPORT_INVENTORY_EDGE_URL`
- `VITE_PROCESS_SALE_EDGE_URL`
- `VITE_CREATE_SALE_EDGE_URL`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_O_AUTH_CLIENT_ID`
- `GOOGLE_MAPS_API_KEY_PLACES_API`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_DB_PASSWORD`

## Validator Alignment

Startup validation is intentionally scoped to real runtime requirements only:

- Required startup variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Required auth-role credentials: manager/cashier/admin email+password keys

No startup checks are performed for optional integrations or deprecated keys.
