# Lucky Store — Infrastructure Context

**Last updated:** July 12, 2026  
**Status:** ✅ Neon Retired | ✅ Images on Cloudflare R2 | ✅ All Data on Supabase

---

## Architecture Overview

Lucky Store operates on a simplified two-tier cloud architecture:
1. **Database & API Layer:** Supabase (managed Postgres, Auth, and PostgREST client APIs). All transactional and analytical reads/writes flow directly here.
2. **Asset Delivery (Zero-Egress):** Cloudflare R2 serves all product images and catalog assets via a custom domain (`images.luckystore1947.com`), eliminating Supabase egress costs and improving global performance.

---

## Decommissioned Components (Retired July 2026)

- **Neon Postgres:** Previously used as a read replica for analytics. Completely decommissioned.
- **Sync Scripts:** `sync-supabase-to-neon.mjs` has been deleted. No more Postgres-to-Postgres mirroring or batch cron jobs are required.
- **Neon Query Proxy:** The Cloudflare Worker (`neon-proxy`) and the `neon.ts` client wrapper have been removed.
- **Neon Auth:** Unused configuration variables stripped from environment files.

---

## Current Components

### 1. Cloudflare R2 (Asset Delivery)
- **Bucket:** `lucky-store-images`
- **Path prefix:** `products/`
- **Public Domain:** `https://images.luckystore1947.com`
- **Image URL Format:** `https://images.luckystore1947.com/products/{SKU}.webp`
- **Status:** 500 catalog images successfully migrated. Supabase storage buckets `product-images` and `item-images` have been emptied.

### 2. Supabase (Primary Database & API)
- **Project:** `hvmyxyccfnkrbxqbhlnm`
- **Tables:** `products`, `daily_sales`, `competitor_prices`, `users`, etc.
- **Database Functions (RPCs):** 
  - `get_sales_report(p_store_id, p_start_date, p_end_date)`
  - `get_inventory_value(p_store_id)`
  - `get_profit_loss(p_store_id, p_start_date, p_end_date)`
  - `get_manager_dashboard_stats(p_store_id)`
  - `get_dashboard_missing_metrics(p_store_id)`
  - `get_monthly_trend_metrics(p_store_id)`
  - `get_retail_kpis(p_store_id, p_days)`
  - `get_cashflow_data(p_store_id, p_days)`
  - `get_low_stock_items(p_store_id)`

---

## Key Files

| File | Purpose |
|---|---|
| `apps/admin_web/src/lib/api/domains/` | Domain API calls (e.g. `reports.ts`, `dashboard.ts`, `dailySales.ts`) using the `supabase` JS client. |
| `apps/customer_storefront/app/api/webhooks/supabase-sync/route.ts` | Syncs Auth users directly to the `users` table via `supabase-js`. |
| `supabase/migrations/` | Database schemas, SQL RPC definitions, and Row Level Security (RLS) policies. |

---

## Environment Variables

The following Neon variables have been removed: `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `VITE_NEON_PROXY_URL`, `VITE_NEON_API_KEY`.

Required environment variables in `.env.local`:
- `DATABASE_URL` (Supabase connection string)
- `SUPABASE_URL` (Supabase API URL)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase service role secret)

---

## Operations Reference

### DB Migrations & Types
To push new migrations or update TypeScript definitions for Supabase:
```bash
# Push schema migrations
npx supabase db push

# Regenerate TypeScript definitions
npx supabase gen types typescript --project-id hvmyxyccfnkrbxqbhlnm > apps/admin_web/src/lib/database.types.ts
```
