-- Migration: 20261018222800_enhance_bilingual_competitor_matcher.sql
-- Description: Bilingual synonym dictionary, strict weight parsing, and automated rematching for competitor prices.

-- 1. Helper: extract numeric quantity in grams/ml/pcs
CREATE OR REPLACE FUNCTION public.extract_package_quantity_numeric(p_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text[];
  u text;
  n numeric;
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN RETURN NULL; END IF;
  m := regexp_matches(lower(p_text), '([0-9]+(?:\.[0-9]+)?)\s*(kg|kilo|gm|g|grams|gram|ml|l|ltr|liter|litre|pcs|pc)\M', 'i');
  IF m IS NULL OR array_length(m, 1) < 2 THEN RETURN NULL; END IF;
  n := m[1]::numeric;
  u := m[2];
  IF u IN ('kg', 'kilo', 'l', 'ltr', 'liter', 'litre') THEN
    RETURN n * 1000;
  ELSE
    RETURN n;
  END IF;
END;
$$;

-- 2. Helper: bilingual synonym & filler adjective normalization
CREATE OR REPLACE FUNCTION public.normalize_bilingual_product_name(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  w text;
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN RETURN ''; END IF;
  w := lower(p_text);
  w := regexp_replace(w, '[(),/\-_+]+', ' ', 'g');
  w := regexp_replace(w, '\m(turmeric|holud)\M', 'holud', 'g');
  w := regexp_replace(w, '\m(chilli|chili|morich)\M', 'morich', 'g');
  w := regexp_replace(w, '\m(cumin|jeera|jira)\M', 'jira', 'g');
  w := regexp_replace(w, '\m(coriander|dhania|dhonia)\M', 'dhonia', 'g');
  w := regexp_replace(w, '\m(mustard|sorisha|shorisha)\M', 'shorisha', 'g');
  w := regexp_replace(w, '\m(gura|powder|gora)\M', 'gura', 'g');
  w := regexp_replace(w, '\m(oil|tel)\M', 'tel', 'g');
  w := regexp_replace(w, '\m(salt|lobon|laban)\M', 'lobon', 'g');
  w := regexp_replace(w, '\m(sugar|chini)\M', 'chini', 'g');
  w := regexp_replace(w, '\m(flour|atta|maida)\M', 'atta', 'g');
  w := regexp_replace(w, '\m(rice|chal|chawl)\M', 'rice', 'g');
  w := regexp_replace(w, '\m(classic|premium|special|original|pure|aromatic|fresh|delicious|rich|natural|best|quality)\M', '', 'g');
  w := regexp_replace(w, '\s+', ' ', 'g');
  RETURN trim(w);
END;
$$;

-- 3. Procedure: batch rematch unmatched competitor prices
CREATE OR REPLACE FUNCTION public.rematch_unmatched_competitor_prices(p_store_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_matched_count integer := 0;
BEGIN
  WITH our_items AS (
    SELECT 
      id, 
      name, 
      price, 
      lower(trim(coalesce(nullif(brand, ''), split_part(trim(name), ' ', 1)))) AS brand,
      public.extract_package_quantity_numeric(name) AS weight,
      public.normalize_bilingual_product_name(name) AS norm_name
    FROM public.items
    WHERE is_active = true
  ),
  unmatched AS (
    SELECT 
      id, 
      store_id,
      competitor_name,
      product_name, 
      competitor_price, 
      scraped_at,
      public.extract_package_quantity_numeric(product_name) AS weight,
      public.normalize_bilingual_product_name(product_name) AS norm_name
    FROM public.competitor_prices
    WHERE item_id IS NULL 
      AND scrape_status = 'success'
      AND (p_store_id IS NULL OR store_id = p_store_id)
  ),
  candidates AS (
    SELECT 
      u.id AS competitor_price_id,
      u.store_id,
      u.competitor_name,
      u.competitor_price,
      oi.id AS item_id,
      oi.price AS our_price,
      u.scraped_at,
      row_number() OVER (
        PARTITION BY u.store_id, oi.id, u.competitor_name
        ORDER BY u.scraped_at DESC, abs(u.competitor_price - oi.price) ASC
      ) AS rnk
    FROM unmatched u
    JOIN our_items oi
      ON (length(oi.brand) >= 3 AND u.norm_name ~ ('\m' || oi.brand || '\M'))
      AND (
        (u.weight IS NOT NULL AND oi.weight IS NOT NULL AND u.weight = oi.weight)
        OR (u.weight IS NULL AND oi.weight IS NULL)
      )
      AND (
        u.norm_name LIKE '%' || split_part(oi.norm_name, ' ', 1) || '%'
        AND u.norm_name LIKE '%' || split_part(oi.norm_name, ' ', 2) || '%'
      )
      AND (
        oi.price > 0 AND u.competitor_price > 0 
        AND (u.competitor_price / oi.price) BETWEEN 0.25 AND 4.0
      )
  ),
  winning_matches AS (
    SELECT c.*
    FROM candidates c
    WHERE c.rnk = 1
      AND NOT EXISTS (
        SELECT 1 FROM public.competitor_prices cp
        WHERE cp.store_id = c.store_id 
          AND cp.item_id = c.item_id 
          AND cp.competitor_name = c.competitor_name
      )
  ),
  applied_updates AS (
    UPDATE public.competitor_prices cp
    SET 
      item_id = wm.item_id,
      our_price = wm.our_price,
      price_gap_percent = CASE 
        WHEN wm.our_price > 0 
          THEN round((cp.competitor_price - wm.our_price) / wm.our_price * 100.0, 2)
        ELSE NULL 
      END,
      match_confidence = 0.90000,
      matcher_version = 'bilingual-strict-weight-v1',
      updated_at = now()
    FROM winning_matches wm
    WHERE cp.id = wm.competitor_price_id
    RETURNING cp.id
  )
  SELECT count(*)::integer INTO v_matched_count FROM applied_updates;

  RETURN jsonb_build_object(
    'status', 'success',
    'newly_matched_count', v_matched_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.extract_package_quantity_numeric(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_bilingual_product_name(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rematch_unmatched_competitor_prices(uuid) TO authenticated, service_role;
