-- =============================================================================
-- Migration: Fix search_items_pos — restore 5-param storefront contract
-- Date: 2026-07-10
-- Issue: 20260612015717_ensure_rpc_functions.sql overwrote the 5-param version
--        with a 2-param version, breaking the customer storefront.
-- =============================================================================

-- Drop the broken 2-param version (if it exists)
DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid);

-- Restore the correct 5-param version
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
AS $func$
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
      c.name        AS category,
      c.id          AS category_id,
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
$func$;

REVOKE ALL ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO anon;
