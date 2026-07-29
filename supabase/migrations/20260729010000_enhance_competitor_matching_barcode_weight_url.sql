-- Migration: 20260729010000_enhance_competitor_matching_barcode_weight_url.sql
-- Description: Implement Barcode/EAN-13 matching, URL direct mapping, and strict package weight validation.

-- ---------------------------------------------------------------------------
-- 1. Indexing for fast Barcode & Competitor URL lookups
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_items_barcode
  ON public.items (barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_competitor_prices_url_item
  ON public.competitor_prices (competitor_product_url, item_id)
  WHERE competitor_product_url IS NOT NULL AND item_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Weight / Volume extraction helper function
-- Extracts normalized string (e.g. '200g', '523g', '1kg', '500ml', '1l')
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.extract_package_quantity(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_normalized text;
  v_match text[];
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN
    RETURN NULL;
  END IF;

  v_normalized := lower(p_text);

  -- Regex pattern matching numbers followed by units: g, gm, gram, grams, kg, ml, l, ltr, liter, litre, pcs, pc
  v_match := regexp_matches(
    v_normalized,
    '(\d+(?:\.\d+)?)\s*(gm|g|grams|gram|kg|kilo|ml|l|ltr|liter|litre|pcs|pc)\b',
    'i'
  );

  IF v_match IS NULL OR array_length(v_match, 1) < 2 THEN
    RETURN NULL;
  END IF;

  -- Normalize unit to canonical form (g, kg, ml, l, pcs)
  DECLARE
    v_num numeric := v_match[1]::numeric;
    v_unit text := v_match[2];
  BEGIN
    CASE v_unit
      WHEN 'gm', 'gram', 'grams' THEN v_unit := 'g';
      WHEN 'kilo' THEN v_unit := 'kg';
      WHEN 'ltr', 'liter', 'litre' THEN v_unit := 'l';
      WHEN 'pc' THEN v_unit := 'pcs';
      ELSE NULL;
    END CASE;

    -- Convert kg -> g or l -> ml for standard numeric comparison
    IF v_unit = 'kg' THEN
      v_num := v_num * 1000;
      v_unit := 'g';
    ELSIF v_unit = 'l' THEN
      v_num := v_num * 1000;
      v_unit := 'ml';
    END IF;

    RETURN v_num::text || v_unit;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Smart Matcher Function: Barcode -> URL Direct -> SKU -> Strict Weight + Title
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_competitor_price_item(
  p_store_id uuid,
  p_scraped_product_name text,
  p_scraped_barcode text DEFAULT NULL,
  p_scraped_url text DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  match_confidence numeric(6,5),
  matcher_version text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_matched_item_id uuid;
  v_confidence numeric(6,5);
  v_version text;
  v_scraped_weight text;
  v_candidate_weight text;
BEGIN
  -- Extract package weight token from scraped product name
  v_scraped_weight := public.extract_package_quantity(p_scraped_product_name);

  -- Priority 1: Direct Competitor URL Mapping (Admin assigned)
  IF p_scraped_url IS NOT NULL AND trim(p_scraped_url) <> '' THEN
    SELECT cp.item_id INTO v_matched_item_id
    FROM public.competitor_prices cp
    WHERE cp.store_id = p_store_id
      AND cp.competitor_product_url = trim(p_scraped_url)
      AND cp.item_id IS NOT NULL
      AND (cp.is_override_active OR cp.source = 'manual')
    ORDER BY cp.created_at DESC
    LIMIT 1;

    IF v_matched_item_id IS NOT NULL THEN
      RETURN QUERY SELECT v_matched_item_id, 1.00000::numeric(6,5), 'url-direct'::text;
      RETURN;
    END IF;
  END IF;

  -- Priority 2: Exact Barcode / EAN-13 Match
  IF p_scraped_barcode IS NOT NULL AND trim(p_scraped_barcode) <> '' THEN
    SELECT i.id INTO v_matched_item_id
    FROM public.items i
    WHERE i.store_id = p_store_id
      AND i.is_active = true
      AND i.barcode = trim(p_scraped_barcode)
    LIMIT 1;

    IF v_matched_item_id IS NOT NULL THEN
      RETURN QUERY SELECT v_matched_item_id, 1.00000::numeric(6,5), 'barcode-exact'::text;
      RETURN;
    END IF;
  END IF;

  -- Priority 3: Exact SKU Match
  SELECT i.id INTO v_matched_item_id
  FROM public.items i
  WHERE i.store_id = p_store_id
    AND i.is_active = true
    AND (
      lower(i.sku) = lower(trim(p_scraped_product_name))
      OR (p_scraped_barcode IS NOT NULL AND lower(i.sku) = lower(trim(p_scraped_barcode)))
    )
  LIMIT 1;

  IF v_matched_item_id IS NOT NULL THEN
    RETURN QUERY SELECT v_matched_item_id, 1.00000::numeric(6,5), 'sku-exact'::text;
    RETURN;
  END IF;

  -- Priority 4: High Confidence Name + Strict Package Weight Validation
  IF p_scraped_product_name IS NOT NULL AND trim(p_scraped_product_name) <> '' THEN
    FOR v_matched_item_id, v_candidate_weight IN
      SELECT i.id, public.extract_package_quantity(i.name)
      FROM public.items i
      WHERE i.store_id = p_store_id
        AND i.is_active = true
        AND (
          lower(i.name) LIKE '%' || lower(trim(p_scraped_product_name)) || '%'
          OR lower(trim(p_scraped_product_name)) LIKE '%' || lower(i.name) || '%'
        )
      ORDER BY length(i.name) ASC
    LOOP
      -- Strict Package Weight Check: If both titles have weight tokens, they MUST match!
      IF v_scraped_weight IS NOT NULL AND v_candidate_weight IS NOT NULL THEN
        IF v_scraped_weight = v_candidate_weight THEN
          RETURN QUERY SELECT v_matched_item_id, 0.95000::numeric(6,5), 'weight-name-exact'::text;
          RETURN;
        END IF;
        -- Package weights conflict (e.g. 40g vs 523g) -> SKIP THIS CANDIDATE
      ELSIF v_scraped_weight IS NULL AND v_candidate_weight IS NULL THEN
        RETURN QUERY SELECT v_matched_item_id, 0.85000::numeric(6,5), 'name-fuzzy'::text;
        RETURN;
      END IF;
    END LOOP;
  END IF;

  -- No valid match
  RETURN QUERY SELECT NULL::uuid, NULL::numeric(6,5), 'none'::text;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Batch Catalog Rematch Procedure
-- Fixes existing false matches and applies barcode/weight rules across competitor_prices
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rematch_competitor_prices(p_store_id uuid)
RETURNS TABLE (
  total_processed integer,
  rematched_count integer,
  unlinked_false_matches integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_processed integer := 0;
  v_rematched integer := 0;
  v_unlinked integer := 0;
  r RECORD;
  v_res RECORD;
  v_our_price numeric;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT cp.id, cp.product_name, cp.competitor_product_url, cp.item_id, cp.source
    FROM public.competitor_prices cp
    WHERE cp.store_id = p_store_id
      AND cp.source = 'scraper'
  LOOP
    v_processed := v_processed + 1;

    -- Run smart matcher
    SELECT * INTO v_res
    FROM public.match_competitor_price_item(
      p_store_id,
      r.product_name,
      NULL,
      r.competitor_product_url
    );

    IF v_res.item_id IS DISTINCT FROM r.item_id THEN
      IF v_res.item_id IS NOT NULL THEN
        -- Fetch current item selling price
        SELECT selling_price INTO v_our_price
        FROM public.items WHERE id = v_res.item_id;

        UPDATE public.competitor_prices
        SET
          item_id = v_res.item_id,
          our_price = v_our_price,
          price_gap_percent = CASE
            WHEN v_our_price IS NOT NULL AND competitor_price > 0
              THEN round((v_our_price - competitor_price) / competitor_price, 4)
            ELSE NULL
          END,
          match_confidence = v_res.match_confidence,
          matcher_version = v_res.matcher_version,
          updated_at = now()
        WHERE id = r.id;

        v_rematched := v_rematched + 1;
      ELSE
        -- Unlink false match
        UPDATE public.competitor_prices
        SET
          item_id = NULL,
          our_price = NULL,
          price_gap_percent = NULL,
          match_confidence = NULL,
          matcher_version = 'unlinked-weight-mismatch',
          updated_at = now()
        WHERE id = r.id;

        v_unlinked := v_unlinked + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_rematched, v_unlinked;
END;
$$;
