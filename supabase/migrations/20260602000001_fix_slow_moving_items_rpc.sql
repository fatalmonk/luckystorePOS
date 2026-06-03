-- Fix get_slow_moving_items 400 error
-- Ensures function exists with proper grants

-- 1. Create/replace function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_slow_moving_items(
    p_store_id uuid,
    p_days integer DEFAULT 30,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    item_id uuid,
    item_name text,
    sku text,
    category_name text,
    qty_on_hand bigint,
    total_cost numeric,
    last_sold_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
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
  WHERE i.is_active = true
    AND COALESCE(sl.qty, 0) > 0
  GROUP BY i.id, i.name, i.sku, c.name, sl.qty, i.cost
  HAVING COUNT(si.item_id) = 0
  ORDER BY total_cost DESC
  LIMIT p_limit;
$$;

-- 2. Grant execute to authenticated
ALTER FUNCTION public.get_slow_moving_items(uuid, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_slow_moving_items(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slow_moving_items(uuid, integer, integer) TO authenticated;

-- 3. Also fix similar RPCs if they have issues
-- Ensure other analytics RPCs have proper grants
DO $$
BEGIN
    -- Fix get_top_selling_items if needed
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_selling_items') THEN
        REVOKE ALL ON FUNCTION public.get_top_selling_items FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.get_top_selling_items TO authenticated;
    END IF;
    
    -- Fix get_daily_movement_trend if needed  
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_daily_movement_trend') THEN
        REVOKE ALL ON FUNCTION public.get_daily_movement_trend FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.get_daily_movement_trend TO authenticated;
    END IF;
END $$;
