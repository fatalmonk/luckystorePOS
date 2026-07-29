\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema convergence: product_id dropped, item_id remains nullable
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitor_prices'
      AND column_name = 'product_id'
  ) THEN
    RAISE EXCEPTION 'product_id was not converged to item_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitor_prices'
      AND column_name = 'item_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'item_id must remain nullable for unmatched observations';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ingest_competitor_scrape_batch'
      AND pg_get_function_identity_arguments(p.oid)
        = 'p_run_key text, p_scheduled_at timestamp with time zone, p_competitor text, p_store_id uuid, p_observations jsonb, p_summary jsonb'
      AND pg_get_function_result(p.oid) = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'frozen ingestion RPC signature is missing';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.ingest_competitor_scrape_batch(text,timestamptz,text,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.ingest_competitor_scrape_batch(text,timestamptz,text,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'ingestion RPC is executable by a public client role';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_price_alerts'
      AND pg_get_function_identity_arguments(p.oid)
        = 'p_store_id uuid, p_threshold numeric'
      AND pg_get_function_result(p.oid) = 'TABLE(item_id uuid, item_name text, our_price numeric, market_avg_price numeric, price_gap_percent numeric, competitors jsonb)'
  ) THEN
    RAISE EXCEPTION 'frozen price-alerts RPC signature is missing';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed data for all tests
-- ---------------------------------------------------------------------------

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}',
  true
);

-- Deterministic tenant, store, identity, and item fixtures. The test must not
-- depend on rows created by another suite or a developer database.
INSERT INTO public.tenants (id, name)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'Competitor pricing tenant A'),
  ('91000000-0000-0000-0000-000000000002', 'Competitor pricing tenant B');

INSERT INTO public.stores (id, tenant_id, code, name)
VALUES
  (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'COMP-TEST-A',
    'Competitor pricing store A'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000002',
    'COMP-TEST-B',
    'Competitor pricing store B'
  );

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
VALUES (
  '95000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'competitor-a@test.invalid',
  '',
  now(),
  now(),
  now()
);

INSERT INTO public.users (
  id, auth_id, email, role, store_id, tenant_id, name
)
VALUES (
  '95000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'competitor-a@test.invalid',
  'manager',
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'Competitor pricing manager A'
);

INSERT INTO public.items (id, name, price, tenant_id)
VALUES
  (
    '93000000-0000-0000-0000-000000000001',
    'Test Item A',
    120,
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    'Test Item B',
    200,
    '91000000-0000-0000-0000-000000000002'
  );

-- ---------------------------------------------------------------------------
-- Successful ingestion and idempotency
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_first jsonb;
  v_duplicate jsonb;
BEGIN
  v_first := public.ingest_competitor_scrape_batch(
    'competitor-test-run',
    transaction_timestamp(),
    'chaldal',
    '92000000-0000-0000-0000-000000000001',
    jsonb_build_array(
      jsonb_build_object(
        'observation_key', 'competitor-test:matched',
        'competitor_product_id', 'chaldal:test-a',
        'competitor_product_url', NULL,
        'product_name', 'Competitor test item A',
        'competitor_price', 100,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000001',
        'match_confidence', 0.99,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      ),
      jsonb_build_object(
        'observation_key', 'competitor-test:unmatched',
        'competitor_product_id', 'chaldal:test-unmatched',
        'competitor_product_url', NULL,
        'product_name', 'Unmatched item',
        'competitor_price', 50,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', NULL,
        'match_confidence', NULL,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      ),
      jsonb_build_object(
        'observation_key', 'competitor-test:bad-price',
        'competitor_product_id', 'chaldal:bad-price',
        'competitor_product_url', NULL,
        'product_name', 'Bad price item',
        'competitor_price', -5,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000001',
        'match_confidence', 0.5,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      )
    ),
    '{"test":"first-run"}'::jsonb
  );

  IF (v_first ->> 'inserted')::integer <> 2
     OR (v_first ->> 'rejected')::integer <> 1 THEN
    RAISE EXCEPTION 'unexpected first ingestion result: %', v_first;
  END IF;

  v_duplicate := public.ingest_competitor_scrape_batch(
    'competitor-test-run',
    transaction_timestamp(),
    'chaldal',
    '92000000-0000-0000-0000-000000000001',
    jsonb_build_array(
      jsonb_build_object(
        'observation_key', 'competitor-test:matched',
        'competitor_product_id', 'chaldal:test-a',
        'competitor_product_url', NULL,
        'product_name', 'Competitor test item A',
        'competitor_price', 100,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000001',
        'match_confidence', 0.99,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      )
    ),
    '{"test":"duplicate"}'::jsonb
  );

  IF (v_duplicate ->> 'duplicates')::integer <> 1
     OR (v_duplicate ->> 'inserted')::integer <> 0 THEN
    RAISE EXCEPTION 'duplicate ingestion was not idempotent: %', v_duplicate;
  END IF;
