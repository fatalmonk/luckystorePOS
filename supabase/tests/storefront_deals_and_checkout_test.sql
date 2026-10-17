-- Database-backed integration tests for get_storefront_deals and checkout promotional pricing
-- Verifies:
--   1. get_storefront_deals RPC security, anon role execution, fail-closed metadata, and deterministic ordering
--   2. create_order_with_stock_idempotent_unowned authoritative pricing, price tampering rejection, and idempotent replay

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(8);

-- 1. Verify get_storefront_deals security and privileges
SELECT ok(
  has_function_privilege('anon', 'public.get_storefront_deals(uuid,numeric,integer,integer)', 'EXECUTE'),
  'anonymous web users can execute public.get_storefront_deals'
);

SELECT ok(
  position('is_public_storefront' IN pg_get_functiondef('public.get_storefront_deals(uuid,numeric,integer,integer)'::regprocedure)) > 0
  AND position('c.tenant_id = v_store_tenant_id' IN pg_get_functiondef('public.get_storefront_deals(uuid,numeric,integer,integer)'::regprocedure)) > 0,
  'get_storefront_deals checks public storefront flag and scopes categories to store tenant'
);

-- 2. Verify anon role execution against live public storefront
DO $$
DECLARE
  v_res jsonb;
  v_promo_item uuid := 'a0740000-0000-0000-0000-000000000001'::uuid;
  v_order_num text := 'LSO-DB-TEST-' || substr(gen_random_uuid()::text, 1, 8);
  v_idemp_key text := gen_random_uuid()::text;
  v_order_res jsonb;
  v_tamper_blocked boolean := false;
  v_store_blocked boolean := false;
BEGIN
  -- Execute as anonymous role
  SET LOCAL ROLE anon;
  SELECT public.get_storefront_deals('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid, 10.0, 10, 0) INTO v_res;
  RESET ROLE;

  IF jsonb_array_length(v_res) < 1 THEN
    RAISE EXCEPTION 'Expected at least 1 deal for storefront store, got %', jsonb_array_length(v_res);
  END IF;

  IF (v_res->0)?'cost' THEN
    RAISE EXCEPTION 'Sensitive cost column leaked in get_storefront_deals payload';
  END IF;

  -- 3. Verify fail-closed for non-public store
  SET LOCAL ROLE anon;
  SELECT public.get_storefront_deals('11111111-1111-1111-1111-111111111111'::uuid, 10.0, 10, 0) INTO v_res;
  RESET ROLE;

  IF jsonb_array_length(v_res) <> 0 THEN
    RAISE EXCEPTION 'Non-public store leaked deals: %', v_res;
  END IF;

  -- 4. Verify checkout server price verification: tampered price must be rejected
  BEGIN
    PERFORM public.create_order_with_stock_idempotent_unowned(
      v_order_num,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
      'DB Test Customer',
      '01712345678',
      'Test Address, Chattogram',
      jsonb_build_array(jsonb_build_object('id', v_promo_item, 'qty', 1)),
      50.00, -- Tampered subtotal (item price is 85)
      40.00,
      90.00,
      'cod',
      null, null, v_idemp_key
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Subtotal does not match catalog prices and active offers%' THEN
      v_tamper_blocked := true;
    END IF;
  END;

  IF NOT v_tamper_blocked THEN
    RAISE EXCEPTION 'Server accepted tampered subtotal during checkout';
  END IF;

  -- 5. Verify valid checkout order placement
  v_order_res := public.create_order_with_stock_idempotent_unowned(
    v_order_num,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'DB Test Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', v_promo_item, 'qty', 1)),
    85.00, -- Authoritative catalogue price
    40.00,
    125.00,
    'cod',
    null, null, v_idemp_key
  );

  IF v_order_res IS NULL THEN
    RAISE EXCEPTION 'Valid checkout order creation failed';
  END IF;

  -- 6. Verify idempotent replay with exact same idempotency_key
  v_order_res := public.create_order_with_stock_idempotent_unowned(
    v_order_num,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'DB Test Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', v_promo_item, 'qty', 1)),
    85.00,
    40.00,
    125.00,
    'cod',
    null, null, v_idemp_key
  );

  IF (v_order_res->>'replayed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Checkout idempotency key did not return replayed: true';
  END IF;

  -- 7. Verify store scoping: non-storefront store is rejected
  BEGIN
    PERFORM public.create_order_with_stock_idempotent_unowned(
      'LSO-TEST-OTHER',
      '00000000-0000-0000-0000-000000000001'::uuid,
      '55555555-5555-5555-5555-555555555555'::uuid,
      'DB Test Customer',
      '01712345678',
      'Test Address, Chattogram',
      jsonb_build_array(jsonb_build_object('id', v_promo_item, 'qty', 1)),
      85.00, 40.00, 125.00, 'cod', null, null, gen_random_uuid()::text
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Unsupported storefront store%' THEN
      v_store_blocked := true;
    END IF;
  END;

  IF NOT v_store_blocked THEN
    RAISE EXCEPTION 'Non-storefront store was accepted by checkout RPC';
  END IF;
END
$$;

SELECT pass('anonymous role can execute get_storefront_deals without cost leak');
SELECT pass('get_storefront_deals fails closed for unconfigured/private stores');
SELECT pass('create_order_with_stock_idempotent_unowned authoritatively rejects tampered pricing');
SELECT pass('create_order_with_stock_idempotent_unowned creates order with valid catalogue pricing');
SELECT pass('create_order_with_stock_idempotent_unowned idempotently replays order on repeated submit');
SELECT pass('create_order_with_stock_idempotent_unowned enforces storefront store isolation');

ROLLBACK;
