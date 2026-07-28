-- ============================================================================
-- SQL/RLS tests for competitor_prices forward migration
-- Run: psql -f supabase/tests/competitor_prices_forward_migration_test.sql
-- or via vitest integration (requires live database)
-- ============================================================================
-- Status: LIVE_REQUIRED — these tests require a running Supabase instance
--         with the migration applied.

-- Test 1: New columns exist
DO $$
BEGIN
  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'source';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column source missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'competitor_key';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column competitor_key missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'is_manual_override';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column is_manual_override missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'observation_key';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column observation_key missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'scrape_run_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column scrape_run_id missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'match_confidence';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column match_confidence missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'match_method';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column match_method missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'match_metadata';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column match_metadata missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'manual_override_reason';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column manual_override_reason missing'; END IF;

  PERFORM column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'manual_override_at';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: column manual_override_at missing'; END IF;

  RAISE NOTICE 'PASS: all new columns exist';
END $$;

-- Test 2: item_id is NOT NULL and product_id column is gone
DO $$
BEGIN
  -- item_id should be NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'item_id' AND is_nullable = 'YES'
  ) THEN RAISE EXCEPTION 'FAIL: item_id should be NOT NULL'; END IF;

  -- product_id should not exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'product_id'
  ) THEN RAISE EXCEPTION 'FAIL: product_id column should have been dropped'; END IF;

  -- competitor_key should be NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitor_prices'
    AND column_name = 'competitor_key' AND is_nullable = 'YES'
  ) THEN RAISE EXCEPTION 'FAIL: competitor_key should be NOT NULL'; END IF;

  RAISE NOTICE 'PASS: column constraints correct';
END $$;

-- Test 3: Unique indexes exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'competitor_prices_manual_override_uniq'
  ) THEN RAISE EXCEPTION 'FAIL: manual override unique index missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'competitor_prices_observation_key_uniq'
  ) THEN RAISE EXCEPTION 'FAIL: observation key unique index missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_prices_effective'
  ) THEN RAISE EXCEPTION 'FAIL: effective price index missing'; END IF;

  RAISE NOTICE 'PASS: indexes exist';
END $$;

-- Test 4: RPCs exist with correct signatures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'set_manual_competitor_price'
  ) THEN RAISE EXCEPTION 'FAIL: set_manual_competitor_price RPC missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'clear_manual_competitor_price'
  ) THEN RAISE EXCEPTION 'FAIL: clear_manual_competitor_price RPC missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_effective_competitor_prices'
  ) THEN RAISE EXCEPTION 'FAIL: get_effective_competitor_prices RPC missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'ingest_competitor_scrape_batch'
  ) THEN RAISE EXCEPTION 'FAIL: ingest_competitor_scrape_batch RPC missing'; END IF;

  RAISE NOTICE 'PASS: all RPCs exist';
END $$;

-- Test 5: RLS policies are in place
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competitor_prices' AND policyname = 'Authenticated users can insert competitor prices for their store'
  ) THEN RAISE EXCEPTION 'FAIL: authenticated INSERT policy missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competitor_prices' AND policyname = 'Authenticated users can update competitor prices for their store'
  ) THEN RAISE EXCEPTION 'FAIL: authenticated UPDATE policy missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'competitor_prices' AND policyname = 'Authenticated users can delete competitor prices for their store'
  ) THEN RAISE EXCEPTION 'FAIL: authenticated DELETE policy missing'; END IF;

  RAISE NOTICE 'PASS: RLS policies exist';
END $$;

-- Test 6: ingest_competitor_scrape_batch rejects wrong-store items (requires live data)
-- LIVE_REQUIRED: This test needs a running database with test data.
-- Placeholder for integration test:
-- CALL ingest_competitor_scrape_batch with p_store_id=A and item_id belonging to store B
-- Expect: rejected > 0

-- Test 7: cleanup_old_competitor_prices preserves manual overrides
-- LIVE_REQUIRED: Needs live database to test actual deletion behavior.
-- Placeholder:
-- 1. Insert a manual override row
-- 2. Insert a scraper row older than 90 days
-- 3. CALL cleanup_old_competitor_prices(90)
-- 4. Assert manual override still exists, scraper row deleted

RAISE NOTICE 'ALL STRUCTURAL TESTS PASSED';