-- Migration: Remove duplicate items by name when barcode is NULL
-- This catches test items like "Item Alpha", "Storm Item", "Concurrency Storm Item"

DELETE FROM public.items a
USING (
    SELECT MIN(id::text) as keep_id, name, tenant_id
    FROM public.items
    WHERE barcode IS NULL OR barcode = ''
    GROUP BY name, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE (a.barcode IS NULL OR a.barcode = '')
  AND a.name = b.name
  AND a.tenant_id = b.tenant_id
  AND a.id::text != b.keep_id;

-- Drop and recreate get_inventory_list to include MRP
DROP FUNCTION IF EXISTS public.get_inventory_list(uuid);

CREATE OR REPLACE FUNCTION public.get_inventory_list(p_store_id uuid)
RETURNS TABLE(id uuid, name text, sku text, current_qty integer, min_qty integer, reorder_status text, last_updated timestamp with time zone, category_id uuid, price numeric, mrp numeric, image_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
    i.price,
    i.mrp,
    i.image_url
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
  ORDER BY
    CASE
      WHEN COALESCE(sl.qty, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$function$;

COMMENT ON TABLE public.items IS 'Products/items - deduplicated on barcode+tenant OR name+tenant if no barcode';
