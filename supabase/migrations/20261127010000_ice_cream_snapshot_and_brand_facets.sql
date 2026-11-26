-- Isolated Ice Cream pilot only. Public reads remain tenant/store scoped.
-- The snapshot wrapper executes both queries within one STABLE RPC invocation,
-- avoiding cross-request offset drift during concurrent catalog writes.
CREATE OR REPLACE FUNCTION public.search_storefront_catalog_snapshot_v1(
  p_store_id uuid,
  p_query text DEFAULT '',
  p_category_id uuid DEFAULT NULL,
  p_item_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tenant uuid;
  v_public boolean;
  v_count bigint;
  v_items jsonb;
BEGIN
  IF p_category_id IS NULL OR p_limit <> 1000 OR p_offset <> 0
    OR COALESCE(cardinality(p_item_ids), 0) > 1000 THEN
    RAISE EXCEPTION 'Invalid bounded category snapshot request';
  END IF;

  SELECT tenant_id, COALESCE((metadata->>'is_public_storefront')::boolean, true)
    INTO v_tenant, v_public
    FROM public.stores WHERE id = p_store_id;
  IF v_tenant IS NULL OR v_public IS NOT TRUE THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'has_more', false, 'total_count', 0);
  END IF;

  -- Both reads observe the same statement snapshot. Use the identical
  -- visibility, category and text/translation-ID predicates as catalog_v2.
  SELECT COUNT(*) INTO v_count FROM (
    SELECT 1
    FROM public.items i
    WHERE i.tenant_id = v_tenant AND i.is_active = true
      AND i.category_id = p_category_id
      AND CASE
        WHEN COALESCE(cardinality(p_item_ids), 0) > 0 AND COALESCE(p_query, '') = ''
          THEN i.id = ANY(p_item_ids)
        ELSE
          COALESCE(p_query, '') = '' OR
          i.name ILIKE '%' || p_query || '%' OR
          i.brand ILIKE '%' || p_query || '%' OR
          i.sku ILIKE '%' || p_query || '%' OR
          i.short_code ILIKE '%' || p_query || '%' OR
          i.barcode ILIKE '%' || p_query || '%' OR
          (COALESCE(cardinality(p_item_ids), 0) > 0 AND i.id = ANY(p_item_ids))
      END
    LIMIT 1001
  ) bounded;

  SELECT public.search_storefront_catalog_v2(
    p_store_id, COALESCE(p_query, ''), p_category_id,
    COALESCE(p_item_ids, ARRAY[]::uuid[]), 1000, 0
  ) INTO v_items;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb),
                            'has_more', v_count > 1000, 'total_count', v_count);
END;
$$;

-- Brand sources carry only fields needed to reconstruct the existing
-- RuleBasedBrandParser contract, not prices, photos or stock records.
CREATE OR REPLACE FUNCTION public.get_storefront_category_brand_sources_v1(
  p_store_id uuid,
  p_category_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tenant uuid;
  v_public boolean;
  v_sources jsonb;
BEGIN
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'Category ID required';
  END IF;
  SELECT tenant_id, COALESCE((metadata->>'is_public_storefront')::boolean, true)
    INTO v_tenant, v_public
    FROM public.stores WHERE id = p_store_id;
  IF v_tenant IS NULL OR v_public IS NOT TRUE THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'brand', s.brand)), '[]'::jsonb)
    INTO v_sources
  FROM (
    SELECT i.name, i.brand FROM public.items i
    WHERE i.tenant_id = v_tenant AND i.is_active = true AND i.category_id = p_category_id
    ORDER BY i.name, i.id
    LIMIT 1001
  ) s;
  IF jsonb_array_length(v_sources) > 1000 THEN
    RAISE EXCEPTION 'Category exceeds safe facet limit';
  END IF;
  RETURN v_sources;
END;
$$;

REVOKE ALL ON FUNCTION public.search_storefront_catalog_snapshot_v1(uuid, text, uuid, uuid[], integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_storefront_category_brand_sources_v1(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_storefront_catalog_snapshot_v1(uuid, text, uuid, uuid[], integer, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_storefront_category_brand_sources_v1(uuid, uuid)
  TO anon, authenticated, service_role;
