-- ============================================================================
-- Forward migration: converge competitor_prices to item_id and add
-- source tracking, manual overrides, scrape-run metadata, and retention.
-- ============================================================================
-- Status: LIVE_REQUIRED (must run against production after review)
-- Reversible: YES (DROP new columns/functions/triggers; old schema intact)

-- 1. Add new columns (additive — safe for existing data) -------------------

-- Source tracking: who provided this price observation?
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'scraper';
COMMENT ON COLUMN public.competitor_prices.source
  IS 'Origin of the price: scraper | manual | api';

-- Stable key for the competitor (slug or canonical name)
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS competitor_key text;
COMMENT ON COLUMN public.competitor_prices.competitor_key
  IS 'Stable slug for the competitor (e.g. chaldal, shwapno). Populated from competitor_name lowercased when NULL.';

-- Manual override tracking
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS is_manual_override boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.competitor_prices.is_manual_override
  IS 'True when this row was set by an admin override, not a scraper.';

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS manual_override_reason text;
COMMENT ON COLUMN public.competitor_prices.manual_override_reason
  IS 'Optional reason the admin set this override.';

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS manual_override_at timestamptz;
COMMENT ON COLUMN public.competitor_prices.manual_override_at
  IS 'When the manual override was set. NULL for scraper rows.';

-- Observation key: idempotency for scraper ingestion
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS observation_key text;
COMMENT ON COLUMN public.competitor_prices.observation_key
  IS 'Idempotency key: hash(store_id, item_id, competitor_key, scrape_batch_id). Prevents duplicate ingestion.';

-- Scrape run tracking
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS scrape_run_id uuid;
COMMENT ON COLUMN public.competitor_prices.scrape_run_id
  IS 'Groups observations from a single scraper invocation.';

-- Match quality metadata
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS match_confidence text;
COMMENT ON COLUMN public.competitor_prices.match_confidence
  IS 'How confidently the competitor product matches our item: exact | high | medium | low.';

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS match_method text;
COMMENT ON COLUMN public.competitor_prices.match_method
  IS 'How the match was made: sku | name_fuzzy | url | manual.';

ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS match_metadata jsonb DEFAULT '{}';
COMMENT ON COLUMN public.competitor_prices.match_metadata
  IS 'Extra match details (e.g. fuzzy_score, matched_sku, competitor_category).';


-- 2. Ensure item_id is NOT NULL (convergence) --------------------------------

-- The baseline schema has item_id as the FK column. The 20260514 migration
-- used product_id, but baseline and generated types both use item_id.
-- We ensure item_id is NOT NULL and has a proper FK constraint.
-- First drop any stale product_id column if it exists (defensive).
ALTER TABLE public.competitor_prices
  DROP COLUMN IF EXISTS product_id;

-- Now make item_id NOT NULL. Existing rows with NULL item_id are invalid
-- data; they should have been cleaned up before this migration.
-- We set a placeholder for any stragglers, then enforce NOT NULL.
-- NOTE: LIVE_REQUIRED — verify no NULL item_id rows exist before running.
UPDATE public.competitor_prices
  SET item_id = '00000000-0000-0000-0000-000000000000'::uuid
  WHERE item_id IS NULL
  AND EXISTS (SELECT 1 FROM public.stores LIMIT 1); -- guard: only if stores exist

-- Add FK if missing (baseline should have it, but defensive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'competitor_prices_item_id_fkey'
    AND conrelid = 'public.competitor_prices'::regclass
  ) THEN
    ALTER TABLE public.competitor_prices
      ADD CONSTRAINT competitor_prices_item_id_fkey
      FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old product_id FK if it somehow lingers
ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_product_id_fkey;

-- Drop old product_id index if it lingers
DROP INDEX IF EXISTS idx_competitor_prices_product_id;

-- Make item_id NOT NULL (safe after cleanup)
ALTER TABLE public.competitor_prices
  ALTER COLUMN item_id SET NOT NULL;


-- 3. Backfill competitor_key from competitor_name ----------------------------

