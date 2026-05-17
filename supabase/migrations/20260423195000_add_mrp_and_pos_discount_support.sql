-- Add MRP support for POS discount visibility (MRP - store price).

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS mrp numeric;

UPDATE public.items
SET mrp = price
WHERE mrp IS NULL;

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
    'mrp',          COALESCE(i.mrp, i.price),
    'price',        i.price,
    'cost',         i.cost,
    'group_tag',    i.group_tag,
    'image_url',    i.image_url,
    'qty_on_hand',  COALESCE(sl.qty, 0),
    'category',     c.category
  )
  FROM public.items i
  LEFT JOIN public.stock_levels sl
         ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.categories c
         ON c.id = i.category_id
  WHERE i.active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_items_pos(
  p_store_id    uuid,
  p_query       text        DEFAULT '',
  p_category_id uuid        DEFAULT NULL,
  p_limit       integer     DEFAULT 50,
  p_offset      integer     DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
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
    WHERE i.active = true
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
