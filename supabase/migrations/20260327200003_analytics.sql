-- Phase 4: Inventory Analytics & Reports
-- Provides RPCs to power the InventoryReports page:
--   1. get_stock_valuation     -- total stock value by item/category
--   2. get_top_selling_items   -- top N items by total qty sold
--   3. get_slow_moving_items   -- items with no (or low) sales in a given window
--   4. get_daily_movement_trend -- day-by-day net stock delta for a period

-- ---------------------------------------------------------------------------
-- 1) RPC: get_stock_valuation
-- Stock valuation per item for a given store, ordered by total value desc.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stock_valuation(
  p_store_id uuid,
  p_limit   integer DEFAULT 100
)
RETURNS TABLE (
  item_id       uuid,
  item_name     text,
  sku           text,
  category_name text,
  qty_on_hand   bigint,
  unit_cost     numeric,
  unit_price    numeric,
  total_cost    numeric,
  total_value   numeric,
  margin_pct    numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    i.id                                          AS item_id,
    i.name                                        AS item_name,
    i.sku,
    c.name                                        AS category_name,
    COALESCE(sl.qty, 0)                           AS qty_on_hand,
    i.cost                                        AS unit_cost,
    i.price                                       AS unit_price,
    COALESCE(sl.qty, 0) * i.cost                  AS total_cost,
    COALESCE(sl.qty, 0) * i.price                 AS total_value,
    CASE
      WHEN i.price > 0
      THEN ROUND(((i.price - i.cost) / i.price) * 100, 2)
      ELSE 0
    END                                           AS margin_pct
  FROM public.items i
  LEFT JOIN public.categories c   ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  WHERE i.active = true
  ORDER BY total_value DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_stock_valuation(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stock_valuation(uuid, integer) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2) RPC: get_top_selling_items
-- Top N items by qty sold within the last `p_days` days for a given store.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_selling_items(
  p_store_id uuid,
  p_days     integer DEFAULT 30,
  p_limit    integer DEFAULT 20
)
RETURNS TABLE (
  item_id       uuid,
  item_name     text,
  sku           text,
  category_name text,
  total_qty     bigint,
  total_revenue numeric,
  total_profit  numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    i.id                     AS item_id,
    i.name                   AS item_name,
    i.sku,
    c.name                   AS category_name,
    SUM(si.qty)              AS total_qty,
    SUM(si.line_total)       AS total_revenue,
    SUM(si.line_total - (si.cost * si.qty)) AS total_profit
  FROM public.sale_items si
  JOIN public.sales    sa ON sa.id = si.sale_id
  JOIN public.items    i  ON i.id  = si.item_id
  LEFT JOIN public.categories c ON c.id = i.category_id
  WHERE sa.store_id = p_store_id
    AND sa.created_at >= now() - (p_days || ' days')::interval
    AND sa.status = 'completed'
  GROUP BY i.id, i.name, i.sku, c.name
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_top_selling_items(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_selling_items(uuid, integer, integer) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3) RPC: get_slow_moving_items
-- Items with stock > 0 that had zero sales in the last `p_days` days.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_slow_moving_items(
  p_store_id uuid,
  p_days     integer DEFAULT 30,
  p_limit    integer DEFAULT 50
)
RETURNS TABLE (
  item_id       uuid,
  item_name     text,
  sku           text,
  category_name text,
  qty_on_hand   bigint,
  total_cost    numeric,
  last_sold_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    i.id                                        AS item_id,
    i.name                                      AS item_name,
    i.sku,
    c.name                                      AS category_name,
    COALESCE(sl.qty, 0)                         AS qty_on_hand,
    COALESCE(sl.qty, 0) * i.cost                AS total_cost,
    MAX(sa.created_at)                          AS last_sold_at
  FROM public.items i
  LEFT JOIN public.categories c    ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl  ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.sale_items si    ON si.item_id = i.id
  LEFT JOIN public.sales sa         ON sa.id = si.sale_id
                                    AND sa.store_id = p_store_id
                                    AND sa.status = 'completed'
                                    AND sa.created_at >= now() - (p_days || ' days')::interval
  WHERE i.active = true
    AND COALESCE(sl.qty, 0) > 0
  GROUP BY i.id, i.name, i.sku, c.name, sl.qty, i.cost
  HAVING COUNT(si.item_id) = 0   -- zero sales in window
  ORDER BY total_cost DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_slow_moving_items(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slow_moving_items(uuid, integer, integer) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4) RPC: get_daily_movement_trend
-- Net stock delta per day for the last `p_days` days, for a given store.
-- Useful for a bar/line chart on the reports page.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_daily_movement_trend(
  p_store_id uuid,
  p_days     integer DEFAULT 14
)
RETURNS TABLE (
  trend_date   date,
  total_in     bigint,
  total_out    bigint,
  net_delta    bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    DATE(sm.created_at AT TIME ZONE 'UTC')         AS trend_date,
    SUM(CASE WHEN sm.delta > 0 THEN  sm.delta ELSE 0 END) AS total_in,
    SUM(CASE WHEN sm.delta < 0 THEN -sm.delta ELSE 0 END) AS total_out,
    SUM(sm.delta)                                   AS net_delta
  FROM public.stock_movements sm
  WHERE sm.store_id = p_store_id
    AND sm.created_at >= now() - (p_days || ' days')::interval
  GROUP BY trend_date
  ORDER BY trend_date ASC;
$$;

REVOKE ALL ON FUNCTION public.get_daily_movement_trend(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_movement_trend(uuid, integer) TO authenticated;
