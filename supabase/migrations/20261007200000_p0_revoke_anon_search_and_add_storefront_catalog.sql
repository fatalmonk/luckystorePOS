-- P0/P1 Security Remediation:
-- 1. Create secure search_storefront_catalog RPC for anonymous & authenticated storefront access (NO internal cost column).
-- 2. Revoke anonymous execution from search_items_pos, search_products, and internal financial/inventory RPCs.
-- 3. Revoke anonymous column-level SELECT on internal cost & stock metrics.
-- 4. Mark default storefront store as public in metadata.

-- 1. Storefront catalog RPC (sanitized, tenant-isolated, no cost data)
CREATE OR REPLACE FUNCTION public.search_storefront_catalog(
  p_store_id    uuid,
  p_query       text        DEFAULT '',
  p_category_id uuid        DEFAULT NULL,
  p_limit       integer     DEFAULT 50,
  p_offset      integer     DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $func$
DECLARE
  v_store_tenant_id uuid;
  v_is_public boolean;
BEGIN
  SELECT
    tenant_id,
    COALESCE((metadata->>'is_public_storefront')::boolean, true)
  INTO v_store_tenant_id, v_is_public
  FROM public.stores
  WHERE id = p_store_id;

  IF v_store_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT
        i.id,
        i.sku,
        i.barcode,
        i.short_code,
        i.name,
        i.description,
        i.brand,
        COALESCE(i.mrp, i.price) AS mrp,
        i.price,
        i.group_tag,
        i.image_url,
        c.name        AS category,
        c.id          AS category_id,
        COALESCE(sl.qty, 0)::integer AS qty_on_hand
      FROM public.items i
      LEFT JOIN public.stock_levels sl
             ON sl.item_id = i.id AND sl.store_id = p_store_id
      LEFT JOIN public.categories c
             ON c.id = i.category_id
      WHERE i.tenant_id = v_store_tenant_id
        AND i.is_active = true
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
      LIMIT LEAST(p_limit, 1000) OFFSET p_offset
    ) r
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.search_storefront_catalog(uuid, text, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_storefront_catalog(uuid, text, uuid, integer, integer) TO anon, authenticated, service_role;

-- 2. Revoke anonymous access on search_items_pos & search_products
REVOKE EXECUTE ON FUNCTION public.search_items_pos(uuid, text, uuid, integer, integer) FROM anon, PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_items_pos' AND pg_get_function_identity_arguments(oid) = 'text, uuid') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.search_items_pos(text, uuid) FROM anon, PUBLIC';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_products') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.search_products FROM anon, PUBLIC';
  END IF;
END $$;

-- 3. Revoke anonymous access on privileged internal management RPCs
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_inventory_list_v2',
        'get_retail_kpis',
        'get_new_receipt',
        'link_competitor_price_item',
        'rematch_competitor_prices',
        'match_competitor_price_item',
        'generate_po_number',
        'generate_sale_number',
        'generate_session_number'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn.signature);
  END LOOP;
END $$;

-- Explicitly re-grant storefront public APIs to anon
GRANT EXECUTE ON FUNCTION public.search_storefront_catalog(uuid, text, uuid, integer, integer) TO anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lookup_item_by_scan_anon') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan_anon(text, uuid) TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_order_with_stock_idempotent') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_order_with_stock_idempotent TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_order_with_stock') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_order_with_stock TO anon';
  END IF;
END $$;

-- 4. Revoke anonymous column-level SELECT on internal cost & stock metrics
REVOKE SELECT ON public.items FROM anon, PUBLIC;
GRANT SELECT (
  id, tenant_id, name, description, sku, barcode, short_code, brand, price, mrp, group_tag, image_url, category_id, is_active, created_at, updated_at
) ON public.items TO anon;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON public.products FROM anon, PUBLIC';
    EXECUTE 'GRANT SELECT (
      id, tenant_id, name, description, sku, barcode, short_code, brand, price, mrp, group_tag, image_url, category_id, is_active, created_at, updated_at
    ) ON public.products TO anon';
  END IF;
END $$;

-- 5. Mark primary store as public storefront
UPDATE public.stores
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{is_public_storefront}', 'true'::jsonb)
WHERE id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
