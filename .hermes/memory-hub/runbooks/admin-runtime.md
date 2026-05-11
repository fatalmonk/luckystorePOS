# Runbook: Admin Runtime

## Startup Checklist

1. Vite dev server running (`npm run dev`)
2. `.env.local` has valid Supabase credentials
3. Browser open to http://localhost:5173
4. User authenticated with appropriate role

## Verification

| Feature | Test | Expected |
|---|---|---|
| Login | Enter credentials | Dashboard loads |
| Products | View product list | Data populated |
| Inventory | Update stock | RPC success, realtime update |
| Sales | View sales history | Paginated results |
| Reports | Generate report | Chart renders |

## Build Verification

```bash
cd /Users/ioriimasu/dev/luckystorePOS
npm run typecheck
npm run build
```

## Critical Paths

- `src/lib/supabase.ts` - Client initialization
- `src/lib/api.ts` - API layer
- `src/hooks/` - Query/mutation hooks
- `src/services/` - Service layer

## Realtime Subscriptions

Admin web subscribes to:
- `stock_levels` changes
- `inventory_movements` changes

Verify: Change stock in mobile, see update in admin dashboard.

## Known Issues

- Legacy `qty` references in `reports.ts`
- Service worker caches static assets but not data
