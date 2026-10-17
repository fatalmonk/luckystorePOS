-- Add get_storefront_deals RPC to filter and order deals directly in PostgreSQL
-- before pagination, eliminating selection bias in fallback deals discovery.

CREATE OR REPLACE FUNCTION public.get_storefront_deals(
  p_store_id              uuid,
  p_min_discount_percent numeric DEFAULT 10.0,
  p_limit                 integer DEFAULT 50,
  p_offset                integer DEFAULT 0
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
    COALESCE((metadata->>'is_public_storefront')::boolean, false)
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
        GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        )::integer AS sellable_qty,
        i.created_at,
        i.updated_at,
        FLOOR(((COALESCE(i.mrp, i.price) - i.price) / NULLIF(COALESCE(i.mrp, i.price), 0)) * 100)::integer AS discount_percent
      FROM public.items i
      LEFT JOIN public.stock_levels sl
             ON sl.item_id = i.id AND sl.store_id = p_store_id
      LEFT JOIN public.categories c
             ON c.id = i.category_id AND c.tenant_id = v_store_tenant_id
      WHERE i.tenant_id = v_store_tenant_id
        AND i.is_active = true
        AND i.mrp IS NOT NULL
        AND i.mrp > i.price
        AND i.price <= ROUND(i.mrp * (1.0 - (COALESCE(p_min_discount_percent, 10.0) / 100.0)), 2)
        AND GREATEST(0, COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)) > 0
      ORDER BY
        discount_percent DESC,
        i.price ASC,
        i.name ASC,
        i.id ASC
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
      OFFSET GREATEST(COALESCE(p_offset, 0), 0)
    ) r
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.get_storefront_deals(uuid, numeric, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storefront_deals(uuid, numeric, integer, integer) TO anon, authenticated, service_role;
