-- Focused SQL assertions for idempotency, scan authorization, and tenant scope.
-- Run with psql -v ON_ERROR_STOP=1 against the authorized disposable project.

-- Run on the authorized disposable test database only. The enclosing
-- transaction ensures fixtures never persist, including when a later test fails.
BEGIN;

DO $$
BEGIN
  -- Supabase maps the project's postgres.grxx... login to the `postgres`
  -- database role. The test runner verifies the project URL and DB username
  -- before connecting, then sets this application_name marker for SQL checks.
  IF NOT (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    OR (
      session_user = 'postgres'
      AND current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo'
    )
  ) THEN
    RAISE EXCEPTION 'proof tests may run only against the authorized disposable project';
  END IF;
END $$;

-- ============================================================================
-- TEST SUITE: Focused database invariants
-- ============================================================================

-- Test 1: Tenant-scoped idempotency allows same key across tenants
DO $$
DECLARE
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_key text := 'test-key-' || gen_random_uuid()::text;
  v_result_a jsonb;
  v_result_b jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Setup: Create two tenants
  INSERT INTO public.tenants (name) VALUES ('Tenant A') RETURNING id INTO v_tenant_a;
  INSERT INTO public.tenants (name) VALUES ('Tenant B') RETURNING id INTO v_tenant_b;

  -- Test: Same idempotency key should work independently for both tenants
  v_result_a := public.check_idempotency(v_key, v_tenant_a);
  v_result_b := public.check_idempotency(v_key, v_tenant_b);

  IF v_result_a IS NOT NULL THEN
    RAISE EXCEPTION '[FAIL] Test 1: Tenant A first call should return NULL';
  END IF;

  IF v_result_b IS NOT NULL THEN
    RAISE EXCEPTION '[FAIL] Test 1: Tenant B first call should return NULL';
  END IF;

  RAISE NOTICE '[PASS] Test 1: Same key works independently across tenants';

  -- Cleanup
  DELETE FROM public.idempotency_keys WHERE idempotency_key = v_key;
  DELETE FROM public.tenants WHERE id IN (v_tenant_a, v_tenant_b);
END $$;

-- Test 2: A second sequential claim while the first is pending is rejected.
-- The true two-session race is covered by idempotency_concurrency.test.ts.
DO $$
DECLARE
  v_tenant_id uuid;
  v_key text := 'duplicate-' || gen_random_uuid()::text;
  v_first_result jsonb;
  v_second_result jsonb;
  v_exception_raised boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Setup
  INSERT INTO public.tenants (name) VALUES ('Concurrent Test Tenant') RETURNING id INTO v_tenant_id;

  -- First call claims the key
  v_first_result := public.check_idempotency(v_key, v_tenant_id);

  IF v_first_result IS NOT NULL THEN
    RAISE EXCEPTION '[FAIL] Test 2: First call should return NULL (proceed)';
  END IF;

  -- A second call while the first claim remains pending should be rejected.
  BEGIN
    v_second_result := public.check_idempotency(v_key, v_tenant_id);

    -- If we get here without exception, check if response is NULL or error
    IF v_second_result IS NULL THEN
      RAISE EXCEPTION '[FAIL] Test 2: Second pending claim returned NULL (would duplicate operation)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'idempotency key conflict: concurrent request in progress' THEN
        v_exception_raised := true;
      ELSE
        RAISE EXCEPTION '[FAIL] Test 2: Wrong exception: %', SQLERRM;
      END IF;
  END;

  IF v_exception_raised THEN
    RAISE NOTICE '[PASS] Test 2: Duplicate pending claim correctly rejected';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 2: No exception raised for the duplicate pending claim';
  END IF;

  -- Cleanup
  DELETE FROM public.idempotency_keys WHERE idempotency_key = v_key;
  DELETE FROM public.tenants WHERE id = v_tenant_id;
END $$;

-- Test 3: Completed idempotency returns cached response
DO $$
DECLARE
  v_tenant_id uuid;
  v_key text := 'replay-' || gen_random_uuid()::text;
  v_first jsonb;
  v_cached jsonb;
  v_test_response jsonb := '{"status": "success", "test_id": 12345}'::jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Setup
  INSERT INTO public.tenants (name) VALUES ('Replay Test Tenant') RETURNING id INTO v_tenant_id;

  -- First call
  v_first := public.check_idempotency(v_key, v_tenant_id);

  IF v_first IS NOT NULL THEN
    RAISE EXCEPTION '[FAIL] Test 3: First call should return NULL';
  END IF;

  -- Simulate operation completion
  UPDATE public.idempotency_keys
  SET response_body = v_test_response,
      completed_at = clock_timestamp(),
      status = 'COMPLETED'
  WHERE idempotency_key = v_key AND tenant_id = v_tenant_id;

  -- Replay call should return cached response
  v_cached := public.check_idempotency(v_key, v_tenant_id);

  IF v_cached IS NULL THEN
    RAISE EXCEPTION '[FAIL] Test 3: Replay should return cached response, got NULL';
  END IF;

  IF v_cached->>'test_id' <> '12345' THEN
    RAISE EXCEPTION '[FAIL] Test 3: Wrong cached response: %', v_cached;
  END IF;

  RAISE NOTICE '[PASS] Test 3: Idempotency replay returns cached response';

  -- Cleanup
  DELETE FROM public.idempotency_keys WHERE idempotency_key = v_key;
  DELETE FROM public.tenants WHERE id = v_tenant_id;
