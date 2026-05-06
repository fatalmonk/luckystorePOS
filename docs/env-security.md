# Environment Variable Security

## Public vs. Secret Environment Variables

| Scope | Examples | Where used |
|---|---|---|
| **Public / safe to bundle** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Web app `.env`, Flutter assets |
| **Secret — never bundle** | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL` | CI secrets, server-only |

## Mobile App Must Not Bundle Root `.env`

The Flutter app bundles assets at build time. The root `.env` contains service-role keys and database credentials.

- Do **not** list `.env` (or any path containing secrets) in `pubspec.yaml` → `flutter` → `assets`.
- Keep a **separate** `assets/app.env` with only:
  ```env
  SUPABASE_URL=https://<project-ref>.supabase.co
  SUPABASE_ANON_KEY=<your-anon-key>
  ```
- On CI, inject the real values at build time via GitHub Secrets.

## Service Role / DB Password — CI and Server Only

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, and full connection strings (`DATABASE_URL`, `DIRECT_DATABASE_URL`) must **never** appear in:

- `.env` files committed to git
- Client-side bundles (Flutter, web)
- Public build artifacts

These values belong only in:

- **GitHub Actions secrets** (repository → Settings → Secrets and variables → Actions)
- **Server-side runtime environments** (Vercel environment variables, Supabase Edge Function secrets)

## Secret Scanning

Run `npm run scan:secrets` to check for leaked credentials across the repository. The scanner checks all text files, ignoring `.git`, `node_modules`, `build`, and `coverage`. It allows placeholder values in `.env.example`.
