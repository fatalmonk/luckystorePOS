-- Competitor pricing convergence and secure ingestion.
-- Forward-only: historical migrations remain unchanged.

-- ---------------------------------------------------------------------------
-- Schema convergence. The 20260514 migration recreated competitor_prices with
-- product_id; copy that data before removing the legacy column. item_id remains
-- nullable so unmatched scraper observations remain auditable.
-- ---------------------------------------------------------------------------

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS item_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitor_prices'
      AND column_name = 'product_id'
  ) THEN
    EXECUTE '
      UPDATE public.competitor_prices
      SET item_id = product_id
      WHERE item_id IS NULL
        AND product_id IS NOT NULL
    ';
  END IF;
END;
$$;

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_item_id_fkey;

ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;

ALTER TABLE public.competitor_prices
  DROP COLUMN IF EXISTS product_id;

DROP INDEX IF EXISTS public.idx_competitor_prices_product_id;
DROP INDEX IF EXISTS public.idx_competitor_prices_store_product_scraped;

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS competitor_key text,
  ADD COLUMN IF NOT EXISTS is_override_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override_reason text,
  ADD COLUMN IF NOT EXISTS manual_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_override_cleared_at timestamptz,
  ADD COLUMN IF NOT EXISTS observation_key text,
  ADD COLUMN IF NOT EXISTS match_confidence numeric(6,5),
  ADD COLUMN IF NOT EXISTS matcher_version text,
  ADD COLUMN IF NOT EXISTS match_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.competitor_prices
SET
  competitor_key = regexp_replace(lower(trim(competitor_name)), '[^a-z0-9]+', '-', 'g'),
  source = CASE
    -- The legacy admin form wrote an empty product_name and no raw payload.
    WHEN product_name = '' AND raw_data IS NULL AND error_message IS NULL
      THEN 'manual'
    ELSE 'scraper'
  END,
  is_override_active = (
    product_name = '' AND raw_data IS NULL AND error_message IS NULL
  ),
  manual_override_at = CASE
    WHEN product_name = '' AND raw_data IS NULL AND error_message IS NULL
      THEN COALESCE(updated_at, created_at, scraped_at)
    ELSE NULL
  END,
  matcher_version = CASE
    WHEN product_name = '' AND raw_data IS NULL AND error_message IS NULL
      THEN 'manual'
    ELSE 'legacy-v0'
  END
WHERE competitor_key IS NULL
   OR source IS NULL
   OR matcher_version IS NULL;

-- If legacy manual rows collide, retain the newest active row and preserve the
-- rest as inactive manual history.
WITH ranked_manual AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY store_id, item_id, competitor_key
      ORDER BY COALESCE(manual_override_at, updated_at, created_at, scraped_at) DESC, id DESC
    ) AS position
  FROM public.competitor_prices
  WHERE source = 'manual'
    AND is_override_active
)
UPDATE public.competitor_prices AS cp
SET
  is_override_active = false,
  manual_override_cleared_at = COALESCE(cp.updated_at, cp.created_at, cp.scraped_at)
FROM ranked_manual AS ranked
WHERE cp.id = ranked.id
  AND ranked.position > 1;

ALTER TABLE public.competitor_prices
  ALTER COLUMN source SET DEFAULT 'scraper',
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN competitor_key SET NOT NULL,
  ALTER COLUMN matcher_version SET NOT NULL;

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_source_check;
ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_source_check
  CHECK (source IN ('manual', 'scraper'));

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_match_confidence_check;
ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_match_confidence_check
  CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 1);

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_manual_state_check;
ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_manual_state_check
  CHECK (
    (source = 'manual')
    OR (
      is_override_active = false
      AND manual_override_reason IS NULL
      AND manual_override_at IS NULL
      AND manual_override_cleared_at IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.competitor_scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  competitor text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  inserted_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_key, competitor, store_id)
);

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS scrape_run_id uuid;

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_scrape_run_id_fkey;
ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_scrape_run_id_fkey
  FOREIGN KEY (scrape_run_id)
  REFERENCES public.competitor_scrape_runs(id)
  ON DELETE SET NULL;

DROP INDEX IF EXISTS public.competitor_prices_manual_override_uniq;
CREATE UNIQUE INDEX competitor_prices_active_override_uniq
  ON public.competitor_prices (store_id, item_id, competitor_key)
  WHERE source = 'manual' AND is_override_active;

DROP INDEX IF EXISTS public.competitor_prices_observation_key_uniq;
CREATE UNIQUE INDEX competitor_prices_observation_key_uniq
  ON public.competitor_prices (observation_key)
  WHERE observation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_prices_effective
  ON public.competitor_prices (store_id, item_id, competitor_key, scraped_at DESC)
  WHERE source = 'scraper' AND scrape_status = 'success';