END $$;

-- Test 4: Anonymous scan denied on non-public store
DO $$
DECLARE
  v_tenant_id uuid;
  v_store_id uuid;
  v_item_id uuid;
BEGIN
  IF NOT has_function_privilege(
    'anon',
    'public.lookup_item_by_scan_anon(text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '[FAIL] Test 4: anon cannot execute the public scanner RPC';
  END IF;

  -- Setup: Create tenant, non-public store, item
  INSERT INTO public.tenants (name) VALUES ('Scan Test Tenant') RETURNING id INTO v_tenant_id;
  INSERT INTO public.stores (tenant_id, name, metadata)
  VALUES (v_tenant_id, 'Private Store', '{"is_public_storefront": false}'::jsonb)
  RETURNING id INTO v_store_id;

  INSERT INTO public.items (tenant_id, name, barcode, price, mrp, is_active)
  VALUES (v_tenant_id, 'Test Item', 'TEST-SCAN', 100, 120, true)
  RETURNING id INTO v_item_id;

  PERFORM set_config('p0_scan.tenant_id', v_tenant_id::text, true);
  PERFORM set_config('p0_scan.store_id', v_store_id::text, true);
  PERFORM set_config('p0_scan.item_id', v_item_id::text, true);
END $$;

SET LOCAL ROLE anon;
DO $$
DECLARE
  v_store_id uuid;
  v_exception_raised boolean := false;
BEGIN
  v_store_id := current_setting('p0_scan.store_id')::uuid;

  -- Execute as anon, not the privileged fixture owner.
  BEGIN
    PERFORM 1 FROM public.lookup_item_by_scan_anon('TEST-SCAN', v_store_id);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'Store not public for anonymous users' THEN
      RAISE EXCEPTION '[FAIL] Test 4: Wrong denial reason: %', SQLERRM;
    END IF;
    v_exception_raised := true;
  END;

  IF v_exception_raised THEN
    RAISE NOTICE '[PASS] Test 4: Anonymous scanner RPC denies a private store';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 4: No exception raised';
  END IF;
END $$;
RESET ROLE;

DO $$
DECLARE
  v_tenant_id uuid := current_setting('p0_scan.tenant_id')::uuid;
  v_store_id uuid := current_setting('p0_scan.store_id')::uuid;
  v_item_id uuid := current_setting('p0_scan.item_id')::uuid;
BEGIN
  DELETE FROM public.items WHERE id = v_item_id;
  DELETE FROM public.stores WHERE id = v_store_id;
  DELETE FROM public.tenants WHERE id = v_tenant_id;
END $$;

-- Test 5: An authenticated user cannot scan a store in another tenant.
DO $$
DECLARE
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_store_a uuid;
  v_store_b uuid;
  v_item_a uuid;
  v_user_b uuid;
  v_error text;
BEGIN
  IF NOT has_function_privilege(
    'authenticated',
    'public.lookup_item_by_scan(text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '[FAIL] Test 5: authenticated cannot execute the POS scanner RPC';
  END IF;

  -- Setup: Two tenants, store A belongs to tenant A, user B belongs to tenant B
  INSERT INTO public.tenants (name) VALUES ('Tenant A') RETURNING id INTO v_tenant_a;
  INSERT INTO public.tenants (name) VALUES ('Tenant B') RETURNING id INTO v_tenant_b;

  INSERT INTO public.stores (tenant_id, name)
  VALUES (v_tenant_a, 'Store A') RETURNING id INTO v_store_a;

  INSERT INTO public.stores (tenant_id, name)
  VALUES (v_tenant_b, 'Store B') RETURNING id INTO v_store_b;

  INSERT INTO public.items (tenant_id, name, barcode, price, mrp, is_active)
  VALUES (v_tenant_a, 'Item A', 'CROSS-TENANT', 100, 120, true)
  RETURNING id INTO v_item_a;

  v_user_b := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) VALUES (
    v_user_b, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_user_b::text || '@test.invalid', '',
    now(), now(), now()
  );
  INSERT INTO public.users (id, auth_id, email, role, store_id, tenant_id, name)
  VALUES (
    v_user_b, v_user_b, v_user_b::text || '@test.invalid', 'manager',
    v_store_b, v_tenant_b, 'Cross-tenant scan test user'
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'authenticated', 'sub', v_user_b)::text,
    true
  );

  BEGIN
    PERFORM 1 FROM public.lookup_item_by_scan('CROSS-TENANT', v_store_a);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_error := SQLERRM;
  END;

  IF v_error IS DISTINCT FROM 'Access denied: store belongs to different tenant' THEN
    RAISE EXCEPTION '[FAIL] Test 5: Expected cross-tenant denial, got %', v_error;
  END IF;
  RAISE NOTICE '[PASS] Test 5: Authenticated cross-tenant scan is rejected';

  -- Cleanup
  DELETE FROM public.users WHERE id = v_user_b;
  DELETE FROM auth.users WHERE id = v_user_b;
  DELETE FROM public.items WHERE id = v_item_a;
  DELETE FROM public.stores WHERE id IN (v_store_a, v_store_b);
  DELETE FROM public.tenants WHERE id IN (v_tenant_a, v_tenant_b);
