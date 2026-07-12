-- Migration: Add 3 analytics RPCs to replace raw SQL via Neon
-- Replaces multi-round-trip client-side aggregation in reports.ts

-- 1. Sales Report RPC
CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_store_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales        RECORD;
  v_total_rev    NUMERIC := 0;
  v_tx_count     INTEGER := 0;
  v_top_products JSON;
  v_daily_sales  JSON;
BEGIN
  -- Aggregate totals
  SELECT
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_rev, v_tx_count
  FROM sales
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at >= p_start_date::timestamptz
    AND created_at <= (p_end_date || 'T23:59:59')::timestamptz;

  -- Top 10 products by quantity
  SELECT json_agg(t) INTO v_top_products FROM (
    SELECT
      i.name,
      SUM(si.qty) AS quantity,
      SUM(si.qty * si.price) AS revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN items i ON si.item_id = i.id
    WHERE s.store_id = p_store_id
      AND s.status = 'completed'
      AND s.created_at >= p_start_date::timestamptz
      AND s.created_at <= (p_end_date || 'T23:59:59')::timestamptz
    GROUP BY i.name
    ORDER BY quantity DESC
    LIMIT 10
  ) t;

  -- Daily sales grouped by date
  SELECT json_agg(d ORDER BY d.date) INTO v_daily_sales FROM (
    SELECT
      DATE(created_at) AS date,
      SUM(total_amount) AS revenue,
      COUNT(*) AS count
    FROM sales
    WHERE store_id = p_store_id
      AND status = 'completed'
      AND created_at >= p_start_date::timestamptz
      AND created_at <= (p_end_date || 'T23:59:59')::timestamptz
    GROUP BY DATE(created_at)
  ) d;

  RETURN json_build_object(
    'totalRevenue',     v_total_rev,
    'transactionCount', v_tx_count,
    'avgTicket',        CASE WHEN v_tx_count > 0 THEN v_total_rev / v_tx_count ELSE 0 END,
    'topProducts',      COALESCE(v_top_products, '[]'::json),
    'dailySales',       COALESCE(v_daily_sales, '[]'::json)
  );
END;
$$;

-- 2. Inventory Value RPC
CREATE OR REPLACE FUNCTION public.get_inventory_value(
  p_store_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_value      NUMERIC := 0;
  v_low_stock_count  INTEGER := 0;
  v_out_of_stock     INTEGER := 0;
  v_inventory        JSON;
  v_total_items      INTEGER := 0;
BEGIN
  SELECT
    COUNT(*),
    SUM(COALESCE(i.cost, 0) * COALESCE(sl.qty, 0)),
    COUNT(*) FILTER (WHERE COALESCE(sl.qty, 0) = 0),
    COUNT(*) FILTER (WHERE COALESCE(sl.qty, 0) > 0 AND COALESCE(sl.qty, 0) <= 5)
  INTO v_total_items, v_total_value, v_out_of_stock, v_low_stock_count
  FROM items i
  LEFT JOIN stock_levels sl ON i.id = sl.item_id AND sl.store_id = p_store_id
  WHERE i.is_active = true;

  SELECT json_agg(inv ORDER BY inv.total_value DESC) INTO v_inventory FROM (
    SELECT
      i.id,
      i.name,
      i.sku,
      COALESCE(sl.qty, 0)::int                        AS qty,
      COALESCE(i.cost, 0)                             AS cost,
      COALESCE(i.cost, 0) * COALESCE(sl.qty, 0)      AS total_value
    FROM items i
    LEFT JOIN stock_levels sl ON i.id = sl.item_id AND sl.store_id = p_store_id
    WHERE i.is_active = true
  ) inv;

  RETURN json_build_object(
    'totalValue',      COALESCE(v_total_value, 0),
    'totalItems',      v_total_items,
    'lowStockCount',   v_low_stock_count,
    'outOfStockCount', v_out_of_stock,
    'inventory',       COALESCE(v_inventory, '[]'::json)
  );
END;
$$;

-- 3. Profit & Loss RPC
CREATE OR REPLACE FUNCTION public.get_profit_loss(
  p_store_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross_revenue  NUMERIC := 0;
  v_cogs           NUMERIC := 0;
  v_total_expenses NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO v_gross_revenue
  FROM sales
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at >= p_start_date::timestamptz
    AND created_at <= (p_end_date || 'T23:59:59')::timestamptz;

  SELECT COALESCE(SUM(si.qty * si.cost), 0) INTO v_cogs
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.store_id = p_store_id
    AND s.status = 'completed'
    AND s.created_at >= p_start_date::timestamptz
    AND s.created_at <= (p_end_date || 'T23:59:59')::timestamptz;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM expenses
  WHERE store_id = p_store_id
    AND expense_date >= p_start_date::date
    AND expense_date <= p_end_date::date;

  RETURN json_build_object(
    'grossRevenue',  v_gross_revenue,
    'cogs',          v_cogs,
    'grossProfit',   v_gross_revenue - v_cogs,
    'totalExpenses', v_total_expenses,
    'netProfit',     v_gross_revenue - v_cogs - v_total_expenses
  );
END;
$$;
