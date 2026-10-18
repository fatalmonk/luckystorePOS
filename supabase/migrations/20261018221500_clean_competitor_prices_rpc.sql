-- Autocleaning RPC for public.competitor_prices
-- Normalizes URLs, backfills SKUs from catalog items, fills observation keys,
-- deduplicates observation keys, and flags price outlier divergences.

CREATE OR REPLACE FUNCTION public.clean_competitor_prices(p_store_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_case_dupes_count integer := 0;
  v_normalized_urls_count integer := 0;
  v_backfilled_skus_count integer := 0;
  v_backfilled_keys_count integer := 0;
  v_deduplicated_count integer := 0;
  v_outliers_flagged_count integer := 0;
BEGIN
  -- 0. Resolve case collisions on (store_id, item_id, lower(trim(competitor_name))) before normalizing name
  -- to avoid violating competitor_prices_store_product_competitor_uk
  WITH case_dupes AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY store_id, item_id, lower(trim(competitor_name))
             ORDER BY scraped_at DESC, id DESC
           ) AS rnk
    FROM public.competitor_prices
    WHERE item_id IS NOT NULL
      AND (p_store_id IS NULL OR store_id = p_store_id)
  ),
  deleted_case_dupes AS (
    DELETE FROM public.competitor_prices
    WHERE id IN (SELECT id FROM case_dupes WHERE rnk > 1)
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_case_dupes_count FROM deleted_case_dupes;

  -- 1. Normalize competitor names & strip URL query/tracking parameters
  WITH updated_urls AS (
    UPDATE public.competitor_prices
    SET 
      competitor_name = lower(trim(competitor_name)),
      competitor_product_url = rtrim(regexp_replace(competitor_product_url, '\?.*$', ''), '/')
    WHERE (p_store_id IS NULL OR store_id = p_store_id)
      AND (
        competitor_product_url ~ '\?'
        OR competitor_name <> lower(trim(competitor_name))
        OR competitor_product_url LIKE '%/'
      )
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_normalized_urls_count FROM updated_urls;

  -- 2. Backfill missing product_sku from items catalog
  WITH backfilled_skus AS (
    UPDATE public.competitor_prices cp
    SET product_sku = i.barcode
    FROM public.items i
    WHERE cp.item_id = i.id
      AND (p_store_id IS NULL OR cp.store_id = p_store_id)
      AND (cp.product_sku IS NULL OR trim(cp.product_sku) = '')
      AND i.barcode IS NOT NULL
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_backfilled_skus_count FROM backfilled_skus;

  -- 3. Backfill observation_key where missing
  WITH backfilled_keys AS (
    UPDATE public.competitor_prices
    SET observation_key = coalesce(
      scrape_batch_id::text, 
      to_char(scraped_at, 'YYYYMMDD')
    ) || '::' || competitor_name || '::' || coalesce(competitor_product_id, regexp_replace(lower(product_name), '[^a-z0-9]+', '-', 'g')) || '::' || store_id
    WHERE (p_store_id IS NULL OR store_id = p_store_id)
      AND observation_key IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_backfilled_keys_count FROM backfilled_keys;

  -- 4. Deduplicate: Prune duplicate observation keys, retaining latest scrape
  WITH ranked_observations AS (
    SELECT 
      id,
      row_number() OVER (
        PARTITION BY observation_key 
        ORDER BY scraped_at DESC, coalesce(match_confidence, 0) DESC, updated_at DESC
      ) AS rnk
    FROM public.competitor_prices
    WHERE (p_store_id IS NULL OR store_id = p_store_id)
      AND observation_key IS NOT NULL
  ),
  deleted_dupes AS (
    DELETE FROM public.competitor_prices
    WHERE id IN (
      SELECT id FROM ranked_observations WHERE rnk > 1
    )
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_deduplicated_count FROM deleted_dupes;

  -- 5. Outlier Detection: Unlink matches with extreme price divergence (>4x or <0.25x)
  WITH flagged_outliers AS (
    UPDATE public.competitor_prices
    SET 
      item_id = NULL,
      match_confidence = 0,
      scrape_status = 'outlier_divergence',
      raw_data = jsonb_set(
        coalesce(raw_data, '{}'::jsonb),
        '{outlier_flag}',
        jsonb_build_object(
          'reason', 'Price divergence exceeds 4x threshold',
          'our_price', our_price,
          'competitor_price', competitor_price,
          'flagged_at', now()
        )
      )
    WHERE (p_store_id IS NULL OR store_id = p_store_id)
      AND item_id IS NOT NULL 
      AND our_price > 0 
      AND competitor_price > 0
      AND (competitor_price / our_price > 4.0 OR competitor_price / our_price < 0.25)
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_outliers_flagged_count FROM flagged_outliers;

  RETURN jsonb_build_object(
    'status', 'success',
    'case_dupes_pruned', v_case_dupes_count,
    'normalized_urls_count', v_normalized_urls_count,
    'backfilled_skus_count', v_backfilled_skus_count,
    'backfilled_keys_count', v_backfilled_keys_count,
    'deduplicated_count', v_deduplicated_count,
    'outliers_flagged_count', v_outliers_flagged_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clean_competitor_prices(uuid) TO authenticated, service_role;