END;
$$;

SELECT public.ingest_competitor_scrape_batch(
  'competitor-test-run-store-b',
  transaction_timestamp(),
  'chaldal',
  '92000000-0000-0000-0000-000000000002',
  jsonb_build_array(
    jsonb_build_object(
      'observation_key', 'competitor-test:store-b',
      'competitor_product_id', 'chaldal:test-b',
      'competitor_product_url', NULL,
      'product_name', 'Competitor test item B',
      'competitor_price', 115,
      'competitor_original_price', NULL,
      'currency', 'BDT',
      'scraped_at', transaction_timestamp(),
      'item_id', '93000000-0000-0000-0000-000000000002',
      'match_confidence', 1,
      'matcher_version', 'matcher-test',
      'raw_data', '{}'::jsonb
    )
  ),
  '{"test":"rls-store-b"}'::jsonb
);

-- A store-A batch cannot attach an observation to a store-B tenant item.
DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.ingest_competitor_scrape_batch(
    'competitor-test-wrong-store-item',
    transaction_timestamp(),
    'chaldal',
    '92000000-0000-0000-0000-000000000001',
    jsonb_build_array(
      jsonb_build_object(
        'observation_key', 'competitor-test:wrong-store-item',
        'competitor_product_id', 'chaldal:wrong-store',
        'competitor_product_url', NULL,
        'product_name', 'Wrong-store item',
        'competitor_price', 110,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000002',
        'match_confidence', 1,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      )
    ),
    '{"test":"wrong-store-item"}'::jsonb
  );

  IF (v_result ->> 'inserted')::integer <> 0
     OR (v_result ->> 'rejected')::integer <> 1 THEN
    RAISE EXCEPTION 'wrong-store item was not rejected: %', v_result;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.competitor_prices
    WHERE observation_key = 'competitor-test:wrong-store-item'
  ) THEN
    RAISE EXCEPTION 'wrong-store observation was inserted';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SET LOCAL ROLE authenticated;

-- ---------------------------------------------------------------------------
-- Wrong-store RLS: authenticated user sees only own store, cannot write
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_own_count integer;
  v_wrong_count integer;
  v_write_denied boolean := false;
