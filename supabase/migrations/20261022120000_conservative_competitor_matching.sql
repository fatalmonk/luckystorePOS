-- Conservative competitor product identity and price-gap gating.
-- No existing observations are rewritten by this migration.

CREATE OR REPLACE FUNCTION public.extract_product_pack_signature(p_text text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_matches integer;
  v_quantity text[];
  v_pack text[];
  v_amount numeric;
  v_unit text;
  v_dimension text;
  v_pack_count integer := 1;
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_matches
  FROM regexp_matches(lower(p_text), '(\d+(?:\.\d+)?)\s*(kg|kilo|gm|g|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\M', 'g');

  -- Multiple measures (for example, a bundle listing) cannot be safely reduced to one size.
  IF v_matches <> 1 THEN
    RETURN NULL;
  END IF;

  v_quantity := regexp_match(lower(p_text), '(\d+(?:\.\d+)?)\s*(kg|kilo|gm|g|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\M');
  v_amount := v_quantity[1]::numeric;
  v_unit := v_quantity[2];
  IF v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  IF v_unit IN ('kg', 'kilo', 'gm', 'g', 'gram', 'grams') THEN
    v_dimension := 'mass';
    IF v_unit IN ('kg', 'kilo') THEN v_amount := v_amount * 1000; END IF;
  ELSIF v_unit IN ('ml', 'l', 'ltr', 'liter', 'liters', 'litre', 'litres') THEN
    v_dimension := 'volume';
    IF v_unit <> 'ml' THEN v_amount := v_amount * 1000; END IF;
  ELSE
    v_dimension := 'count';
  END IF;

  v_pack := regexp_match(lower(p_text), '(?:^|[^0-9])(\d+)\s*[x×]\s*\d');
  IF v_pack IS NULL THEN
    v_pack := regexp_match(lower(p_text), '\mpack\s+of\s+(\d+)\M');
  END IF;
  IF v_pack IS NULL THEN
    v_pack := regexp_match(lower(p_text), '\m(\d+)\s*[- ]?pack\M');
  END IF;
  IF v_pack IS NULL THEN
    v_pack := regexp_match(lower(p_text), '\d+(?:\.\d+)?\s*(?:kg|kilo|gm|g|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\s*[x×]\s*(\d+)');
  END IF;
  IF v_pack IS NOT NULL THEN
    v_pack_count := v_pack[1]::integer;
    IF v_pack_count < 1 THEN RETURN NULL; END IF;
  END IF;

  RETURN jsonb_build_object(
    'measurement_dimension', v_dimension,
    'normalized_quantity', v_amount,
    'pack_count', v_pack_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.extract_product_variant(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  -- Collect every explicit qualifier; "chocolate" is a family word and must
  -- not mask a later flavor such as "mint" or "original".
  SELECT string_agg(DISTINCT matched.variant[1], '|' ORDER BY matched.variant[1])
  FROM regexp_matches(lower(coalesce(p_text, '')),
    '\m(extra hot|sugar free|unsalted|salted|lemon|orange|strawberry|vanilla|mint|spicy|mild|original|classic|regular)\M', 'g')
    AS matched(variant);
$$;

CREATE OR REPLACE FUNCTION public.is_valid_product_gtin(p_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_digits text := regexp_replace(coalesce(p_value, ''), '[ -]', '', 'g');
  v_sum integer := 0;
  v_index integer;
  v_weight integer;
BEGIN
  IF length(v_digits) NOT IN (8, 12, 13, 14) THEN RETURN false; END IF;
  FOR v_index IN REVERSE length(v_digits) - 1..1 LOOP
    v_weight := CASE WHEN (length(v_digits) - v_index) % 2 = 1 THEN 3 ELSE 1 END;
    v_sum := v_sum + substring(v_digits FROM v_index FOR 1)::integer * v_weight;
  END LOOP;
  RETURN ((10 - (v_sum % 10)) % 10) = substring(v_digits FROM length(v_digits) FOR 1)::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_competitor_product_match(
  p_observed_name text,
  p_observed_brand text,
  p_observed_barcode text,
  p_catalog_name text,
  p_catalog_brand text,
  p_catalog_barcode text,
  p_previously_verified boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_observed_brand_explicit boolean := nullif(trim(coalesce(p_observed_brand, '')), '') IS NOT NULL;
  v_observed_brand text := lower(trim(coalesce(nullif(p_observed_brand, ''), split_part(trim(coalesce(p_observed_name, '')), ' ', 1))));
  v_catalog_brand text := lower(trim(coalesce(nullif(p_catalog_brand, ''), split_part(trim(coalesce(p_catalog_name, '')), ' ', 1))));
  v_observed_pack jsonb := public.extract_product_pack_signature(p_observed_name);
  v_catalog_pack jsonb := public.extract_product_pack_signature(p_catalog_name);
  v_observed_variant text := public.extract_product_variant(p_observed_name);
  v_catalog_variant text := public.extract_product_variant(p_catalog_name);
  v_observed_family text;
  v_catalog_family text;
  v_observed_gtin text := regexp_replace(coalesce(p_observed_barcode, ''), '[^0-9]', '', 'g');
  v_catalog_gtin text := regexp_replace(coalesce(p_catalog_barcode, ''), '[^0-9]', '', 'g');
  v_common_tokens integer;
  v_union_tokens integer;
BEGIN
  IF v_observed_gtin <> '' AND v_catalog_gtin <> '' AND v_observed_gtin <> v_catalog_gtin THEN
    RETURN 'REJECTED';
  END IF;
  IF v_observed_brand <> '' AND v_catalog_brand <> '' AND v_observed_brand <> v_catalog_brand THEN
    RETURN 'REJECTED';
  END IF;
  IF v_observed_pack IS NOT NULL AND v_catalog_pack IS NOT NULL AND v_observed_pack <> v_catalog_pack THEN
    RETURN 'REJECTED';
  END IF;
  IF v_observed_variant IS NOT NULL AND v_catalog_variant IS NOT NULL AND v_observed_variant <> v_catalog_variant THEN
    RETURN 'REJECTED';
  END IF;

  IF v_observed_gtin <> '' AND v_observed_gtin = v_catalog_gtin
     AND public.is_valid_product_gtin(p_observed_barcode)
     AND public.is_valid_product_gtin(p_catalog_barcode) THEN
    RETURN 'VERIFIED';
  END IF;
  IF p_previously_verified THEN RETURN 'VERIFIED'; END IF;

  IF v_observed_brand = '' OR v_catalog_brand = '' OR v_observed_brand <> v_catalog_brand THEN
    RETURN 'AMBIGUOUS';
  END IF;
  IF v_observed_pack IS NULL OR v_catalog_pack IS NULL THEN RETURN 'AMBIGUOUS'; END IF;
  IF (v_observed_variant IS NULL) <> (v_catalog_variant IS NULL) THEN RETURN 'AMBIGUOUS'; END IF;

  v_observed_family := public.normalize_bilingual_product_name(coalesce(p_observed_name, ''));
  v_catalog_family := public.normalize_bilingual_product_name(coalesce(p_catalog_name, ''));
  v_observed_family := regexp_replace(v_observed_family, '(\d+(?:\.\d+)?)\s*(kg|kilo|gm|g|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\M', ' ', 'gi');
  v_catalog_family := regexp_replace(v_catalog_family, '(\d+(?:\.\d+)?)\s*(kg|kilo|gm|g|grams?|ml|l|ltr|liters?|litres?|pcs?|pieces?)\M', ' ', 'gi');
  v_observed_family := regexp_replace(v_observed_family, '\m(\d+\s*[x×]\s*\d+|pack\s+of\s+\d+|\d+\s*[- ]?pack)\M', ' ', 'gi');
  v_catalog_family := regexp_replace(v_catalog_family, '\m(\d+\s*[x×]\s*\d+|pack\s+of\s+\d+|\d+\s*[- ]?pack)\M', ' ', 'gi');
  v_observed_family := replace(v_observed_family, v_observed_brand, ' ');
  v_catalog_family := replace(v_catalog_family, v_catalog_brand, ' ');
  v_observed_family := regexp_replace(v_observed_family, '\m(and|with|the|pack|of|for|size)\M', ' ', 'g');
  v_catalog_family := regexp_replace(v_catalog_family, '\m(and|with|the|pack|of|for|size)\M', ' ', 'g');
  v_observed_family := regexp_replace(v_observed_family, '\s+', ' ', 'g');
  v_catalog_family := regexp_replace(v_catalog_family, '\s+', ' ', 'g');

  IF trim(v_observed_family) = '' OR trim(v_catalog_family) = '' THEN RETURN 'AMBIGUOUS'; END IF;
  SELECT count(*) INTO v_common_tokens FROM (
    SELECT DISTINCT token FROM regexp_split_to_table(trim(v_observed_family), '\s+') AS token
    INTERSECT
    SELECT DISTINCT token FROM regexp_split_to_table(trim(v_catalog_family), '\s+') AS token
  ) common;
  SELECT count(*) INTO v_union_tokens FROM (
    SELECT DISTINCT token FROM regexp_split_to_table(trim(v_observed_family), '\s+') AS token
    UNION
    SELECT DISTINCT token FROM regexp_split_to_table(trim(v_catalog_family), '\s+') AS token
  ) all_tokens;
  IF v_common_tokens < 2 OR v_union_tokens = 0 THEN RETURN 'AMBIGUOUS'; END IF;
  -- A title's first token is only a brand hint. It cannot independently establish identity.
  IF v_common_tokens = v_union_tokens THEN
    IF v_observed_brand_explicit THEN RETURN 'VERIFIED'; END IF;
    RETURN 'PROBABLE';
  END IF;
  IF v_common_tokens::numeric / v_union_tokens >= 0.8 THEN RETURN 'PROBABLE'; END IF;
  RETURN 'AMBIGUOUS';
END;
$$;

-- Keep the established RPC signature while encoding the match status in the existing version field.
-- Add the structured scraped brand as an optional argument. Existing four-argument
-- callers remain compatible because this parameter has a default.
DROP FUNCTION IF EXISTS public.match_competitor_price_item(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.match_competitor_price_item(
  p_store_id uuid,
  p_scraped_product_name text,
  p_scraped_barcode text DEFAULT NULL,
  p_scraped_url text DEFAULT NULL,
  p_scraped_brand text DEFAULT NULL
)
RETURNS TABLE (item_id uuid, match_confidence numeric(6,5), matcher_version text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidate record;
  v_status text;
  v_reason text := 'no-candidate';
  v_observed_brand text := p_scraped_brand;
  v_observed_brand_hint text := coalesce(nullif(trim(p_scraped_brand), ''), split_part(trim(coalesce(p_scraped_product_name, '')), ' ', 1));
  v_tenant_id uuid;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store' USING ERRCODE = '42501';
  END IF;
  SELECT s.tenant_id INTO v_tenant_id FROM public.stores s WHERE s.id = p_store_id;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'store not found'; END IF;

  IF p_scraped_url IS NOT NULL AND trim(p_scraped_url) <> '' THEN
    SELECT cp.item_id, i.name, i.brand, i.barcode
    INTO v_candidate
    FROM public.competitor_prices cp
     JOIN public.items i ON i.id = cp.item_id AND i.tenant_id = v_tenant_id
    WHERE cp.store_id = p_store_id
      AND cp.competitor_product_url = trim(p_scraped_url)
      AND cp.item_id IS NOT NULL
      AND (cp.is_override_active OR cp.source = 'manual')
    ORDER BY cp.created_at DESC
    LIMIT 1;
    IF v_candidate.item_id IS NOT NULL THEN
      v_status := public.classify_competitor_product_match(
        p_scraped_product_name, v_observed_brand, p_scraped_barcode,
        v_candidate.name, v_candidate.brand, v_candidate.barcode, true
      );
      IF v_status = 'VERIFIED' THEN
        RETURN QUERY SELECT v_candidate.item_id, 1.00000::numeric(6,5), 'safe-v2:VERIFIED:previously-verified-url'::text;
        RETURN;
      END IF;
      IF v_status = 'REJECTED' THEN
        RETURN QUERY SELECT NULL::uuid, NULL::numeric(6,5), 'safe-v2:REJECTED:url-attribute-conflict'::text;
        RETURN;
      END IF;
    END IF;
  END IF;

  IF p_scraped_barcode IS NOT NULL AND public.is_valid_product_gtin(p_scraped_barcode) THEN
    FOR v_candidate IN
      SELECT i.id, i.name, i.brand, i.barcode
      FROM public.items i
      WHERE i.tenant_id = v_tenant_id AND i.is_active = true
        AND regexp_replace(coalesce(i.barcode, ''), '[^0-9]', '', 'g') = regexp_replace(p_scraped_barcode, '[^0-9]', '', 'g')
    LOOP
      v_status := public.classify_competitor_product_match(
        p_scraped_product_name, v_observed_brand, p_scraped_barcode,
        v_candidate.name, v_candidate.brand, v_candidate.barcode, false
      );
      IF v_status = 'VERIFIED' THEN
        RETURN QUERY SELECT v_candidate.id, 1.00000::numeric(6,5), 'safe-v2:VERIFIED:gtin-and-attributes'::text;
        RETURN;
      END IF;
      RETURN QUERY SELECT NULL::uuid, NULL::numeric(6,5), 'safe-v2:REJECTED:gtin-attribute-conflict'::text;
      RETURN;
    END LOOP;
  END IF;

  FOR v_candidate IN
    SELECT i.id, i.name, i.brand, i.barcode
    FROM public.items i
    WHERE i.tenant_id = v_tenant_id AND i.is_active = true
      AND lower(trim(coalesce(nullif(i.brand, ''), split_part(trim(i.name), ' ', 1)))) = lower(trim(v_observed_brand_hint))
    ORDER BY i.name
  LOOP
    v_status := public.classify_competitor_product_match(
      p_scraped_product_name, v_observed_brand, p_scraped_barcode,
      v_candidate.name, v_candidate.brand, v_candidate.barcode, false
    );
    IF v_status = 'VERIFIED' THEN
      RETURN QUERY SELECT v_candidate.id, 0.95000::numeric(6,5), 'safe-v2:VERIFIED:brand-variant-package-exact'::text;
      RETURN;
    ELSIF v_status = 'PROBABLE' THEN
      v_reason := 'name-similar';
    ELSIF v_status = 'AMBIGUOUS' AND v_reason = 'no-candidate' THEN
      v_reason := 'attributes-incomplete';
    ELSIF v_status = 'REJECTED' THEN
      v_reason := 'attribute-conflict';
    END IF;
  END LOOP;

  IF v_reason = 'name-similar' THEN
    RETURN QUERY SELECT NULL::uuid, 0.75000::numeric(6,5), 'safe-v2:PROBABLE:name-similar'::text;
  ELSIF v_reason = 'attribute-conflict' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::numeric(6,5), 'safe-v2:REJECTED:attribute-conflict'::text;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::numeric(6,5), 'safe-v2:AMBIGUOUS:attributes-incomplete'::text;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rematch_competitor_prices(p_store_id uuid)
RETURNS TABLE (total_processed integer, rematched_count integer, unlinked_false_matches integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_processed integer := 0;
  v_rematched integer := 0;
  v_unlinked integer := 0;
  v_tenant_id uuid;
  r record;
  v_res record;
  v_linked record;
  v_our_price numeric;
  v_status text;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store' USING ERRCODE = '42501';
  END IF;
  SELECT s.tenant_id INTO v_tenant_id FROM public.stores s WHERE s.id = p_store_id;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'store not found'; END IF;

  FOR r IN SELECT cp.id, cp.product_name, cp.competitor_product_url,
      cp.raw_data ->> 'barcode' AS scraped_barcode,
      cp.raw_data ->> 'brand' AS scraped_brand, cp.item_id, cp.matcher_version
    FROM public.competitor_prices cp
    WHERE cp.store_id = p_store_id AND cp.source = 'scraper'
  LOOP
    v_processed := v_processed + 1;
    -- Keep an explicit user confirmation only while the current observation
    -- still has no conflicting attributes; never trust its status marker alone.
    IF r.matcher_version = 'safe-v2:VERIFIED:user-confirmed' AND r.item_id IS NOT NULL THEN
      SELECT i.id, i.name, i.brand, i.barcode
      INTO v_linked
      FROM public.items i
      WHERE i.id = r.item_id AND i.tenant_id = v_tenant_id AND i.is_active = true;

      IF v_linked.id IS NOT NULL AND public.classify_competitor_product_match(
        r.product_name, r.scraped_brand, r.scraped_barcode,
        v_linked.name, v_linked.brand, v_linked.barcode, true
      ) = 'VERIFIED' THEN
        SELECT r.item_id AS item_id,
          1.00000::numeric(6,5) AS match_confidence,
          r.matcher_version AS matcher_version
        INTO v_res;
      ELSE
        SELECT * INTO v_res FROM public.match_competitor_price_item(
          p_store_id, r.product_name, r.scraped_barcode, r.competitor_product_url, r.scraped_brand
        );
      END IF;
    ELSE
      SELECT * INTO v_res FROM public.match_competitor_price_item(
        p_store_id, r.product_name, r.scraped_barcode, r.competitor_product_url, r.scraped_brand
      );
    END IF;
    v_status := split_part(v_res.matcher_version, ':', 2);

    IF v_res.item_id IS DISTINCT FROM r.item_id
       OR v_res.matcher_version IS DISTINCT FROM r.matcher_version THEN
      v_our_price := NULL;
      IF v_res.item_id IS NOT NULL AND v_status = 'VERIFIED' THEN
        SELECT i.price INTO v_our_price FROM public.items i
        WHERE i.id = v_res.item_id AND i.tenant_id = v_tenant_id;
      END IF;

      UPDATE public.competitor_prices cp
      SET item_id = CASE WHEN v_status = 'VERIFIED' THEN v_res.item_id ELSE NULL END,
          our_price = CASE WHEN v_status = 'VERIFIED' THEN v_our_price ELSE NULL END,
          price_gap_percent = CASE
            WHEN v_status = 'VERIFIED' AND v_our_price IS NOT NULL AND cp.competitor_price > 0
              THEN round((v_our_price - cp.competitor_price) / cp.competitor_price, 4)
            ELSE NULL
          END,
          match_confidence = v_res.match_confidence,
          matcher_version = v_res.matcher_version,
          match_metadata = jsonb_build_object('match_status', v_status, 'reason', split_part(v_res.matcher_version, ':', 3)),
          updated_at = now()
      WHERE cp.id = r.id;

      IF v_status = 'VERIFIED' THEN v_rematched := v_rematched + 1;
      ELSE v_unlinked := v_unlinked + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN QUERY SELECT v_processed, v_rematched, v_unlinked;
END;
$$;

-- The earlier bilingual batch matcher accepted two missing sizes and compared mass to volume
-- as if both were a single numeric weight. Replace it with the same conservative classifier.
DROP FUNCTION IF EXISTS public.rematch_unmatched_competitor_prices(uuid);
DROP FUNCTION IF EXISTS public.rematch_unmatched_competitor_prices(uuid, integer);
CREATE OR REPLACE FUNCTION public.rematch_unmatched_competitor_prices(
  p_store_id uuid DEFAULT NULL,
  p_batch_size integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  i record;
  v_status text;
  v_version text;
  v_matched integer := 0;
  v_processed integer := 0;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND (p_store_id IS NULL OR public.get_current_user_store_id() IS DISTINCT FROM p_store_id) THEN
    RAISE EXCEPTION 'not authorized for store' USING ERRCODE = '42501';
  END IF;
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'invalid batch size';
  END IF;

  FOR r IN
    SELECT cp.id, cp.store_id, cp.product_name, cp.competitor_price,
      cp.raw_data ->> 'barcode' AS scraped_barcode,
      cp.raw_data ->> 'brand' AS scraped_brand
    FROM public.competitor_prices cp
    WHERE cp.item_id IS NULL AND cp.scrape_status = 'success'
      AND (p_store_id IS NULL OR cp.store_id = p_store_id)
    ORDER BY cp.scraped_at DESC
    LIMIT p_batch_size
  LOOP
    v_processed := v_processed + 1;
    v_status := 'REJECTED';
    v_version := 'safe-v2:REJECTED:no-candidate';
    FOR i IN
      SELECT it.id, it.name, it.brand, it.barcode, it.price
      FROM public.items it
      WHERE it.tenant_id = (SELECT s.tenant_id FROM public.stores s WHERE s.id = r.store_id)
        AND it.is_active = true
      ORDER BY it.name
    LOOP
      v_status := public.classify_competitor_product_match(
        r.product_name, r.scraped_brand, r.scraped_barcode,
        i.name, i.brand, i.barcode, false
      );
      IF v_status = 'VERIFIED' THEN
        UPDATE public.competitor_prices cp
        SET item_id = i.id,
            our_price = i.price,
            price_gap_percent = CASE WHEN i.price IS NOT NULL AND r.competitor_price > 0
              THEN round((i.price - r.competitor_price) / r.competitor_price, 4) ELSE NULL END,
            match_confidence = 0.95000,
            matcher_version = 'safe-v2:VERIFIED:brand-variant-package-exact',
            match_metadata = jsonb_build_object('match_status', 'VERIFIED', 'reason', 'brand-variant-package-exact'),
            updated_at = now()
        WHERE cp.id = r.id;
        v_matched := v_matched + 1;
        v_version := 'safe-v2:VERIFIED:brand-variant-package-exact';
        EXIT;
      ELSIF v_status = 'PROBABLE' THEN
        v_version := 'safe-v2:PROBABLE:name-similar';
      ELSIF v_status = 'AMBIGUOUS' AND v_version = 'safe-v2:REJECTED:no-candidate' THEN
        v_version := 'safe-v2:AMBIGUOUS:attributes-incomplete';
      ELSIF v_status = 'REJECTED' THEN
        v_version := 'safe-v2:REJECTED:attribute-conflict';
      END IF;
    END LOOP;

    IF v_version NOT LIKE 'safe-v2:VERIFIED:%' THEN
      UPDATE public.competitor_prices cp
      SET item_id = NULL, our_price = NULL, price_gap_percent = NULL,
          match_confidence = CASE WHEN v_version LIKE 'safe-v2:PROBABLE:%' THEN 0.75000 ELSE NULL END,
          matcher_version = v_version,
          match_metadata = jsonb_build_object('match_status', split_part(v_version, ':', 2), 'reason', split_part(v_version, ':', 3)),
          updated_at = now()
      WHERE cp.id = r.id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('status', 'success', 'processed_count', v_processed, 'newly_matched_count', v_matched);
END;
$$;

-- Effective comparisons and alerts must only include verified auto matches. Active manual
-- overrides remain an explicit operator-provided mapping.
CREATE OR REPLACE FUNCTION public.get_effective_competitor_prices(
  p_store_id uuid,
  p_item_id uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid, competitor_key text, competitor_name text, competitor_price numeric,
  our_price numeric, price_gap_percent numeric, source text, is_override_active boolean,
  manual_override_reason text, manual_override_at timestamptz, observed_at timestamptz,
  competitor_product_url text, match_confidence numeric, matcher_version text, status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT cp.*, CASE WHEN cp.source = 'manual' AND cp.is_override_active THEN 0 ELSE 1 END AS source_rank
    FROM public.competitor_prices cp
    JOIN public.stores s ON s.id = cp.store_id
    JOIN public.items i ON i.id = cp.item_id AND i.tenant_id = s.tenant_id
    WHERE cp.store_id = p_store_id
      AND cp.item_id IS NOT NULL
      AND cp.competitor_price > 0
      AND cp.our_price > 0
      AND (p_item_id IS NULL OR cp.item_id = p_item_id)
      AND (
        (cp.source = 'manual' AND cp.is_override_active)
        OR (cp.matcher_version LIKE 'safe-v2:VERIFIED:%'
          OR cp.matcher_version = 'url-direct-user-v2')
      )
      AND public.classify_competitor_product_match(
        cp.product_name, cp.raw_data ->> 'brand', cp.raw_data ->> 'barcode',
        i.name, i.brand, i.barcode, true
      ) = 'VERIFIED'
      AND (
        (cp.source = 'manual' AND cp.is_override_active)
        OR (cp.source = 'scraper' AND cp.scrape_status = 'success'
          AND cp.scraped_at > now() - interval '30 days')
      )
  ), ranked AS (
    SELECT candidates.*, row_number() OVER (
      PARTITION BY candidates.item_id, candidates.competitor_key
      ORDER BY candidates.source_rank, candidates.scraped_at DESC, candidates.id DESC
    ) AS position
    FROM candidates
  )
  SELECT ranked.item_id, ranked.competitor_key, ranked.competitor_name,
    ranked.competitor_price, ranked.our_price, ranked.price_gap_percent,
    ranked.source, ranked.is_override_active, ranked.manual_override_reason,
    ranked.manual_override_at, ranked.scraped_at, ranked.competitor_product_url,
    ranked.match_confidence, ranked.matcher_version,
    CASE WHEN ranked.source = 'manual' THEN 'manual'
      WHEN ranked.scraped_at > now() - interval '8 days' THEN 'fresh' ELSE 'stale' END
  FROM ranked WHERE ranked.position = 1
  ORDER BY ranked.item_id, ranked.competitor_key;
END;
$$;

-- Preserve store authorization and keep the replaced functions unavailable to anon/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.match_competitor_price_item(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_competitor_price_item(uuid, text, text, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rematch_competitor_prices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematch_competitor_prices(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rematch_unmatched_competitor_prices(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematch_unmatched_competitor_prices(uuid, integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_effective_competitor_prices(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_competitor_prices(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.classify_competitor_product_match(text, text, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_competitor_product_match(text, text, text, text, text, text, boolean) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.extract_product_pack_signature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extract_product_pack_signature(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.extract_product_variant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extract_product_variant(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_valid_product_gtin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_product_gtin(text) TO authenticated, service_role;

-- User-driven links are independently verified, but hard attribute conflicts remain rejected.
DROP FUNCTION IF EXISTS public.link_competitor_price_item(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.link_competitor_price_item(uuid, uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.link_competitor_price_item(
  p_store_id uuid,
  p_price_record_id uuid,
  p_item_id uuid,
  p_competitor_product_url text DEFAULT NULL,
  p_confirmed_product_identity boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_item_price numeric;
  v_comp_price numeric;
  v_url text;
  v_observed_name text;
  v_observed_brand text;
  v_scraped_barcode text;
  v_catalog_name text;
  v_catalog_brand text;
  v_catalog_barcode text;
  v_status text;
  v_updated integer;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store' USING ERRCODE = '42501';
  END IF;

  SELECT i.price, i.name, i.brand, i.barcode
    INTO v_item_price, v_catalog_name, v_catalog_brand, v_catalog_barcode
  FROM public.items i
  WHERE i.id = p_item_id
    AND i.tenant_id = (SELECT s.tenant_id FROM public.stores s WHERE s.id = p_store_id);
  IF v_catalog_name IS NULL OR v_item_price IS NULL THEN RAISE EXCEPTION 'item not found for store'; END IF;

  SELECT cp.competitor_price, cp.competitor_product_url, cp.product_name,
      cp.raw_data ->> 'barcode', cp.raw_data ->> 'brand'
    INTO v_comp_price, v_url, v_observed_name, v_scraped_barcode, v_observed_brand
  FROM public.competitor_prices cp WHERE cp.id = p_price_record_id AND cp.store_id = p_store_id;
  IF v_comp_price IS NULL THEN RAISE EXCEPTION 'competitor price record not found for store'; END IF;

  v_status := public.classify_competitor_product_match(
    v_observed_name, v_observed_brand, v_scraped_barcode,
    v_catalog_name, v_catalog_brand, v_catalog_barcode, false
  );
  IF v_status = 'REJECTED' THEN RAISE EXCEPTION 'product attributes conflict'; END IF;
  IF v_status <> 'VERIFIED' AND NOT p_confirmed_product_identity THEN
    RAISE EXCEPTION 'product identity confirmation required';
  END IF;

  UPDATE public.competitor_prices cp
  SET item_id = p_item_id,
      our_price = v_item_price,
      price_gap_percent = CASE WHEN v_comp_price > 0 THEN round((v_item_price - v_comp_price) / v_comp_price, 4) ELSE NULL END,
      competitor_product_url = COALESCE(NULLIF(trim(p_competitor_product_url), ''), v_url),
      match_confidence = 1.00000,
      matcher_version = CASE WHEN p_confirmed_product_identity
        THEN 'safe-v2:VERIFIED:user-confirmed' ELSE 'safe-v2:VERIFIED:attribute-exact' END,
      match_metadata = jsonb_build_object('match_status', 'VERIFIED',
        'verification_source', CASE WHEN p_confirmed_product_identity THEN 'user-confirmed' ELSE 'attribute-exact' END,
        'verified_at', now()),
      updated_at = now()
  WHERE cp.id = p_price_record_id AND cp.store_id = p_store_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_competitor_price_item(uuid, uuid, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_competitor_price_item(uuid, uuid, uuid, text, boolean) TO authenticated, service_role;