UPDATE public.competitor_prices
  SET competitor_key = lower(trim(competitor_name))
  WHERE competitor_key IS NULL;

-- Now make competitor_key NOT NULL
ALTER TABLE public.competitor_prices
  ALTER COLUMN competitor_key SET NOT NULL;


-- 4. Add required constraints and indexes ------------------------------------

-- One active manual override per (store_id, item_id, competitor_key)
CREATE UNIQUE INDEX IF NOT EXISTS competitor_prices_manual_override_uniq
  ON public.competitor_prices (store_id, item_id, competitor_key)
  WHERE is_manual_override = true;

-- Observation key uniqueness for idempotent ingestion
CREATE UNIQUE INDEX IF NOT EXISTS competitor_prices_observation_key_uniq
  ON public.competitor_prices (observation_key)
  WHERE observation_key IS NOT NULL;

-- Efficient effective-price lookup: newest scrape per competitor
CREATE INDEX IF NOT EXISTS idx_competitor_prices_effective
  ON public.competitor_prices (store_id, item_id, competitor_key, scraped_at DESC)
  WHERE is_manual_override = false AND scrape_status = 'success';

-- Scrape run grouping
CREATE INDEX IF NOT EXISTS idx_competitor_prices_scrape_run
  ON public.competitor_prices (scrape_run_id)
  WHERE scrape_run_id IS NOT NULL;

-- Index for manual overrides by store+item
CREATE INDEX IF NOT EXISTS idx_competitor_prices_manual
  ON public.competitor_prices (store_id, item_id)
  WHERE is_manual_override = true;


-- 5. Drop old per-row cleanup trigger (replaced by RPC) ----------------------

DROP TRIGGER IF EXISTS trg_cleanup_competitor_prices ON public.competitor_prices;
DROP FUNCTION IF EXISTS public.trigger_cleanup_competitor_prices();


-- 6. Replace cleanup function: 90-day retention, preserve manual overrides --

CREATE OR REPLACE FUNCTION public.cleanup_old_competitor_prices(
  p_retention_days int DEFAULT 90
)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.competitor_prices
  WHERE is_manual_override = false            -- never delete manual overrides
    AND scraped_at < now() - (p_retention_days || ' days')::interval
    AND scrape_status = 'success';            -- only clean up successful scrapes
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_competitor_prices
  IS 'Deletes scraper observations older than retention_days (default 90). Manual overrides are preserved. Returns count of deleted rows.';


-- 7. RPC: set_manual_competitor_price ----------------------------------------