BEGIN
  SELECT count(*) INTO v_own_count
  FROM public.competitor_prices
  WHERE store_id = '92000000-0000-0000-0000-000000000001';

  SELECT count(*) INTO v_wrong_count
  FROM public.competitor_prices
  WHERE store_id = '92000000-0000-0000-0000-000000000002';

  IF v_own_count <> 2 OR v_wrong_count <> 0 THEN
    RAISE EXCEPTION 'RLS returned own %, wrong-store %', v_own_count, v_wrong_count;
  END IF;

  BEGIN
    INSERT INTO public.competitor_prices (
      store_id, item_id, product_name, competitor_name, competitor_price,
      source, competitor_key, matcher_version
    )
    VALUES (
      '92000000-0000-0000-0000-000000000001',
      '93000000-0000-0000-0000-000000000001',
      'Direct write must fail',
      'chaldal',
      1,
      'manual',
      'chaldal',
      'manual'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_write_denied := true;
  END;

  IF NOT v_write_denied THEN
    RAISE EXCEPTION 'authenticated direct table mutation was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Manual override lifecycle: set, verify active, clear, verify fallback
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_effective record;
BEGIN
  PERFORM public.set_manual_competitor_price(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    'chaldal',
    'Chaldal',
    95,
    'first override',
    NULL
  );

  PERFORM public.set_manual_competitor_price(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    'chaldal',
    'Chaldal',
    90,
    'replacement override',
    NULL
  );

  IF (
    SELECT count(*)
    FROM public.competitor_prices
    WHERE store_id = '92000000-0000-0000-0000-000000000001'
      AND item_id = '93000000-0000-0000-0000-000000000001'
      AND competitor_key = 'chaldal'
      AND source = 'manual'
  ) <> 2 THEN
    RAISE EXCEPTION 'manual replacement did not preserve history';
  END IF;

  IF (
    SELECT count(*)
    FROM public.competitor_prices
    WHERE store_id = '92000000-0000-0000-0000-000000000001'
      AND item_id = '93000000-0000-0000-0000-000000000001'
      AND competitor_key = 'chaldal'
      AND source = 'manual'
      AND is_override_active
  ) <> 1 THEN
    RAISE EXCEPTION 'manual replacement left the wrong active count';
  END IF;

  SELECT *
  INTO v_effective
  FROM public.get_effective_competitor_prices(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001'
  )
  WHERE competitor_key = 'chaldal';

  IF v_effective.status <> 'manual' OR v_effective.competitor_price <> 90 THEN
    RAISE EXCEPTION 'manual override did not win: %', row_to_json(v_effective);
  END IF;

  IF NOT public.clear_manual_competitor_price(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    'chaldal'
  ) THEN
    RAISE EXCEPTION 'manual override was not cleared';
  END IF;

  SELECT *
  INTO v_effective
  FROM public.get_effective_competitor_prices(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001'
  )
  WHERE competitor_key = 'chaldal';

  IF v_effective.status <> 'fresh' OR v_effective.competitor_price <> 100 THEN
    RAISE EXCEPTION 'scraper fallback was not restored: %', row_to_json(v_effective);
  END IF;
END;
$$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Stale status transitions (8 days → stale, 30 days → hidden)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '8 days'
  WHERE observation_key = 'competitor-test:matched';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to age one matched row to 8 days, updated %', v_updated;
  END IF;
END;
$$;

DO $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.get_effective_competitor_prices(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001'
  )
  WHERE competitor_key = 'chaldal';

  IF v_status <> 'stale' THEN
    RAISE EXCEPTION 'exactly 8 days must be stale, got %', v_status;
  END IF;
END;
$$;

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '30 days'
  WHERE observation_key = 'competitor-test:matched';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to age one matched row to 30 days, updated %', v_updated;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.get_effective_competitor_prices(
      '92000000-0000-0000-0000-000000000001',
      '93000000-0000-0000-0000-000000000001'
    )
    WHERE competitor_key = 'chaldal'
  ) THEN
    RAISE EXCEPTION 'exactly 30 days must be hidden';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Retention: exactly 90-day rows survive; strictly older than 90 are deleted
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '100 days'
  WHERE observation_key IN ('competitor-test:matched', 'competitor-test:unmatched');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'expected to age two cleanup rows, updated %', v_updated;
  END IF;
END;
$$;

DO $$
DECLARE
  v_deleted integer;
BEGIN
  v_deleted := public.cleanup_old_competitor_prices(90);
  IF v_deleted <> 2 THEN
    RAISE EXCEPTION 'cleanup deleted %, expected 2 scraper rows', v_deleted;
  END IF;

  IF (
    SELECT count(*)
    FROM public.competitor_prices
    WHERE source = 'manual'
      AND store_id = '92000000-0000-0000-0000-000000000001'
  ) <> 2 THEN
    RAISE EXCEPTION 'cleanup removed manual history';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Wrong-store set_manual_competitor_price is denied
