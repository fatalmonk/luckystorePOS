# Environment Variable Security

## Public vs. Secret Environment Variables

| Scope | Examples | Where used |
|---|---|---|
| **Public / safe to bundle** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable) | Web app environment, approved Flutter compile-time configuration |
| **Secret — never bundle** | `*_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `R2_SECRET_ACCESS_KEY`, `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `SSLCOMMERZ_STORE_PASSWORD` | CI secrets, server-only runtimes |

## Mobile App Must Not Bundle Secrets

The Flutter app bundles `assets/app.env` at build time.

- Do **not** list root `.env` (or any path containing secrets) in `pubspec.yaml` → `flutter` → `assets`.
- `assets/app.env` may contain **placeholders only** (`your-…-here`). Real staff passwords, payment passwords, service-role keys, and PATs must never be committed there.
- Supply only public client configuration to mobile builds. Never inject staff passwords, payment credentials, service-role keys, database credentials, or provider secrets into a client build.
- Removing a value from git does **not** revoke it — rotate first, then replace with placeholders.

## Service Role / DB Password — CI and Server Only

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, and full connection strings (`DATABASE_URL`, `DIRECT_DATABASE_URL`) must **never** appear in:

- Committed `.env` files (use `.env.example` placeholders only)
- Client-side bundles (Flutter, web)
- Public build artifacts
- Audit reports, tickets, prompts, or test fixtures (use synthetic values)

These values belong only in:

- **GitHub Actions secrets**
- **Server-side runtime environments** (Vercel, Supabase Edge Function secrets, Worker secrets)

## Secret Scanning

```bash
npm run scan:secrets           # scan repository (values never printed)
npm run scan:secrets:self-test # synthetic pattern regression tests
```

The scanner:

- Detects `PASSWORD=` / `*_PASSWORD=` env assignments, private-key headers, JWT-like tokens, and common Cloudflare / R2 / Meta / payment secret names
- Scans application source, deployment scripts, CI workflows, tracked documentation, sanitized audit reports, and `.env.example`
- Allows placeholder values individually while rejecting credential-shaped literal values; no documentation tree receives a blanket exemption
- Skips local `.env*` runtime files and vendored or generated trees such as `Pods`, `apps/mobile_app/flutter/`, build outputs, dependency caches, generated data under `scripts/data/`, and local planning data under `_plans/`
- Reports `pattern name` + `file:line` only — **never** matched values
- Is a **blocking** CI job (`.github/workflows/ci.yml` → `secret_scan`, including `--self-test`)

A passing scan does not replace credential rotation after a known exposure.
