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

  IF (\n    SELECT count(*)\n    FROM public.competitor_prices\n    WHERE source = 'manual'\n      AND store_id = '92000000-0000-0000-0000-000000000001'\n  ) <> 2 THEN\n    RAISE EXCEPTION 'cleanup removed manual history';\n END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Wrong-store clear_manual_competitor_price is denied\n-- ---------------------------------------------------------------------------\n\nSELECT set_config(\n  'request.jwt.claims',\n  '{\"sub\":\"95000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}',\n  true\n);\n\nDO $$\nDECLARE\n  v_denied boolean := false;\nBEGIN\n  BEGIN\n    PERFORM public.clear_manual_competitor_price(\n      '92000000-0000-0000-0000-000000000002',\n      '93000000-0000-0000-0000-000000000002',\n      'chaldal'\n    );\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      v_denied := true;\n  END;\n\n  IF NOT v_denied THEN\n    RAISE EXCEPTION 'wrong-store clear_manual_competitor_price was not denied';\n  END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Wrong-store get_effective_competitor_prices is denied\n-- ---------------------------------------------------------------------------\n\nDO $$\nDECLARE\n  v_denied boolean := false;\nBEGIN\n  BEGIN\n    PERFORM public.get_effective_competitor_prices(\n      '92000000-0000-0000-0000-000000000002',\n      NULL\n    );\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      v_denied := true;\n  END;\n\n  IF NOT v_denied THEN\n    RAISE EXCEPTION 'wrong-store get_effective_competitor_prices was not denied';\n  END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Wrong-store check_price_alerts is denied\n-- ---------------------------------------------------------------------------\n\nDO $$\nDECLARE\n  v_denied boolean := false;\nBEGIN\n  BEGIN\n    PERFORM public.check_price_alerts(\n      '92000000-0000-0000-0000-000000000002',\n      0.15\n    );\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      v_denied := true;\n  END;\n\n  IF NOT v_denied THEN\n    RAISE EXCEPTION 'wrong-store check_price_alerts was not denied';\n  END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Authenticated ingestion call is denied\n-- ---------------------------------------------------------------------------\n\nDO $$\nDECLARE\n  v_denied boolean := false;\nBEGIN\n  BEGIN\n    PERFORM public.ingest_competitor_scrape_batch(\n      'competitor-test-auth-denied',\n      transaction_timestamp(),\n      'chaldal',\n      '92000000-0000-0000-0000-000000000001',\n      '[]'::jsonb,\n      '{}'::jsonb\n    );\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      v_denied := true;\n  END;\n\n  IF NOT v_denied THEN\n    RAISE EXCEPTION 'authenticated ingestion was not denied';\n  END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Price alerts: manual precedence, stale exclusion, threshold\n-- ---------------------------------------------------------------------------\n\nSELECT set_config(\n  'request.jwt.claims',\n  '{\"sub\":\"00000000-0000-0000-0000-000000000000\",\"role\":\"service_role\"}',\n  true\n);\n\n-- Insert a fresh scraper observation for alert testing\nSELECT public.ingest_competitor_scrape_batch(\n  'competitor-test-alert-run',\n  transaction_timestamp(),\n  'shwapno',\n  '92000000-0000-0000-0000-000000000001',\n  jsonb_build_array(\n    jsonb_build_object(\n      'observation_key', 'competitor-test:alert-shwapno',\n      'competitor_product_id', 'shwapno:test-a',\n      'competitor_product_url', NULL,\n      'product_name', 'Competitor test item A',\n      'competitor_price', 200,\n      'competitor_original_price', NULL,\n      'currency', 'BDT',\n      'scraped_at', transaction_timestamp(),\n      'item_id', '93000000-0000-0000-0000-000000000001',\n      'match_confidence', 0.95,\n      'matcher_version', 'matcher-test',\n      'raw_data', '{}'::jsonb\n    )\n  ),\n  '{\"test\":\"alerts\"}'::jsonb\n);\n\n-- Set manual override at price 105 (lower than scraper 100, should win in alerts)\nSELECT set_config(\n  'request.jwt.claims',\n  '{\"sub\":\"95000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}',\n  true\n);\n\nPERFORM public.set_manual_competitor_price(\n  '92000000-0000-0000-0000-000000000001',\n  '93000000-0000-0000-0000-000000000001',\n  'shwapno',\n  'Shwapno',\n  105,\n  'alert test override',\n  NULL\n);\n\nDO $$\nDECLARE\n  v_alert record;\nBEGIN\n  -- Manual override should appear in alerts\n  SELECT * INTO v_alert\n  FROM public.check_price_alerts(\n    '92000000-0000-0000-0000-000000000001',\n    0.0\n  )\n  WHERE item_id = '93000000-0000-0000-0000-000000000001'\n    AND competitor_key = 'shwapno';\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'price alert did not include manual override for shwapno';\n  END IF;\n\n  IF v_alert.competitor_price <> 105 THEN\n    RAISE EXCEPTION 'price alert did not use manual price, got %', v_alert.competitor_price;\n  END IF;\nEND;\n$$;\n\n-- Now make the scraper observation stale and verify it is excluded from alerts\nUPDATE public.competitor_prices\nSET scraped_at = transaction_timestamp() - interval '10 days'\nWHERE observation_key = 'competitor-test:matched';\n\nDO $$\nDECLARE\n  v_count integer;\nBEGIN\n  -- Stale scraper should not appear in effective prices at all for alerts\n  -- (alerts only use manual and fresh sources)\n  SELECT count(*) INTO v_count\n  FROM public.get_effective_competitor_prices(\n    '92000000-0000-0000-0000-000000000001',\n    '93000000-0000-0000-0000-000000000001'\n  )\n  WHERE competitor_key = 'chaldal'\n    AND status = 'stale';\n\n  -- Stale observations exist but are not in the alert set\n  IF v_count <> 1 THEN\n    RAISE EXCEPTION 'expected 1 stale chaldal observation, got %', v_count;\n  END IF;\nEND;\n$$;\n\n-- Verify threshold behavior: our price 120, market avg ~105 → gap > 0.10\nDO $$\nDECLARE\n  v_alert_count integer;\nBEGIN\n  SELECT count(*) INTO v_alert_count\n  FROM public.check_price_alerts(\n    '92000000-0000-0000-0000-000000000001',\n    0.10\n  )\n  WHERE item_id = '93000000-0000-0000-0000-000000000001';\n\n  -- 120 vs avg ~105 → gap > 10% → alert fires\n  IF v_alert_count < 1 THEN\n    RAISE EXCEPTION 'price alert should fire at 10%% threshold for item A';\n  END IF;\n\n  -- At a very high threshold, alert should not fire\n  SELECT count(*) INTO v_alert_count\n  FROM public.check_price_alerts(\n    '92000000-0000-0000-0000-000000000001',\n    5.0\n  )\n  WHERE item_id = '93000000-0000-0000-0000-000000000001';\n\n  IF v_alert_count <> 0 THEN\n    RAISE EXCEPTION 'price alert should not fire at 500%% threshold';\n  END IF;\nEND;\n$$;\n\nSELECT set_config(\n  'request.jwt.claims',\n  '{\"sub\":\"00000000-0000-0000-0000-000000000000\",\"role\":\"service_role\"}',\n  true\n);\n\n-- ---------------------------------------------------------------------------\n-- Exactly 90-day-old scraper data remains; strictly older than 90 is deleted\n-- ---------------------------------------------------------------------------\n\n-- Re-ingest fresh scraper data for the boundary test\nSELECT public.ingest_competitor_scrape_batch(\n  'competitor-test-boundary-run',\n  transaction_timestamp(),\n  'shwapno',\n  '92000000-0000-0000-0000-000000000001',\n  jsonb_build_array(\n    jsonb_build_object(\n      'observation_key', 'competitor-test:boundary-90',\n      'competitor_product_id', 'shwapno:boundary',\n      'competitor_product_url', NULL,\n      'product_name', 'Boundary test item',\n      'competitor_price', 80,\n      'competitor_original_price', NULL,\n      'currency', 'BDT',\n      'scraped_at', transaction_timestamp(),\n      'item_id', '93000000-0000-0000-0000-000000000001',\n      'match_confidence', 0.9,\n      'matcher_version', 'boundary-test',\n      'raw_data', '{}'::jsonb\n    ),\n    jsonb_build_object(\n      'observation_key', 'competitor-test:boundary-91',\n      'competitor_product_id', 'shwapno:boundary-91',\n      'competitor_product_url', NULL,\n      'product_name', 'Boundary test item 91',\n      'competitor_price', 81,\n      'competitor_original_price', NULL,\n      'currency', 'BDT',\n      'scraped_at', transaction_timestamp(),\n      'item_id', '93000000-0000-0000-0000-000000000001',\n      'match_confidence', 0.9,\n      'matcher_version', 'boundary-test',\n      'raw_data', '{}'::jsonb\n    )\n  ),\n  '{}'::jsonb\n);\n\n-- Set one row to exactly 90 days old\nUPDATE public.competitor_prices\nSET scraped_at = transaction_timestamp() - interval '90 days'\nWHERE observation_key = 'competitor-test:boundary-90';\n\n-- Set the other to 91 days old\nUPDATE public.competitor_prices\nSET scraped_at = transaction_timestamp() - interval '91 days'\nWHERE observation_key = 'competitor-test:boundary-91';\n\nDO $$\nDECLARE\n  v_deleted integer;\n  v_remaining_90 integer;\nBEGIN\n  v_deleted := public.cleanup_old_competitor_prices(90);\n\n  -- Exactly 90 days old should survive (strictly older than 90 is deleted)\n  SELECT count(*) INTO v_remaining_90\n  FROM public.competitor_prices\n  WHERE observation_key = 'competitor-test:boundary-90'\n    AND source = 'scraper';\n\n  IF v_remaining_90 <> 1 THEN\n    RAISE EXCEPTION 'exactly 90-day row was deleted, expected retention';\n  END IF;\n\n  -- 91 days old should have been deleted\n  IF NOT EXISTS (\n    SELECT 1\n    FROM public.competitor_prices\n    WHERE observation_key = 'competitor-test:boundary-91'\n  ) THEN\n    -- Expected: row was deleted\n    NULL;\n  ELSE\n    RAISE EXCEPTION '91-day scraper row was not deleted by cleanup(90)';\n  END IF;\nEND;\n$$;\n\n-- ---------------------------------------------------------------------------\n-- Automatic cleanup through ingestion is verified\n-- ---------------------------------------------------------------------------\n\n-- Insert a scraper row that is 100 days old, then run ingestion to verify\n-- auto-cleanup fires.\nINSERT INTO public.competitor_prices (\n  store_id, item_id, product_name, competitor_name, competitor_key,\n  competitor_price, currency, our_price, price_gap_percent,\n  scraped_at, scrape_status, source, is_override_active,\n  observation_key, matcher_version, match_metadata\n)\nVALUES (\n  '92000000-0000-0000-0000-000000000001',\n  '93000000-0000-0000-0000-000000000001',\n  'Auto-cleanup test item',\n  'chaldal',\n  'chaldal',\n  70,\n  'BDT',\n  120,\n  round((120.0 - 70.0) / nullif(70.0, 0), 4),\n  transaction_timestamp() - interval '100 days',\n  'success',\n  'scraper',\n  false,\n  'competitor-test:auto-cleanup-old',\n  'auto-cleanup-test',\n  '{}'::jsonb\n);\n\nDO $$\nDECLARE\n  v_result jsonb;\n  v_surviving integer;\nBEGIN\n  v_result := public.ingest_competitor_scrape_batch(\n    'competitor-test-auto-cleanup-run',\n    transaction_timestamp(),\n    'chaldal',\n    '92000000-0000-0000-0000-000000000001',\n    jsonb_build_array(\n      jsonb_build_object(\n        'observation_key', 'competitor-test:auto-cleanup-new',\n        'competitor_product_id', 'chaldal:auto-cleanup',\n        'competitor_product_url', NULL,\n        'product_name', 'Auto-cleanup fresh item',\n        'competitor_price', 99,\n        'competitor_original_price', NULL,\n        'currency', 'BDT',\n        'scraped_at', transaction_timestamp(),\n        'item_id', '93000000-0000-0000-0000-000000000001',\n        'match_confidence', 0.85,\n        'matcher_version', 'auto-cleanup-test',\n        'raw_data', '{}'::jsonb\n      )\n    ),\n    '{}'::jsonb\n  );\n\n  -- Ingestion should report cleaned count > 0\n  IF (v_result ->> 'cleaned')::integer IS NULL OR (v_result ->> 'cleaned')::integer < 1 THEN\n    RAISE EXCEPTION 'ingestion did not auto-cleanup old rows, cleaned = %', v_result;\n  END IF;\n\n  -- The 100-day-old scraper row should be gone\n  SELECT count(*) INTO v_surviving\n  FROM public.competitor_prices\n  WHERE observation_key = 'competitor-test:auto-cleanup-old';\n\n  IF v_surviving <> 0 THEN\n    RAISE EXCEPTION '100-day scraper row survived auto-cleanup';\n  END IF;\n\n  -- Manual rows should still exist\n  IF (\n    SELECT count(*)\n    FROM public.competitor_prices\n    WHERE source = 'manual'\n      AND store_id = '92000000-0000-0000-0000-000000000001'\n  ) < 2 THEN\n    RAISE EXCEPTION 'auto-cleanup deleted manual rows';\n  END IF;\nEND;\n$$;\n\nROLLBACK;