CREATE INDEX IF NOT EXISTS idx_competitor_prices_scrape_run
  ON public.competitor_prices (scrape_run_id)
  WHERE scrape_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_scrape_runs_lookup
  ON public.competitor_scrape_runs (store_id, competitor, scheduled_at DESC);

DROP TRIGGER IF EXISTS trg_cleanup_competitor_prices ON public.competitor_prices;
DROP FUNCTION IF EXISTS public.trigger_cleanup_competitor_prices();
DROP FUNCTION IF EXISTS public.cleanup_old_competitor_prices();
DROP FUNCTION IF EXISTS public.cleanup_old_competitor_prices(integer);

CREATE FUNCTION public.cleanup_old_competitor_prices(
  p_retention_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_retention_days < 1 THEN
    RAISE EXCEPTION 'retention days must be positive';
  END IF;

  DELETE FROM public.competitor_prices
  WHERE source = 'scraper'
    AND scraped_at < now() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ---------------------------------------------------------------------------
-- Manual overrides. These functions intentionally use SECURITY DEFINER because
-- authenticated clients have read-only table privileges. Every function checks
-- store authorization and uses an empty search_path.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.set_manual_competitor_price(
  uuid, uuid, text, text, numeric, text, text
);

CREATE FUNCTION public.set_manual_competitor_price(
  p_store_id uuid,
  p_item_id uuid,
  p_competitor_key text,
  p_competitor_name text,
  p_price numeric,
  p_reason text DEFAULT NULL,
  p_competitor_product_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_item_name text;
  v_item_price numeric;
  v_key text;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'price must be positive';
  END IF;

  v_key := regexp_replace(lower(trim(p_competitor_key)), '[^a-z0-9]+', '-', 'g');
  IF v_key = '' OR trim(p_competitor_name) = '' THEN
    RAISE EXCEPTION 'competitor key and name are required';
  END IF;

  SELECT i.name, i.price
  INTO v_item_name, v_item_price
  FROM public.items AS i
  JOIN public.stores AS s
    ON s.id = p_store_id
   AND s.tenant_id = i.tenant_id
  WHERE i.id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item does not belong to store'
      USING ERRCODE = '23503';
  END IF;

  UPDATE public.competitor_prices
  SET
    is_override_active = false,
    manual_override_cleared_at = now(),
    updated_at = now()
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND competitor_key = v_key
    AND source = 'manual'
    AND is_override_active;

  INSERT INTO public.competitor_prices (
    store_id,
    item_id,
    product_name,
    competitor_name,
    competitor_key,
    competitor_product_url,
    competitor_price,
    currency,
    our_price,
    price_gap_percent,
    scraped_at,
    scrape_status,
    source,
    is_override_active,
    manual_override_reason,
    manual_override_at,
    matcher_version,
    raw_data
  )
  VALUES (
    p_store_id,
    p_item_id,
    v_item_name,
    trim(p_competitor_name),
    v_key,
    p_competitor_product_url,
    p_price,
    'BDT',
    v_item_price,
    CASE
      WHEN v_item_price IS NOT NULL
        THEN round((v_item_price - p_price) / NULLIF(p_price, 0), 4)
      ELSE NULL
    END,
    now(),
    'success',
    'manual',
    true,
    NULLIF(trim(p_reason), ''),
    now(),
    'manual',
    '{}'::jsonb
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.clear_manual_competitor_price(uuid, uuid, text);

CREATE FUNCTION public.clear_manual_competitor_price(
  p_store_id uuid,
  p_item_id uuid,
  p_competitor_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.competitor_prices
  SET
    is_override_active = false,
    manual_override_cleared_at = now(),
    updated_at = now()
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND competitor_key = regexp_replace(lower(trim(p_competitor_key)), '[^a-z0-9]+', '-', 'g')
    AND source = 'manual'
    AND is_override_active;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

DROP FUNCTION IF EXISTS public.get_effective_competitor_prices(uuid, uuid);

CREATE FUNCTION public.get_effective_competitor_prices(
  p_store_id uuid,
  p_item_id uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  competitor_key text,
  competitor_name text,
  competitor_price numeric,
  our_price numeric,
  price_gap_percent numeric,
  source text,
  is_override_active boolean,
  manual_override_reason text,
  manual_override_at timestamptz,
  observed_at timestamptz,
  competitor_product_url text,
  match_confidence numeric,
  matcher_version text,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.*,
      CASE
        WHEN cp.source = 'manual' AND cp.is_override_active THEN 0
        ELSE 1
      END AS source_rank
    FROM public.competitor_prices AS cp
    WHERE cp.store_id = p_store_id
      AND cp.item_id IS NOT NULL
      AND (p_item_id IS NULL OR cp.item_id = p_item_id)
      AND (
        (cp.source = 'manual' AND cp.is_override_active)
        OR (
          cp.source = 'scraper'
          AND cp.scrape_status = 'success'
          AND cp.scraped_at > now() - interval '30 days'
        )
      )
  ),
  ranked AS (
    SELECT
      candidates.*,
      row_number() OVER (
        PARTITION BY candidates.item_id, candidates.competitor_key
        ORDER BY candidates.source_rank, candidates.scraped_at DESC, candidates.id DESC
      ) AS position
    FROM candidates
  )
  SELECT
    ranked.item_id,
    ranked.competitor_key,
    ranked.competitor_name,
    ranked.competitor_price,
    ranked.our_price,
    ranked.price_gap_percent,
    ranked.source,
    ranked.is_override_active,
    ranked.manual_override_reason,
    ranked.manual_override_at,
    ranked.scraped_at,
    ranked.competitor_product_url,
    ranked.match_confidence,
    ranked.matcher_version,
    CASE
      WHEN ranked.source = 'manual' THEN 'manual'
      WHEN ranked.scraped_at > now() - interval '8 days' THEN 'fresh'
      ELSE 'stale'
    END
  FROM ranked
  WHERE ranked.position = 1
  ORDER BY ranked.item_id, ranked.competitor_key;
END;
$$;

-- ---------------------------------------------------------------------------
-- Frozen service-role ingestion contract.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ingest_competitor_scrape_batch(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.ingest_competitor_scrape_batch(
  text, timestamptz, text, uuid, jsonb, jsonb
);

CREATE FUNCTION public.ingest_competitor_scrape_batch(
  p_run_key text,
  p_scheduled_at timestamptz,
  p_competitor text,
  p_store_id uuid,
  p_observations jsonb,
  p_summary jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run_id uuid;
  v_observation jsonb;
  v_item_id uuid;
  v_item_name text;
  v_our_price numeric;
  v_competitor_price numeric;
  v_original_price numeric;
  v_match_confidence numeric;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_rejected integer := 0;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role required'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_run_key), '') IS NULL
     OR NULLIF(trim(p_competitor), '') IS NULL
     OR p_scheduled_at IS NULL
     OR jsonb_typeof(p_observations) <> 'array' THEN
    RAISE EXCEPTION 'invalid ingestion batch';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'store not found'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.competitor_scrape_runs (
    run_key, scheduled_at, competitor, store_id, summary
  )
  VALUES (
    p_run_key, p_scheduled_at, lower(trim(p_competitor)), p_store_id,
    COALESCE(p_summary, '{}'::jsonb)
  )
  ON CONFLICT (run_key, competitor, store_id)
  DO UPDATE SET
    scheduled_at = EXCLUDED.scheduled_at,
    summary = EXCLUDED.summary,
    updated_at = now()
  RETURNING id INTO v_run_id;

  FOR v_observation IN
    SELECT value FROM jsonb_array_elements(p_observations)
  LOOP
    BEGIN
      IF NULLIF(trim(v_observation ->> 'observation_key'), '') IS NULL
         OR NULLIF(trim(v_observation ->> 'product_name'), '') IS NULL
         OR NULLIF(trim(v_observation ->> 'matcher_version'), '') IS NULL
         OR COALESCE(v_observation ->> 'currency', '') <> 'BDT' THEN
        RAISE EXCEPTION 'required observation field missing';
      END IF;

      v_competitor_price := (v_observation ->> 'competitor_price')::numeric;
      v_original_price := NULLIF(v_observation ->> 'competitor_original_price', '')::numeric;
      v_match_confidence := NULLIF(v_observation ->> 'match_confidence', '')::numeric;
      v_item_id := NULLIF(v_observation ->> 'item_id', '')::uuid;

      IF v_competitor_price <= 0
         OR (v_original_price IS NOT NULL AND v_original_price <= 0)
         OR (v_match_confidence IS NOT NULL AND (v_match_confidence < 0 OR v_match_confidence > 1)) THEN
        RAISE EXCEPTION 'invalid observation value';
      END IF;

      v_item_name := NULL;
      v_our_price := NULL;

      IF v_item_id IS NOT NULL THEN
        SELECT i.name, i.price
        INTO v_item_name, v_our_price
        FROM public.items AS i
        JOIN public.stores AS s
          ON s.id = p_store_id
         AND s.tenant_id = i.tenant_id
        WHERE i.id = v_item_id;

        IF NOT FOUND THEN
          v_rejected := v_rejected + 1;
          CONTINUE;
        END IF;
      END IF;

      INSERT INTO public.competitor_prices (
        store_id,
        item_id,
        product_name,
        competitor_name,
        competitor_key,
        competitor_product_id,
        competitor_product_url,
        competitor_price,
        competitor_original_price,
        currency,
        our_price,
        price_gap_percent,
        scraped_at,
        scrape_status,
        raw_data,
        source,
        is_override_active,
        observation_key,
        scrape_run_id,
        match_confidence,
        matcher_version,
        match_metadata
      )
      VALUES (
        p_store_id,
        v_item_id,
        v_observation ->> 'product_name',
        trim(p_competitor),
        lower(trim(p_competitor)),
        NULLIF(v_observation ->> 'competitor_product_id', ''),
        NULLIF(v_observation ->> 'competitor_product_url', ''),
        v_competitor_price,
        v_original_price,
        'BDT',
        v_our_price,
        CASE
          WHEN v_our_price IS NOT NULL
            THEN round((v_our_price - v_competitor_price) / NULLIF(v_competitor_price, 0), 4)
          ELSE NULL
        END,
        (v_observation ->> 'scraped_at')::timestamptz,
        'success',
        COALESCE(v_observation -> 'raw_data', '{}'::jsonb),
        'scraper',
        false,
        v_observation ->> 'observation_key',
        v_run_id,
        v_match_confidence,
        v_observation ->> 'matcher_version',
        jsonb_build_object(
          'matched_item_name', v_item_name,
          'run_key', p_run_key
        )
      )
      ON CONFLICT (observation_key) WHERE observation_key IS NOT NULL
      DO NOTHING;

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_duplicates := v_duplicates + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_rejected := v_rejected + 1;
    END;
  END LOOP;

  UPDATE public.competitor_scrape_runs
  SET
    inserted_count = inserted_count + v_inserted,
    duplicate_count = duplicate_count + v_duplicates,
    rejected_count = rejected_count + v_rejected,
    updated_at = now()
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id::text,
    'inserted', v_inserted,
    'duplicates', v_duplicates,
    'rejected', v_rejected
  );
END;
$$;

-- Price alerts use only effective manual/fresh prices.
DROP FUNCTION IF EXISTS public.check_price_alerts(uuid, numeric);

CREATE FUNCTION public.check_price_alerts(
  p_store_id uuid,
  p_threshold numeric DEFAULT 0.15
)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  our_price numeric,
  market_avg_price numeric,
  price_gap_percent numeric,
  competitors jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH effective AS (
    SELECT ep.*
    FROM public.get_effective_competitor_prices(p_store_id, NULL) AS ep
    WHERE ep.status IN ('manual', 'fresh')
  )
  SELECT
    i.id,
    i.name,
    i.price,
    round(avg(effective.competitor_price), 2),
    round(
      ((i.price - avg(effective.competitor_price))
        / NULLIF(avg(effective.competitor_price), 0)),
      4
    ),
    jsonb_object_agg(effective.competitor_key, effective.competitor_price)
  FROM public.items AS i
  JOIN effective ON effective.item_id = i.id
  GROUP BY i.id, i.name, i.price
  HAVING avg(effective.competitor_price) > 0
     AND i.price > avg(effective.competitor_price) * (1 + p_threshold)
  ORDER BY 5 DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS and function privileges.
-- ---------------------------------------------------------------------------

ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_scrape_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view competitor prices for their store"
  ON public.competitor_prices;
DROP POLICY IF EXISTS "Authenticated users can insert competitor prices for their store"
  ON public.competitor_prices;
DROP POLICY IF EXISTS "Authenticated users can update competitor prices for their store"
  ON public.competitor_prices;
DROP POLICY IF EXISTS "Authenticated users can delete competitor prices for their store"
  ON public.competitor_prices;
DROP POLICY IF EXISTS "Service role can manage competitor prices"
  ON public.competitor_prices;

CREATE POLICY "Users can view competitor prices for their store"
  ON public.competitor_prices
  FOR SELECT
  TO authenticated
  USING (store_id = public.get_current_user_store_id());

CREATE POLICY "Service role can manage competitor prices"
  ON public.competitor_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage competitor scrape runs"
  ON public.competitor_scrape_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.competitor_prices FROM anon, authenticated;
GRANT SELECT ON public.competitor_prices TO authenticated;
GRANT ALL ON public.competitor_prices TO service_role;

REVOKE ALL ON public.competitor_scrape_runs FROM anon, authenticated;
GRANT ALL ON public.competitor_scrape_runs TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_manual_competitor_price(
  uuid, uuid, text, text, numeric, text, text
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_manual_competitor_price(
  uuid, uuid, text
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_effective_competitor_prices(
  uuid, uuid
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ingest_competitor_scrape_batch(
  text, timestamptz, text, uuid, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_competitor_prices(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_price_alerts(uuid, numeric)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_manual_competitor_price(
  uuid, uuid, text, text, numeric, text, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_manual_competitor_price(
  uuid, uuid, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_competitor_prices(
  uuid, uuid
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ingest_competitor_scrape_batch(
  text, timestamptz, text, uuid, jsonb, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_competitor_prices(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.check_price_alerts(uuid, numeric)
  TO authenticated, service_role;
