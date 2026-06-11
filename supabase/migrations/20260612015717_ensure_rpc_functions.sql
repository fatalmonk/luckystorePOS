-- =============================================================================
-- Migration: Ensure RPC functions exist with correct grants for CI/tests
-- Purpose: Create or replace RPC functions that may have been dropped in migration order
-- =============================================================================

-- lookup_item_by_scan (2-param version - the correct one)
DROP FUNCTION IF EXISTS public.lookup_item_by_scan(text, uuid);

CREATE OR REPLACE FUNCTION public.lookup_item_by_scan(p_barcode text, p_store_id uuid)
RETURNS TABLE (item_id uuid, name text, price numeric, mrp numeric, stock integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        i.id AS item_id,
        i.name,
        i.price,
        i.mrp,
        COALESCE(sl.qty, 0)::integer AS stock
    FROM items i
    LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.barcode = p_barcode
    AND i.is_active = true
    LIMIT 1;
$$;

-- search_items_pos (2-param version - the correct one)
DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid);

CREATE OR REPLACE FUNCTION public.search_items_pos(p_query text, p_store_id uuid)
RETURNS TABLE (item_id uuid, name text, price numeric, stock integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        i.id AS item_id,
        i.name,
        i.price,
        COALESCE(sl.qty, 0)::integer AS stock
    FROM items i
    LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.is_active = true
    AND (i.name ILIKE '%' || p_query || '%' OR i.barcode = p_query OR i.sku = p_query)
    LIMIT 20;
$$;

-- Grant permissions for all roles
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO anon;
