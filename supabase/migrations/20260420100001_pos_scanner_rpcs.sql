-- =============================================================================
-- Phase 5: Scanner Lookup RPC
-- =============================================================================
-- After Phase 0 barcodes exist and inventory is imported, the POS needs to
-- resolve a scanned value → item + current stock level at speed.
--
-- RPC: lookup_item_by_scan(p_scan_value, p_store_id)
--   Tries sku first (exact), then barcode, then short_code.
--   Returns item details + current qty_on_hand for that store.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) RPC: lookup_item_by_scan
-- ---------------------------------------------------------------------------
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
  WHERE i.active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_item_by_scan(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPC: search_items_pos
-- Full-text + prefix search for the POS product grid search bar.
-- Returns up to 50 items matching the query, ordered by name.
-- ---------------------------------------------------------------------------
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
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.name        AS category,
      c.id          AS category_id,
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

REVOKE ALL ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) RPC: get_pos_categories
-- Returns all active categories that have at least one item in stock,
-- used to populate the category filter chips in the POS grid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pos_categories(
  p_store_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_agg(row_to_json(r) ORDER BY r.name)
  FROM (
    SELECT DISTINCT
      c.id,
      c.name,
      COUNT(i.id) AS item_count
    FROM public.categories c
    JOIN public.items i ON i.category_id = c.id AND i.active = true
    GROUP BY c.id, c.name
    HAVING COUNT(i.id) > 0
  ) r;
$$;

REVOKE ALL ON FUNCTION public.get_pos_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Index: GIN trigram for fast ILIKE search on item names
--    (requires pg_trgm extension — enabled by default on Supabase)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_items_name_trgm
  ON public.items USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_items_brand_trgm
  ON public.items USING gin (brand gin_trgm_ops)
  WHERE brand IS NOT NULL;
