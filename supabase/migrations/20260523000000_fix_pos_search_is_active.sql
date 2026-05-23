-- =============================================================================
-- Fix: i.active → i.is_active across all live POS RPCs
-- Affected: search_items_pos, get_pos_categories, lookup_item_by_scan
-- =============================================================================

-- 1) search_items_pos
CREATE OR REPLACE FUNCTION public.search_items_pos(
  p_store_id    uuid,
  p_query       text        DEFAULT '',
  p_category_id uuid        DEFAULT NULL,
  p_limit       integer     DEFAULT 50,
  p_offset      integer     DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT jsonb_agg(row_to_json(r))
  FROM (
    SELECT
      i.id,
      i.sku,
      i.barcode,
      i.short_code,
      i.name,
      i.brand,
      COALESCE(i.mrp, i.price) AS mrp,
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.category AS category,
      c.id AS category_id,
      COALESCE(sl.qty, 0) AS qty_on_hand
    FROM public.items i
    LEFT JOIN public.stock_levels sl
           ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.categories c
           ON c.id = i.category_id
    WHERE i.is_active = true
      AND (
        p_query = '' OR
        i.name        ILIKE '%' || p_query || '%' OR
        i.brand       ILIKE '%' || p_query || '%' OR
        i.sku         ILIKE '%' || p_query || '%' OR
        i.short_code  ILIKE '%' || p_query || '%' OR
        i.barcode     ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    ORDER BY i.name ASC
    LIMIT p_limit OFFSET p_offset
  ) r;
$$;

REVOKE ALL ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO service_role;

-- 2) get_pos_categories
CREATE OR REPLACE FUNCTION public.get_pos_categories(p_store_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.name), '[]'::jsonb)
  FROM (
    SELECT
      c.id,
      c.name,
      c.image_url,
      c.color,
      c.icon,
      COUNT(i.id) AS item_count
    FROM public.categories c
    JOIN public.items i ON i.category_id = c.id AND i.is_active = true
    GROUP BY c.id, c.name, c.image_url, c.color, c.icon
    HAVING COUNT(i.id) > 0
  ) r;
$$;

REVOKE ALL ON FUNCTION public.get_pos_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO service_role;

-- 3) lookup_item_by_scan
CREATE OR REPLACE FUNCTION public.lookup_item_by_scan(
  p_scan_value  text,
  p_store_id    uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'id',           i.id,
    'sku',          i.sku,
    'short_code',   i.short_code,
    'barcode',      i.barcode,
    'name',         i.name,
    'brand',        i.brand,
    'price',        i.price,
    'cost',         i.cost,
    'group_tag',    i.group_tag,
    'image_url',    i.image_url,
    'qty_on_hand',  COALESCE(sl.qty, 0),
    'category',     c.name
  )
  FROM public.items i
  LEFT JOIN public.stock_levels sl
         ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.categories c
         ON c.id = i.category_id
  WHERE i.is_active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_item_by_scan(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO service_role;
