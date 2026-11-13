-- Keep security-definer mobile search aligned with the public translation eligibility gate.
-- Mobile catalog v1 applies the existing mobile filters and pagination in
-- PostgreSQL, returning only the requested page plus its exact total.
CREATE OR REPLACE FUNCTION public.search_storefront_mobile_catalog_v1(
  p_store_id       uuid,
  p_query          text    DEFAULT '',
  p_category_ids   uuid[]  DEFAULT NULL,
  p_in_stock_only  boolean DEFAULT false,
  p_sort           text    DEFAULT 'best',
  p_limit          integer DEFAULT 20,
  p_offset         integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  v_tenant_id uuid;
  v_is_public boolean;
  v_query text := btrim(COALESCE(p_query, ''));
  v_sort text := CASE
    WHEN p_sort IN ('price-asc', 'price-desc', 'name-asc') THEN p_sort
    ELSE 'best'
  END;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 60);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF v_offset > 100000 THEN
    RAISE EXCEPTION 'Mobile catalog offset must not exceed 100000';
  END IF;
  IF COALESCE(cardinality(p_category_ids), 0) > 200 THEN
    RAISE EXCEPTION 'Too many category IDs for mobile catalog search';
  END IF;

  SELECT s.tenant_id, COALESCE((s.metadata->>'is_public_storefront')::boolean, false)
    INTO v_tenant_id, v_is_public
  FROM public.stores AS s
  WHERE s.id = p_store_id;

  IF v_tenant_id IS NULL OR v_is_public IS NOT TRUE THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'total', 0);
  END IF;

  RETURN (
    WITH matching_items AS MATERIALIZED (
      SELECT
        i.id,
        i.name,
        i.price,
        GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        )::integer AS sellable_qty
      FROM public.items AS i
      LEFT JOIN public.stock_levels AS sl
        ON sl.item_id = i.id
       AND sl.store_id = p_store_id
       AND sl.tenant_id = v_tenant_id
      LEFT JOIN public.item_translations AS tr
        ON tr.item_id = i.id
       AND tr.tenant_id = v_tenant_id
       AND tr.locale = 'bn'
       AND translation_private.is_publication_eligible(
         'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
         tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
       )
       AND translation_private.is_product_details(tr.details)
      WHERE i.tenant_id = v_tenant_id
        AND i.is_active IS TRUE
        AND (p_category_ids IS NULL OR i.category_id = ANY(p_category_ids))
        AND (NOT COALESCE(p_in_stock_only, false) OR GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        ) > 0)
        AND (
          v_query = ''
          OR position(lower(v_query) IN lower(COALESCE(i.name, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(i.description, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(tr.name, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(tr.description, ''))) > 0
        )
    ),
    total_count AS (
      SELECT count(*)::integer AS total FROM matching_items
    ),
    page_ids AS (
      SELECT m.id,
        row_number() OVER (
          ORDER BY
            CASE WHEN v_sort = 'best' AND m.sellable_qty > 0 THEN 0
                 WHEN v_sort = 'best' THEN 1 ELSE 0 END,
            CASE WHEN v_sort = 'price-asc' THEN m.price END ASC,
            CASE WHEN v_sort = 'price-desc' THEN m.price END DESC,
            m.name ASC,
            m.id ASC
        ) AS row_order
      FROM matching_items AS m
      ORDER BY
        CASE WHEN v_sort = 'best' AND m.sellable_qty > 0 THEN 0
             WHEN v_sort = 'best' THEN 1 ELSE 0 END,
        CASE WHEN v_sort = 'price-asc' THEN m.price END ASC,
        CASE WHEN v_sort = 'price-desc' THEN m.price END DESC,
        m.name ASC,
        m.id ASC
      LIMIT v_limit
      OFFSET v_offset
    ),
    page_products AS (
      SELECT
        pi.row_order,
        i.id,
        i.name,
        i.description,
        i.brand,
        COALESCE(i.mrp, i.price) AS mrp,
        i.price,
        i.image_url,
        c.name AS category,
        c.id AS category_id,
        GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        )::integer AS sellable_qty,
        tr.name AS bengali_name,
        tr.description AS bengali_description
      FROM page_ids AS pi
      JOIN public.items AS i ON i.id = pi.id AND i.tenant_id = v_tenant_id
      LEFT JOIN public.categories AS c
        ON c.id = i.category_id
       AND c.tenant_id = v_tenant_id
      LEFT JOIN public.stock_levels AS sl
        ON sl.item_id = i.id
       AND sl.store_id = p_store_id
       AND sl.tenant_id = v_tenant_id
      LEFT JOIN public.item_translations AS tr
        ON tr.item_id = i.id
       AND tr.tenant_id = v_tenant_id
       AND tr.locale = 'bn'
       AND translation_private.is_publication_eligible(
         'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
         tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
       )
       AND translation_private.is_product_details(tr.details)
    )
    SELECT jsonb_build_object(
      'items', COALESCE(
        (SELECT jsonb_agg(to_jsonb(page_products) - 'row_order' ORDER BY row_order)
         FROM page_products),
        '[]'::jsonb
      ),
      'total', (SELECT total FROM total_count)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.search_storefront_mobile_catalog_v1(uuid, text, uuid[], boolean, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_storefront_mobile_catalog_v1(uuid, text, uuid[], boolean, text, integer, integer)
  TO anon, authenticated, service_role;
