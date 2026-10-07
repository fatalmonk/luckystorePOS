-- P2 Performance & Security Optimization:
-- 1. Eliminate duplicate indexes on high-write tables.
-- 2. Enforce immutable search_path on remaining SECURITY DEFINER functions.

-- 1. Drop redundant duplicate indexes (preserving primary keys & unique constraints)
DROP INDEX IF EXISTS public.idx_stock_levels_store_item;
DROP INDEX IF EXISTS public.idx_sale_items_item_id;
DROP INDEX IF EXISTS public.idx_sale_items_sale_id;
DROP INDEX IF EXISTS public.idx_stores_code;
DROP INDEX IF EXISTS public.idx_categories_name;
DROP INDEX IF EXISTS public.idx_lpq_sale_id;
DROP INDEX IF EXISTS public.idx_users_auth_id_unique;
DROP INDEX IF EXISTS public.idx_daily_sales_store_date;
DROP INDEX IF EXISTS public.idx_idempotency_keys_tenant_key_prepared;
DROP INDEX IF EXISTS public.idx_idempotency_keys_tenant_pkey_prepared;

-- 2. Secure search_path on SECURITY DEFINER functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_cashflow_data') THEN
    ALTER FUNCTION public.get_cashflow_data(uuid, integer) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_low_stock_items') THEN
    ALTER FUNCTION public.get_low_stock_items(uuid) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_monthly_trend_metrics') THEN
    ALTER FUNCTION public.get_monthly_trend_metrics(uuid) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_price_change') THEN
    ALTER FUNCTION public.log_price_change() SET search_path = public, pg_temp;
  END IF;
END $$;
