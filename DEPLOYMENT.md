# Deployment Guide

## Overview

This document covers deployment for the Lucky Store multi-app architecture.

## Apps

| App | Framework | Platform | URL Pattern |
|-----|-----------|----------|-------------|
| Customer Storefront | Next.js 15 | Hostinger behind Cloudflare (production); Vercel (previews) | `luckystore1947.com` |
| Admin Web | Vite + React | Vercel | `admin.luckystore1947.com` |
| Mobile App | Flutter | Play Store / App Store | Native app |

## Customer Storefront (Next.js)

### Environment Variables

Production build-time public variables are supplied to GitHub Actions; runtime variables are managed in Hostinger. Vercel preview variables must target the dedicated test Supabase project.

The production Supabase project is configured for Hostinger production. Keep E2E and preview builds on the test project; CI preflight rejects the production project for order mutations.

Required public variables include:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Build and release

- Normal releases use [the Hostinger GitHub Actions workflow](.github/workflows/storefront-hostinger.yml), not a manual dashboard upload.
- A storefront-related push to `main` builds one immutable Next.js standalone package, deploys it to `next.luckystore1947.com`, runs staging smoke/E2E/load validation, then deploys the same package to `luckystore1947.com` and runs production smoke checks.
- `workflow_dispatch` supports staging-only or production promotion; production promotion still requires successful staging validation.
- Vercel `lucky-store` is for customer storefront previews; its ignored-build step skips production-target deployments and previews without storefront runtime changes. `lucky-store-pos` skips builds unless admin app code or shared workspace dependencies change. Both projects use `scripts/vercel/ignore-build.sh` for these path checks.

### Features

- Server-side API routes (`/api/checkout`)
- Dynamic product pages (`/product/[id]`)
- Static pages for cart, checkout, category
- Rate-limited checkout endpoint

## Admin Web (Vite)

### Environment Variables

Required in Vercel dashboard:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## Database

Hosted on Supabase. The test project is `grxxenvdhfwzafzyykgo`; production is `hvmyxyccfnkrbxqbhlnm`. Apply and verify migrations on the test project first, and confirm the active project ref before any production migration.

Run migrations via:

```bash
# Using management API
python scripts/run_migrations.py

# Or via Supabase CLI
supabase db push
```

### Required Migrations

1. `20260611000000_add_categories_ext.sql`
2. `20260611000001_add_wishlist.sql`
3. `20260611000002_add_orders.sql`
4. `20260611000003_add_items_rls.sql`

## Post-Deploy Checklist

- [ ] Verify Supabase env vars are set
- [ ] Confirm migration target and test migration changes on the dedicated test project before production
- [ ] For Hostinger releases, confirm staging smoke/E2E/load checks pass before production promotion
- [ ] Confirm production smoke validation passes after deployment
- [ ] Test wishlist (out-of-stock product)
- [ ] Verify admin webhook notifications
- [ ] Check RLS policies are active
- [ ] Confirm `search_items_pos` RPC has `anon` execute grant

## Rollback

Vercel's storefront preview is not a production rollback target. Roll back customer production through Hostinger's release controls using a previously validated Hostinger release, then rerun the production smoke checks. For database changes, validate migrations on the test project before applying them to production.
