-- Migration: Add cost_price to get_inventory_list
-- Applied: 2026-01-18

DROP FUNCTION IF EXISTS public.get_inventory_list(uuid);

CREATE OR REPLACE FUNCTION public.get_inventory_list(p_store_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    sku text,
    current_qty integer,
    min_qty integer,
    reorder_status text,
    last_updated timestamp with time zone,
    category_id uuid,
    category_name text,
    price numeric,
    cost numeric,
    mrp numeric,
    barcode text,
    image_url text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.sku,
    COALESCE(sl.qty, 0)::integer as current_qty,
    COALESCE(sat.min_qty, 5)::integer as min_qty,
    CASE
      WHEN COALESCE(sl.qty, 0) = 0 THEN 'OUT'::text
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'::text
      ELSE 'OK'::text
    END as reorder_status,
    i.updated_at as last_updated,
    i.category_id,
    cat.category AS category_name,
    i.price,
    i.cost,
    i.mrp,
    i.barcode,
    i.image_url
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  LEFT JOIN public.categories cat ON cat.id = i.category_id
  WHERE i.active = true
  ORDER BY
    CASE
      WHEN COALESCE(sl.qty, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$$;

ALTER FUNCTION public.get_inventory_list(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_inventory_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_list(uuid) TO service_role;
