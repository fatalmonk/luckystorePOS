-- Align public-store eligibility and Bengali name ordering after the applied publication migrations.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Only the JSON boolean true explicitly opts in; the string "true" must NOT publish a storefront.
CREATE OR REPLACE FUNCTION translation_private.is_public_storefront(p_metadata jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $fn$
  SELECT COALESCE(p_metadata @> '{"is_public_storefront":true}'::jsonb, false);
$fn$;
REVOKE ALL ON FUNCTION translation_private.is_public_storefront(jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION translation_private.is_legacy_item_publication_eligible(
  p_translation_id uuid, p_item_id uuid, p_tenant_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM translation_private.legacy_item_approvals l
    JOIN public.item_translations t ON t.id=l.translation_id
    JOIN public.items i ON i.id=t.item_id
    WHERE l.translation_id=p_translation_id AND l.item_id=p_item_id AND l.tenant_id=p_tenant_id
      AND t.id=p_translation_id AND t.item_id=p_item_id AND t.tenant_id=p_tenant_id
      AND i.tenant_id=p_tenant_id AND i.is_active IS TRUE
      AND t.locale='bn' AND t.review_status='published'
      AND t.evidence_snapshot IS NULL AND t.reviewed_by IS NULL AND t.reviewed_at IS NULL
      AND t.published_by IS NULL AND t.published_at IS NULL
      AND translation_private.is_product_details(t.details)
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.tenant_id=p_tenant_id AND translation_private.is_public_storefront(s.metadata)
      )
      AND l.fingerprint=encode(sha256(convert_to(jsonb_build_array(
        t.id,t.item_id,t.tenant_id,t.locale,t.name,t.description,t.search_terms,
        t.review_status,t.created_at AT TIME ZONE 'UTC',t.updated_at AT TIME ZONE 'UTC',
        t.origin,t.last_verified_at,t.details,i.name,i.description,i.sku,i.barcode,i.brand
      )::text,'UTF8')),'hex')
  );
$fn$;

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

  SELECT s.tenant_id, translation_private.is_public_storefront(s.metadata)
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
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
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
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
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

CREATE OR REPLACE FUNCTION public.search_storefront_mobile_catalog_v2(
  p_store_id       uuid,
  p_query          text    DEFAULT '',
  p_category_ids   uuid[]  DEFAULT NULL,
  p_in_stock_only  boolean DEFAULT false,
  p_sort           text    DEFAULT 'best',
  p_limit          integer DEFAULT 20,
  p_offset         integer DEFAULT 0,
  p_locale         text    DEFAULT 'en'
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
  v_locale text := CASE WHEN p_locale = 'bn' THEN 'bn' ELSE 'en' END;
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

  SELECT s.tenant_id, translation_private.is_public_storefront(s.metadata)
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
        tr.name AS bengali_name,
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
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
       )
       AND translation_private.is_product_details(tr.details)
      WHERE i.tenant_id = v_tenant_id
        AND i.is_active IS TRUE
        AND (v_locale = 'en' OR tr.id IS NOT NULL)
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
            CASE WHEN v_sort = 'name-asc' AND v_locale = 'bn' THEN m.bengali_name END ASC,
            m.name ASC,
            m.id ASC
        ) AS row_order
      FROM matching_items AS m
      ORDER BY
        CASE WHEN v_sort = 'best' AND m.sellable_qty > 0 THEN 0
             WHEN v_sort = 'best' THEN 1 ELSE 0 END,
        CASE WHEN v_sort = 'price-asc' THEN m.price END ASC,
        CASE WHEN v_sort = 'price-desc' THEN m.price END DESC,
        CASE WHEN v_sort = 'name-asc' AND v_locale = 'bn' THEN m.bengali_name END ASC,
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
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
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
COMMIT;