-- ---------------------------------------------------------------------------

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.set_manual_competitor_price(
      '92000000-0000-0000-0000-000000000002',
      '93000000-0000-0000-0000-000000000002',
      'chaldal',
      'Chaldal',
      99,
      'wrong-store attempt',
      NULL
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'wrong-store set_manual_competitor_price was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Wrong-store clear_manual_competitor_price is denied
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.clear_manual_competitor_price(
      '92000000-0000-0000-0000-000000000002',
      '93000000-0000-0000-0000-000000000002',
      'chaldal'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'wrong-store clear_manual_competitor_price was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Wrong-store get_effective_competitor_prices is denied
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_effective_competitor_prices(
      '92000000-0000-0000-0000-000000000002',
      NULL
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'wrong-store get_effective_competitor_prices was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Wrong-store check_price_alerts is denied
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.check_price_alerts(
      '92000000-0000-0000-0000-000000000002',
      0.15
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'wrong-store check_price_alerts was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Authenticated ingestion call is denied
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.ingest_competitor_scrape_batch(
      'competitor-test-auth-denied',
      transaction_timestamp(),
      'chaldal',
      '92000000-0000-0000-0000-000000000002',
      '[]'::jsonb,
      '{}'::jsonb
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'authenticated ingestion was not denied';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Price alerts: manual precedence, stale exclusion, threshold
-- ---------------------------------------------------------------------------

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}',
  true
);

-- Insert a fresh scraper observation for alert testing
SELECT public.ingest_competitor_scrape_batch(
  'competitor-test-alert-run',
  transaction_timestamp(),
  'shwapno',
  '92000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'observation_key', 'competitor-test:alert-shwapno',
      'competitor_product_id', 'shwapno:test-a',
      'competitor_product_url', NULL,
      'product_name', 'Competitor test item A',
      'competitor_price', 200,
      'competitor_original_price', NULL,
      'currency', 'BDT',
      'scraped_at', transaction_timestamp(),
      'item_id', '93000000-0000-0000-0000-000000000001',
      'match_confidence', 0.95,
      'matcher_version', 'matcher-test',
      'raw_data', '{}'::jsonb
    )
  ),
  '{"test":"alerts"}'::jsonb
);

-- Set manual override at price 105 (lower than scraper 200, should win in alerts)
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $$
BEGIN
  PERFORM public.set_manual_competitor_price(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    'shwapno',
    'Shwapno',
    105,
    'alert test override',
    NULL
  );
END;
$$;

-- Switch to service_role for alert queries
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}',
  true
);

-- ---------------------------------------------------------------------------
-- Manual price precedence in alerts
-- check_price_alerts returns: item_id, item_name, our_price, market_avg_price,
-- price_gap_percent, competitors jsonb
-- The competitors JSON aggregates {key: price} pairs.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_alert record;
  v_shwapno_price numeric;
BEGIN
  -- Manual override (105) should appear in the competitors JSON for alerts
  SELECT * INTO v_alert
  FROM public.check_price_alerts(
    '92000000-0000-0000-0000-000000000001',
    0.0
  )
  WHERE item_id = '93000000-0000-0000-0000-000000000001';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'price alert did not include manual override for item A';
  END IF;

  -- Manual price (105) should appear in the competitors JSON, not the scraper price (200)
  v_shwapno_price := (v_alert.competitors ->> 'shwapno')::numeric;
  IF v_shwapno_price <> 105 THEN
    RAISE EXCEPTION 'price alert did not use manual price, got shwapno=%', v_shwapno_price;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Stale competitor exclusion from alerts
-- ---------------------------------------------------------------------------

-- The original matched Chaldal row was intentionally removed by the retention
-- test. Ingest a new row so stale classification and exclusion are both real.
SELECT public.ingest_competitor_scrape_batch(
  'competitor-test-stale-alert-run',
  transaction_timestamp(),
  'chaldal',
  '92000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'observation_key', 'competitor-test:stale-alert-chaldal',
      'competitor_product_id', 'chaldal:stale-alert',
      'competitor_product_url', NULL,
      'product_name', 'Competitor test item A',
      'competitor_price', 100,
      'competitor_original_price', NULL,
      'currency', 'BDT',
      'scraped_at', transaction_timestamp(),
      'item_id', '93000000-0000-0000-0000-000000000001',
      'match_confidence', 0.98,
      'matcher_version', 'matcher-test',
      'raw_data', '{}'::jsonb
    )
  ),
  '{"test":"stale-alert"}'::jsonb
);

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '10 days'
  WHERE observation_key = 'competitor-test:stale-alert-chaldal';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to age one stale-alert row, updated %', v_updated;
  END IF;