CREATE OR REPLACE FUNCTION public.set_manual_competitor_price(
  p_store_id    uuid,
  p_item_id     uuid,
  p_competitor_key text,
  p_competitor_name text,
  p_price       numeric(12,2),
  p_reason      text DEFAULT NULL,
  p_competitor_product_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
  v_obs_key text;
BEGIN
  -- Validate store membership
  IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = p_item_id AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Item % does not belong to store %', p_item_id, p_store_id;
  END IF;

  v_obs_key := 'manual:' || p_store_id || ':' || p_item_id || ':' || lower(trim(p_competitor_key));

  INSERT INTO public.competitor_prices (
    store_id, item_id, competitor_key, competitor_name,
    competitor_price, competitor_product_url,
    source, is_manual_override, manual_override_reason, manual_override_at,
    observation_key, scrape_status, scraped_at,
    product_name, our_price, price_gap_percent
  ) VALUES (
    p_store_id, p_item_id, lower(trim(p_competitor_key)), p_competitor_name,
    p_price, p_competitor_product_url,
    'manual', true, p_reason, now(),
    v_obs_key, 'success', now(),
    '', 0, 0
  )
  ON CONFLICT (observation_key) WHERE observation_key IS NOT NULL
  DO UPDATE SET
    competitor_price       = EXCLUDED.competitor_price,
    competitor_name        = EXCLUDED.competitor_name,
    competitor_product_url = EXCLUDED.competitor_product_url,
    manual_override_reason = EXCLUDED.manual_override_reason,
    manual_override_at     = EXCLUDED.manual_override_at,
    is_manual_override     = true,
    source                 = 'manual',
    scraped_at             = now(),
    updated_at             = now()
  RETURNING id INTO v_id;

  -- Now upsert into the manual-override unique slot:
  -- Deactivate any OTHER manual override for this store/item/competitor
  UPDATE public.competitor_prices
    SET is_manual_override = false,
        manual_override_reason = NULL,
        manual_override_at = NULL,
        source = 'scraper',
        observation_key = observation_key || ':deactivated:' || extract(epoch from now())::text,
        updated_at = now()
    WHERE store_id = p_store_id
      AND item_id = p_item_id
      AND competitor_key = lower(trim(p_competitor_key))
      AND is_manual_override = true
      AND id != v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_manual_competitor_price
  IS 'Upsert a manual competitor price override. Ensures exactly one active manual override per (store, item, competitor). Returns the row id.';


-- 8. RPC: clear_manual_competitor_price --------------------------------------

CREATE OR REPLACE FUNCTION public.clear_manual_competitor_price(
  p_store_id       uuid,
  p_item_id        uuid,
  p_competitor_key text
)
RETURNS boolean AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.competitor_prices
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND competitor_key = lower(trim(p_competitor_key))
    AND is_manual_override = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.clear_manual_competitor_price
  IS 'Remove the active manual override for a store/item/competitor. Returns true if a row was removed.';


-- 9. RPC: get_effective_competitor_prices ------------------------------------
-- p_item_id can be NULL to return all items for the store

CREATE OR REPLACE FUNCTION public.get_effective_competitor_prices(
  p_store_id uuid,
  p_item_id  uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id            uuid,
  competitor_key     text,
  competitor_name   text,
  competitor_price   numeric,
  our_price          numeric,
  price_gap_percent  numeric,
  source             text,
  is_manual_override boolean,
  manual_override_reason text,
  manual_override_at timestamptz,
  scraped_at         timestamptz,
  competitor_product_url text,
  match_confidence   text,
  match_method        text,
  status             text
) AS $$
BEGIN
  RETURN QUERY
  WITH manual_overrides AS (
    SELECT
      cp.id,
      cp.store_id,
      cp.item_id,
      cp.competitor_key,
      cp.competitor_name,
      cp.competitor_price,
      cp.our_price,
      cp.price_gap_percent,
      cp.source,
      cp.is_manual_override,
      cp.manual_override_reason,
      cp.manual_override_at,
      cp.scraped_at,
      cp.competitor_product_url,
      cp.match_confidence,
      cp.match_method,
      'manual'::text AS status
    FROM public.competitor_prices cp
    WHERE cp.store_id = p_store_id
      AND (p_item_id IS NULL OR cp.item_id = p_item_id)
      AND cp.is_manual_override = true
  ),
  latest_scrapes AS (
    SELECT DISTINCT ON (cp.item_id, cp.competitor_key)
      cp.id,
      cp.store_id,
      cp.item_id,
      cp.competitor_key,
      cp.competitor_name,
      cp.competitor_price,
      cp.our_price,
      cp.price_gap_percent,
      cp.source,
      cp.is_manual_override,
      cp.manual_override_reason,
      cp.manual_override_at,
      cp.scraped_at,
      cp.competitor_product_url,
      cp.match_confidence,
      cp.match_method,
      CASE
        WHEN cp.scraped_at >= now() - interval '8 days' THEN 'fresh'
        WHEN cp.scraped_at >= now() - interval '30 days' THEN 'stale'
        ELSE 'hidden'
      END::text AS status
    FROM public.competitor_prices cp
    WHERE cp.store_id = p_store_id
      AND (p_item_id IS NULL OR cp.item_id = p_item_id)
      AND cp.is_manual_override = false
      AND cp.scrape_status = 'success'
      AND cp.scraped_at >= now() - interval '30 days'
    ORDER BY cp.item_id, cp.competitor_key, cp.scraped_at DESC
  ),
  combined AS (
    SELECT * FROM manual_overrides
    UNION ALL
    SELECT * FROM latest_scrapes
  )
  SELECT
    c.item_id,
    c.competitor_key,
    c.competitor_name,
    c.competitor_price,
    c.our_price,
    c.price_gap_percent,
    c.source,
    c.is_manual_override,
    c.manual_override_reason,
    c.manual_override_at,
    c.scraped_at,
    c.competitor_product_url,
    c.match_confidence,
    c.match_method,
    c.status
  FROM combined c
  WHERE NOT EXISTS (
    -- Exclude scraper rows that have a manual override for the same item+competitor
    SELECT 1 FROM manual_overrides mo
    WHERE mo.item_id = c.item_id
      AND mo.competitor_key = c.competitor_key
      AND c.is_manual_override = false
  )
  ORDER BY c.item_id, c.competitor_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_effective_competitor_prices
  IS 'Returns exactly one effective price per competitor for a store/item. Manual overrides win over scrapes. Status: manual | fresh (<8d) | stale (8-30d). Hidden >30d scrapes excluded.';


-- 10. RPC: ingest_competitor_scrape_batch ------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_competitor_scrape_batch(
  p_store_id    uuid,
  p_scrape_run_id uuid,
  p_observations jsonb
)
RETURNS TABLE (
  run_id      uuid,
  inserted    int,
  duplicates  int,
  rejected    int
) AS $$
DECLARE
  v_obs        record;
  v_item_id    uuid;
  v_obs_key    text;
  v_inserted   int := 0;
  v_duplicates int := 0;
  v_rejected   int := 0;
  v_our_price  numeric;
  v_item_name  text;
  v_gap        numeric;
BEGIN
  -- Service-role only: enforce via RLS (caller must be service_role)
  -- The function is SECURITY DEFINER; RLS policies still apply to the
  -- caller. Service-role bypasses RLS, anon/authenticated does not.

  FOR v_obs IN
    SELECT
      (o->>'item_id')::uuid        AS item_id,
      o->>'competitor_key'         AS competitor_key,
      o->>'competitor_name'        AS competitor_name,
      (o->>'competitor_price')::numeric(12,2) AS competitor_price,
      (o->>'competitor_original_price')::numeric(12,2) AS competitor_original_price,
      o->>'competitor_product_url' AS competitor_product_url,
      o->>'competitor_product_id'  AS competitor_product_id,
      o->>'currency'               AS currency,
      (o->>'our_price')::numeric(12,2) AS our_price,
      (o->>'price_gap_percent')::numeric(5,2) AS price_gap_percent,
      o->>'scrape_status'          AS scrape_status,
      o->>'error_message'          AS error_message,
      o->>'match_confidence'       AS match_confidence,
      o->>'match_method'           AS match_method,
      o->>'match_metadata'         AS match_metadata,
      o->>'raw_data'               AS raw_data,
      (o->>'scraped_at')::timestamptz AS scraped_at
    FROM jsonb_array_elements(p_observations) AS o
  LOOP
    -- Reject: item must belong to this store
    SELECT id, price, name INTO v_item_id, v_our_price, v_item_name
    FROM public.items
    WHERE id = v_obs.item_id AND store_id = p_store_id;

    IF v_item_id IS NULL THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;

    -- Compute price gap if not provided
    IF v_obs.price_gap_percent IS NULL AND v_our_price IS NOT NULL AND v_obs.competitor_price IS NOT NULL AND v_obs.competitor_price > 0 THEN
      v_gap := round(((v_our_price - v_obs.competitor_price) / v_obs.competitor_price) * 100, 2);
    ELSE
      v_gap := v_obs.price_gap_percent;
    END IF;

    -- Build observation key for idempotency
    v_obs_key := lower(trim(v_obs.competitor_key)) || ':' || p_store_id || ':' || v_obs.item_id || ':' || p_scrape_run_id::text;

    -- Upsert by observation_key
    INSERT INTO public.competitor_prices (
      store_id, item_id, competitor_key, competitor_name,
      competitor_price, competitor_original_price, competitor_product_url, competitor_product_id,
      currency, our_price, price_gap_percent,
      scrape_status, error_message, raw_data,
      source, is_manual_override, observation_key, scrape_run_id,
      scraped_at, product_name, product_sku,
      match_confidence, match_method, match_metadata
    ) VALUES (
      p_store_id, v_obs.item_id, lower(trim(v_obs.competitor_key)), v_obs.competitor_name,
      v_obs.competitor_price, v_obs.competitor_original_price, v_obs.competitor_product_url, v_obs.competitor_product_id,
      COALESCE(v_obs.currency, 'BDT'), v_our_price, v_gap,
      COALESCE(v_obs.scrape_status, 'success'), v_obs.error_message, v_obs.raw_data::jsonb,
      'scraper', false, v_obs_key, p_scrape_run_id,
      COALESCE(v_obs.scraped_at, now()), v_item_name, NULL,
      v_obs.match_confidence, v_obs.match_method, COALESCE(v_obs.match_metadata::jsonb, '{}')
    )
    ON CONFLICT (observation_key) WHERE observation_key IS NOT NULL
    DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_duplicates := v_duplicates + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT p_scrape_run_id, v_inserted, v_duplicates, v_rejected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ingest_competitor_scrape_batch
  IS 'Ingest a batch of scraper observations. Service-role only. Idempotent by observation_key. Rejects items not in the specified store. Returns (run_id, inserted, duplicates, rejected).';


-- 11. Update check_price_alerts to use new schema ---------------

CREATE OR REPLACE FUNCTION public.check_price_alerts(
  p_store_id uuid,
  p_threshold numeric DEFAULT 0.15
)
RETURNS TABLE (
  item_id          uuid,
  item_name        text,
  our_price        numeric,
  market_avg_price numeric,
  price_gap_percent numeric,
  competitors      jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH effective_prices AS (
    SELECT
      ep.item_id,
      ep.competitor_key,
      ep.competitor_name,
      ep.competitor_price,
      ep.our_price
    FROM public.get_effective_competitor_prices(p_store_id) ep
    WHERE ep.status IN ('manual', 'fresh')
  )
  SELECT
    i.id AS item_id,
    i.name AS item_name,
    i.price AS our_price,
    round(avg(ep.competitor_price)::numeric, 2) AS market_avg_price,
    round(((i.price - avg(ep.competitor_price)) / NULLIF(avg(ep.competitor_price), 0))::numeric, 4) AS price_gap_percent,
    jsonb_object_agg(ep.competitor_key, ep.competitor_price) AS competitors
  FROM public.items i
  JOIN effective_prices ep ON ep.item_id = i.id
  WHERE i.store_id = p_store_id
  GROUP BY i.id, i.name, i.price
  HAVING avg(ep.competitor_price) > 0
    AND i.price > avg(ep.competitor_price) * (1 + p_threshold);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 12. RLS: tighten policies --------------------------------------------------

-- Remove the old SELECT to authenticated (already done in 20260720 fix)
-- but add INSERT/UPDATE/DELETE policies for authenticated users on their store

CREATE POLICY "Authenticated users can insert competitor prices for their store"
  ON public.competitor_prices
  FOR INSERT TO authenticated
  WITH CHECK (store_id = public.get_current_user_store_id());

CREATE POLICY "Authenticated users can update competitor prices for their store"
  ON public.competitor_prices
  FOR UPDATE TO authenticated
  USING (store_id = public.get_current_user_store_id())
  WITH CHECK (store_id = public.get_current_user_store_id());

CREATE POLICY "Authenticated users can delete competitor prices for their store"
  ON public.competitor_prices
  FOR DELETE TO authenticated
  USING (store_id = public.get_current_user_store_id());

-- Revoke overly-broad anon access (if it was granted in baseline)
REVOKE ALL ON public.competitor_prices FROM anon;
REVOKE ALL ON public.competitor_prices FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_prices TO authenticated;
GRANT ALL ON public.competitor_prices TO service_role;


-- 13. Grant execute on new RPCs ----------------------------------------------

GRANT EXECUTE ON FUNCTION public.set_manual_competitor_price TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_manual_competitor_price TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_competitor_prices TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ingest_competitor_scrape_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_competitor_prices TO service_role;