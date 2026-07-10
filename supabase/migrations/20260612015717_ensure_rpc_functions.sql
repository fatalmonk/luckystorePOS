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

-- search_items_pos
-- NOTE: The 5-param version (uuid,text,uuid,integer,integer) is the storefront contract.
--       DO NOT replace it with a 2-param version — that breaks apps/customer_storefront/app/lib/products.ts.
--       If the 5-param version is missing, apply migration 20260710215800_fix_search_items_pos_signature.sql.
--
-- Safeguard: only create the 2-param version if the 5-param one does NOT exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'search_items_pos'
      AND pg_get_function_arguments(p.oid) LIKE 'uuid%'
  ) THEN
    -- No 5-param version exists; create the minimal 2-param fallback.
    CREATE OR REPLACE FUNCTION public.search_items_pos(p_query text, p_store_id uuid)
    RETURNS TABLE (item_id uuid, name text, price numeric, stock integer, image_url text)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
    AS $func$
        SELECT i.id AS item_id, i.name, i.price, COALESCE(sl.qty, 0)::integer AS stock, i.image_url
        FROM items i
        LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
        WHERE i.is_active = true
          AND (i.name ILIKE '%' || p_query || '%' OR i.barcode = p_query OR i.sku = p_query)
        LIMIT 20;
    $func$;

    -- Grant on the newly-created 2-param version
    GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.search_items_pos(text, uuid) TO anon;
  END IF;
END $$;

-- Grant permissions for lookup_item_by_scan (always created above)
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO anon;