END;
$$;

DO $$
DECLARE
  v_alert record;
  v_has_chaldal boolean;
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.get_effective_competitor_prices(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001'
  )
  WHERE competitor_key = 'chaldal';

  IF v_status IS DISTINCT FROM 'stale' THEN
    RAISE EXCEPTION '10-day Chaldal observation must be stale, got %', v_status;
  END IF;

  SELECT * INTO v_alert
  FROM public.check_price_alerts(
    '92000000-0000-0000-0000-000000000001',
    0.0
  )
  WHERE item_id = '93000000-0000-0000-0000-000000000001';

  -- Stale chaldal competitor should NOT appear in the competitors JSON
  v_has_chaldal := v_alert.competitors ? 'chaldal';
  IF v_has_chaldal THEN
    RAISE EXCEPTION 'stale competitor chaldal should not appear in alert competitors';
  END IF;
END;
$$;

-- Reset chaldal to fresh for threshold tests
DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp()
  WHERE observation_key = 'competitor-test:stale-alert-chaldal'
    AND source = 'scraper'
    AND store_id = '92000000-0000-0000-0000-000000000001';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to refresh one stale-alert row, updated %', v_updated;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Low and high threshold behavior
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_alert_count integer;
BEGIN
  -- our price 120 vs market avg ~100 → gap > 10% → alert fires
  SELECT count(*) INTO v_alert_count
  FROM public.check_price_alerts(
    '92000000-0000-0000-0000-000000000001',
    0.10
  )
  WHERE item_id = '93000000-0000-0000-0000-000000000001';

  IF v_alert_count < 1 THEN
    RAISE EXCEPTION 'price alert should fire at 10%% threshold for item A';
  END IF;

  -- At a very high threshold, alert should not fire
  SELECT count(*) INTO v_alert_count
  FROM public.check_price_alerts(
    '92000000-0000-0000-0000-000000000001',
    5.0
  )
  WHERE item_id = '93000000-0000-0000-0000-000000000001';

  IF v_alert_count <> 0 THEN
    RAISE EXCEPTION 'price alert should not fire at 500%% threshold';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}',
  true
);

-- ---------------------------------------------------------------------------
-- Exactly 90-day-old scraper data remains; strictly older than 90 is deleted
-- ---------------------------------------------------------------------------

-- Re-ingest fresh scraper data for the boundary test
SELECT public.ingest_competitor_scrape_batch(
  'competitor-test-boundary-run',
  transaction_timestamp(),
  'shwapno',
  '92000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'observation_key', 'competitor-test:boundary-90',
      'competitor_product_id', 'shwapno:boundary',
      'competitor_product_url', NULL,
      'product_name', 'Boundary test item',
      'competitor_price', 80,
      'competitor_original_price', NULL,
      'currency', 'BDT',
      'scraped_at', transaction_timestamp(),
      'item_id', '93000000-0000-0000-0000-000000000001',
      'match_confidence', 0.9,
      'matcher_version', 'boundary-test',
      'raw_data', '{}'::jsonb
    ),
    jsonb_build_object(
      'observation_key', 'competitor-test:boundary-91',
      'competitor_product_id', 'shwapno:boundary-91',
      'competitor_product_url', NULL,
      'product_name', 'Boundary test item 91',
      'competitor_price', 81,
      'competitor_original_price', NULL,
      'currency', 'BDT',
      'scraped_at', transaction_timestamp(),
      'item_id', '93000000-0000-0000-0000-000000000001',
      'match_confidence', 0.9,
      'matcher_version', 'boundary-test',
      'raw_data', '{}'::jsonb
    )
  ),
  '{}'::jsonb
);

DO $$
DECLARE
  v_updated integer;
