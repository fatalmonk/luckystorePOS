-- Expose item created_at and updated_at in search_storefront_catalog RPC
-- Required for dynamic sitemap <lastmod> population without exposing sensitive financial metrics.

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

  IF v_store_tenant_id IS NULL OR v_is_public IS NOT TRUE THEN
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
        COALESCE(sl.qty, 0)::integer AS qty_on_hand,
        i.created_at,
        i.updated_at
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