END $$;

-- Test 6: Invoice allocation enforces caller and party tenant ownership.
DO $$
DECLARE
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_party_b uuid;
  v_store_a uuid;
  v_user_a uuid;
  v_error text;
BEGIN
  IF NOT has_function_privilege(
    'authenticated',
    'public.allocate_payment_to_invoices(uuid,uuid,numeric,uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '[FAIL] Test 6: authenticated cannot execute invoice allocation';
  END IF;

  -- Setup
  INSERT INTO public.tenants (name) VALUES ('Tenant A') RETURNING id INTO v_tenant_a;
  INSERT INTO public.tenants (name) VALUES ('Tenant B') RETURNING id INTO v_tenant_b;

  INSERT INTO public.stores (tenant_id, name)
  VALUES (v_tenant_a, 'Allocation Store A') RETURNING id INTO v_store_a;

  INSERT INTO public.parties (tenant_id, name, party_type)
  VALUES (v_tenant_b, 'Party B', 'customer') RETURNING id INTO v_party_b;

  v_user_a := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) VALUES (
    v_user_a, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_user_a::text || '@test.invalid', '',
    now(), now(), now()
  );
  INSERT INTO public.users (id, auth_id, email, role, store_id, tenant_id, name)
  VALUES (
    v_user_a, v_user_a, v_user_a::text || '@test.invalid', 'manager',
    v_store_a, v_tenant_a, 'Invoice allocation test manager'
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'authenticated', 'sub', v_user_a)::text,
    true
  );

  BEGIN
    PERFORM public.allocate_payment_to_invoices(v_tenant_b, v_party_b, 100);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_error := SQLERRM;
  END;
  IF v_error IS DISTINCT FROM 'Access denied: caller not in target tenant' THEN
    RAISE EXCEPTION '[FAIL] Test 6: Expected caller tenant denial, got %', v_error;
  END IF;

  v_error := NULL;
  BEGIN
    PERFORM public.allocate_payment_to_invoices(v_tenant_a, v_party_b, 100);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_error := SQLERRM;
  END;
  IF v_error IS DISTINCT FROM 'Party not found in target tenant' THEN
    RAISE EXCEPTION '[FAIL] Test 6: Expected party tenant denial, got %', v_error;
  END IF;
  RAISE NOTICE '[PASS] Test 6: Allocation rejects caller and party tenant mismatches';

  -- Cleanup
  DELETE FROM public.users WHERE id = v_user_a;
  DELETE FROM auth.users WHERE id = v_user_a;
  DELETE FROM public.parties WHERE id = v_party_b;
  DELETE FROM public.stores WHERE id = v_store_a;
  DELETE FROM public.tenants WHERE id IN (v_tenant_a, v_tenant_b);
END $$;

-- Test 7: compatibility migration preserves both synchronized party type columns
DO $$
DECLARE
  v_has_party_type boolean;
  v_has_type boolean;
  v_trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parties'
      AND column_name = 'party_type'
  ) INTO v_has_party_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parties'
      AND column_name = 'type'
  ) INTO v_has_type;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.parties'::regclass
      AND tgname = 'trg_sync_party_type_columns'
      AND NOT tgisinternal
  ) INTO v_trigger_exists;

  IF NOT v_has_party_type OR NOT v_has_type THEN
    RAISE EXCEPTION '[FAIL] Test 7: compatibility columns parties.party_type and parties.type must both exist';
  END IF;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION '[FAIL] Test 7: party type compatibility trigger does not exist';
  END IF;

  RAISE NOTICE '[PASS] Test 7: party type compatibility columns and trigger exist';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'FOCUSED DATABASE ASSERTIONS COMPLETE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All 7 SQL assertions passed:';
  RAISE NOTICE '  ✓ Test 1: Tenant-scoped idempotency (same key, different tenants)';
  RAISE NOTICE '  ✓ Test 2: Sequential duplicate pending claim rejection';
  RAISE NOTICE '  ✓ Test 3: Idempotency replay returns cached response';
  RAISE NOTICE '  ✓ Test 4: Anonymous scan denied on private store';
  RAISE NOTICE '  ✓ Test 5: Authenticated scan tenant boundary';
  RAISE NOTICE '  ✓ Test 6: Cross-tenant party allocation denied';
  RAISE NOTICE '  ✓ Test 7: party type compatibility columns and trigger';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

-- The true concurrent two-connection race is tested in Vitest separately.
ROLLBACK;