BEGIN
  -- Set one row to exactly 90 days old.
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '90 days'
  WHERE observation_key = 'competitor-test:boundary-90';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to age one 90-day boundary row, updated %', v_updated;
  END IF;

  -- Set the other to 91 days old.
  UPDATE public.competitor_prices
  SET scraped_at = transaction_timestamp() - interval '91 days'
  WHERE observation_key = 'competitor-test:boundary-91';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'expected to age one 91-day boundary row, updated %', v_updated;
  END IF;
END;
$$;

DO $$
DECLARE
  v_deleted integer;
  v_remaining_90 integer;
BEGIN
  v_deleted := public.cleanup_old_competitor_prices(90);

  -- Exactly 90 days old should survive (strictly older than 90 is deleted)
  SELECT count(*) INTO v_remaining_90
  FROM public.competitor_prices
  WHERE observation_key = 'competitor-test:boundary-90'
    AND source = 'scraper';

  IF v_remaining_90 <> 1 THEN
    RAISE EXCEPTION 'exactly 90-day row was deleted, expected retention';
  END IF;

  -- 91 days old should have been deleted
  IF NOT EXISTS (
    SELECT 1
    FROM public.competitor_prices
    WHERE observation_key = 'competitor-test:boundary-91'
  ) THEN
    -- Expected: row was deleted
    NULL;
  ELSE
    RAISE EXCEPTION '91-day scraper row was not deleted by cleanup(90)';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Automatic cleanup through ingestion is verified
-- (cleanup fires internally; the RPC returns only run_id, inserted,
--  duplicates, rejected — no 'cleaned' field)
-- ---------------------------------------------------------------------------

-- Insert a scraper row that is 100 days old, then run ingestion to verify
-- auto-cleanup fires.
INSERT INTO public.competitor_prices (
  store_id, item_id, product_name, competitor_name, competitor_key,
  competitor_price, currency, our_price, price_gap_percent,
  scraped_at, scrape_status, source, is_override_active,
  observation_key, matcher_version, match_metadata
)
VALUES (
  '92000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  'Auto-cleanup test item',
  'chaldal',
  'chaldal',
  70,
  'BDT',
  120,
  round((120.0 - 70.0) / nullif(70.0, 0), 4),
  transaction_timestamp() - interval '100 days',
  'success',
  'scraper',
  false,
  'competitor-test:auto-cleanup-old',
  'auto-cleanup-test',
  '{}'::jsonb
);

DO $$
DECLARE
  v_result jsonb;
  v_surviving integer;
BEGIN
  v_result := public.ingest_competitor_scrape_batch(
    'competitor-test-auto-cleanup-run',
    transaction_timestamp(),
    'chaldal',
    '92000000-0000-0000-0000-000000000001',
    jsonb_build_array(
      jsonb_build_object(
        'observation_key', 'competitor-test:auto-cleanup-new',
        'competitor_product_id', 'chaldal:auto-cleanup',
        'competitor_product_url', NULL,
        'product_name', 'Auto-cleanup fresh item',
        'competitor_price', 99,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000001',
        'match_confidence', 0.85,
        'matcher_version', 'auto-cleanup-test',
        'raw_data', '{}'::jsonb
      )
    ),
    '{}'::jsonb
  );

  -- Ingestion result must contain exactly the frozen contract fields.
  IF NOT (v_result ? 'run_id' AND v_result ? 'inserted'
              AND v_result ? 'duplicates' AND v_result ? 'rejected')
     OR (SELECT count(*) FROM jsonb_object_keys(v_result)) <> 4 THEN
    RAISE EXCEPTION 'ingestion result does not match frozen fields: %', v_result;
  END IF;

  -- The 100-day-old scraper row should be gone
  SELECT count(*) INTO v_surviving
  FROM public.competitor_prices
  WHERE observation_key = 'competitor-test:auto-cleanup-old';

  IF v_surviving <> 0 THEN
    RAISE EXCEPTION '100-day scraper row survived auto-cleanup';
  END IF;

  -- Manual rows should still exist
  IF (
    SELECT count(*)
    FROM public.competitor_prices
    WHERE source = 'manual'
      AND store_id = '92000000-0000-0000-0000-000000000001'
  ) < 2 THEN
    RAISE EXCEPTION 'auto-cleanup deleted manual rows';
  END IF;
END;
$$;

ROLLBACK;
