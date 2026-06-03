DROP FUNCTION IF EXISTS public.get_low_stock_items(uuid);
CREATE OR REPLACE FUNCTION public.get_low_stock_items(p_store_id uuid)
RETURNS TABLE (
    item_id uuid,
    item_name text,
    sku text,
    image_url text,
    category_name text,
    current_qty integer,
    min_qty integer,
    reorder_qty integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    i.id as item_id,
    i.name as item_name,
    i.sku as sku,
    i.image_url as image_url,
    c.name as category_name,
    COALESCE(sl.qty, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    COALESCE(sat.reorder_qty, 20) as reorder_qty
  FROM public.items i
  LEFT JOIN public.categories c ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
    AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty, 0) ASC, i.name ASC
  LIMIT 50;
$$;
