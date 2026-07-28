\set ON_ERROR_STOP on

BEGIN;

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
END;
$$;

INSERT INTO public.tenants (id, name)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'Competitor test tenant A'),
  ('91000000-0000-0000-0000-000000000002', 'Competitor test tenant B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (id, code, name, tenant_id)
VALUES
  (
    '92000000-0000-0000-0000-000000000001',
    'CP-TEST-A',
    'Competitor test store A',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    'CP-TEST-B',
    'Competitor test store B',
    '91000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.items (id, name, sku, price, tenant_id)
VALUES
  (
    '93000000-0000-0000-0000-000000000001',
    'Competitor test item A',
    'CP-A',
    120,
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    'Competitor test item B',
    'CP-B',
    130,
    '91000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, auth_id, email, role, store_id, tenant_id)
VALUES (
  '94000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'competitor-test@example.invalid',
  'admin',
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

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
      90,
      'wrong store test',
      NULL
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'wrong-store manual mutation was not denied';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}',
  true
);

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
        'competitor_product_url', 'https://example.invalid/a',
        'product_name', 'Competitor test item A',
        'competitor_price', 100,
        'competitor_original_price', 110,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000001',
        'match_confidence', 0.99,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      ),
      jsonb_build_object(
        'observation_key', 'competitor-test:unmatched',
        'competitor_product_id', 'chaldal:unknown',
        'competitor_product_url', NULL,
        'product_name', 'Unknown competitor item',
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
        'observation_key', 'competitor-test:wrong-store',
        'competitor_product_id', 'chaldal:test-b',
        'competitor_product_url', NULL,
        'product_name', 'Competitor test item B',
        'competitor_price', 90,
        'competitor_original_price', NULL,
        'currency', 'BDT',
        'scraped_at', transaction_timestamp(),
        'item_id', '93000000-0000-0000-0000-000000000002',
        'match_confidence', 1,
        'matcher_version', 'matcher-test',
        'raw_data', '{}'::jsonb
      )
    ),
    '{"test":true}'::jsonb
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

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SET LOCAL ROLE authenticated;

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

UPDATE public.competitor_prices
SET scraped_at = transaction_timestamp() - interval '8 days'
WHERE observation_key = 'competitor-test:matched';

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

UPDATE public.competitor_prices
SET scraped_at = transaction_timestamp() - interval '30 days'
WHERE observation_key = 'competitor-test:matched';

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

UPDATE public.competitor_prices
SET scraped_at = transaction_timestamp() - interval '100 days'
WHERE observation_key IN ('competitor-test:matched', 'competitor-test:unmatched');

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

ROLLBACK;
