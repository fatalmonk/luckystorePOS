-- Update dashboard RPC to include sales trends for UI graph
CREATE OR REPLACE FUNCTION public.get_manager_dashboard_stats(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_today_sales numeric(12,2) := 0;
  v_total_orders integer := 0;
  v_active_sessions integer := 0;
  v_low_stock_count integer := 0;
  v_recent_sessions jsonb;
  v_sales_trend jsonb;
  v_start_of_day timestamptz := CURRENT_DATE; 
BEGIN
  -- 1) Calculate Today's Sales & Orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(id)
  INTO 
    v_today_sales,
    v_total_orders
  FROM public.sales
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at >= v_start_of_day;

  -- 2) Count Active Sessions
  SELECT COUNT(id)
  INTO v_active_sessions
  FROM public.pos_sessions
  WHERE store_id = p_store_id
    AND status = 'open';

  -- 3) Calculate Low Stock Items accurately based on per-item thresholds
  SELECT COUNT(s.item_id)
  INTO v_low_stock_count
  FROM (
    SELECT i.id AS item_id
    FROM public.items i
    LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
    WHERE i.active = true
      AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ) s;

  -- 4) Fetch Recent Sessions (limit to 10 for dashboard widget)
  SELECT jsonb_agg(row_to_json(rs))
  INTO v_recent_sessions
  FROM (
    SELECT 
      ps.id,
      ps.session_number,
      ps.status,
      ps.opened_at,
      ps.total_sales,
      u.name as cashier_name
    FROM public.pos_sessions ps
    LEFT JOIN public.users u ON u.id = ps.cashier_id
    WHERE ps.store_id = p_store_id
    ORDER BY ps.opened_at DESC
    LIMIT 10
  ) rs;

  -- 5) Fetch 7-day Sales Trend
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', d.sale_date,
      'sales', COALESCE(s.daily_sales, 0)
    )
  )
  INTO v_sales_trend
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS sale_date
  ) d
  LEFT JOIN (
    SELECT created_at::date as sale_date, SUM(total_amount) as daily_sales
    FROM public.sales
    WHERE store_id = p_store_id AND status = 'completed'
    GROUP BY created_at::date
  ) s ON s.sale_date = d.sale_date;

  RETURN jsonb_build_object(
    'today_sales', v_today_sales,
    'total_orders', v_total_orders,
    'active_sessions', v_active_sessions,
    'low_stock_count', v_low_stock_count,
    'recent_sessions', COALESCE(v_recent_sessions, '[]'::jsonb),
    'sales_trend', COALESCE(v_sales_trend, '[]'::jsonb)
  );
END;
$$;
