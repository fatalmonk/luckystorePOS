# Deployment Guide

## Overview

This document covers deployment for the Lucky Store multi-app architecture.

## Apps

| App | Framework | Platform | URL Pattern |
|-----|-----------|----------|-------------|
| Customer Storefront | Next.js 15 | Vercel | `store.luckystore.bd` |
| Admin Web | Vite + React | Vercel | `admin.luckystore.bd` |
| Mobile App | Flutter | Play Store / App Store | Native app |

## Customer Storefront (Next.js)

### Environment Variables

Required in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Build Settings

- **Framework Preset**: Next.js
- **Build Command**: `npm install --legacy-peer-deps && npx next build`
- **Output Directory**: `.next`

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

Hosted on Supabase. Run migrations via:

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
- [ ] Run database migrations
- [ ] Test checkout flow end-to-end
- [ ] Test wishlist (out-of-stock product)
- [ ] Verify admin webhook notifications
- [ ] Check RLS policies are active
- [ ] Confirm `search_items_pos` RPC has `anon` execute grant

## Rollback

Vercel provides instant rollback via the dashboard. For database changes, always test migrations in a staging project first.
