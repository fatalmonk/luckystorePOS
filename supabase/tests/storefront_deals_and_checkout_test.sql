-- Database-backed integration tests for get_storefront_deals and checkout promotional pricing
-- Verifies:
--   1. get_storefront_deals RPC security, anon role execution, fail-closed metadata, and deterministic ordering
--   2. create_order_with_stock_idempotent_unowned authoritative pricing, price tampering rejection, and idempotent replay

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(13);

-- Test 1: Function execute privilege granted to anonymous web users
SELECT ok(
  has_function_privilege('anon', 'public.get_storefront_deals(uuid,numeric,integer,integer)', 'EXECUTE'),
  'anonymous web role can execute public.get_storefront_deals'
);

-- Test 2: Function verifies is_public_storefront fail-closed
SELECT ok(
  position('is_public_storefront' IN pg_get_functiondef('public.get_storefront_deals(uuid,numeric,integer,integer)'::regprocedure)) > 0,
  'get_storefront_deals checks is_public_storefront flag'
);

-- Test 3: Function enforces tenant-scoped category join
SELECT ok(
  position('c.tenant_id = v_store_tenant_id' IN pg_get_functiondef('public.get_storefront_deals(uuid,numeric,integer,integer)'::regprocedure)) > 0,
  'get_storefront_deals scopes category join to store tenant'
);

-- Test Fixture Setup
DO $$
DECLARE
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_store_id uuid := '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid;
  v_item_deal uuid := '99990000-0000-0000-0000-000000000001'::uuid;
  v_item_sub10 uuid := '99990000-0000-0000-0000-000000000002'::uuid;
  v_item_nostock uuid := '99990000-0000-0000-0000-000000000003'::uuid;
  v_item_promo uuid := '99990000-0000-0000-0000-000000000004'::uuid;
  v_item_expired uuid := '99990000-0000-0000-0000-000000000005'::uuid;
  v_priv_store uuid := '88880000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Private store without is_public_storefront
  INSERT INTO public.stores (id, name, tenant_id, metadata)
  VALUES (v_priv_store, 'Private Store', v_tenant_id, '{"is_public_storefront": false}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET metadata = '{"is_public_storefront": false}'::jsonb;

  -- 1. Valid deal item: MRP 100, Price 80 (20% discount), stock 10
  INSERT INTO public.items (id, tenant_id, name, price, mrp, is_active, cost)
  VALUES (v_item_deal, v_tenant_id, 'PGTAP Valid Deal Item', 80.00, 100.00, true, 50.00)
  ON CONFLICT (id) DO UPDATE SET price = 80.00, mrp = 100.00, is_active = true;

  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online)
  VALUES (v_store_id, v_item_deal, v_tenant_id, 10, 0, 0)
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = 10, reserved = 0, qty_reserved_online = 0;

  -- 2. Sub-10% discount item: MRP 100, Price 95 (5% discount) -> should be excluded
  INSERT INTO public.items (id, tenant_id, name, price, mrp, is_active)
  VALUES (v_item_sub10, v_tenant_id, 'PGTAP Sub-10 Item', 95.00, 100.00, true)
  ON CONFLICT (id) DO UPDATE SET price = 95.00, mrp = 100.00, is_active = true;

  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online)
  VALUES (v_store_id, v_item_sub10, v_tenant_id, 10, 0, 0)
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = 10, reserved = 0, qty_reserved_online = 0;

  -- 3. Out of stock deal item: MRP 100, Price 70, qty 5, reserved 5 -> sellable 0 -> should be excluded
  INSERT INTO public.items (id, tenant_id, name, price, mrp, is_active)
  VALUES (v_item_nostock, v_tenant_id, 'PGTAP Out Of Stock Deal', 70.00, 100.00, true)
  ON CONFLICT (id) DO UPDATE SET price = 70.00, mrp = 100.00, is_active = true;

  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online)
  VALUES (v_store_id, v_item_nostock, v_tenant_id, 5, 5, 0)
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = 5, reserved = 5, qty_reserved_online = 0;

  -- 4. Active campaign item for promotional checkout test: Base Price 200, MRP 250, 5% weekly promo
  INSERT INTO public.items (id, tenant_id, name, price, mrp, is_active)
  VALUES (v_item_promo, v_tenant_id, 'PGTAP Promo Tea 400g', 200.00, 250.00, true)
  ON CONFLICT (id) DO UPDATE SET price = 200.00, mrp = 250.00, is_active = true;

  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online)
  VALUES (v_store_id, v_item_promo, v_tenant_id, 20, 0, 0)
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = 20, reserved = 0, qty_reserved_online = 0;

  INSERT INTO public.storefront_item_promotions (
    tenant_id, store_id, item_id, expected_name, expected_price, expected_mrp,
    discount_percent, campaign_key, is_current, starts_at, ends_at,
    selection_reason, offer_terms, evidence_source, evidence_checked_at
  ) VALUES (
    v_tenant_id, v_store_id, v_item_promo, 'PGTAP Promo Tea 400g', 200.00, 250.00,
    5, 'dealoftheweek-test', true, statement_timestamp() - interval '1 hour', statement_timestamp() + interval '1 day',
    'Editor deal', 'Online checkout', 'Snapshot', statement_timestamp() - interval '2 hour'
  ) ON CONFLICT (campaign_key, item_id, revision) DO UPDATE
    SET starts_at = statement_timestamp() - interval '1 hour', ends_at = statement_timestamp() + interval '1 day';

  -- 5. Expired campaign item: Base Price 100, MRP 120, promo ended yesterday
  INSERT INTO public.items (id, tenant_id, name, price, mrp, is_active)
  VALUES (v_item_expired, v_tenant_id, 'PGTAP Expired Coffee 200g', 100.00, 120.00, true)
  ON CONFLICT (id) DO UPDATE SET price = 100.00, mrp = 120.00, is_active = true;

  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online)
  VALUES (v_store_id, v_item_expired, v_tenant_id, 20, 0, 0)
  ON CONFLICT (store_id, item_id) DO UPDATE SET qty = 20, reserved = 0, qty_reserved_online = 0;

  INSERT INTO public.storefront_item_promotions (
    tenant_id, store_id, item_id, expected_name, expected_price, expected_mrp,
    discount_percent, campaign_key, is_current, starts_at, ends_at,
    selection_reason, offer_terms, evidence_source, evidence_checked_at
  ) VALUES (
    v_tenant_id, v_store_id, v_item_expired, 'PGTAP Expired Coffee 200g', 100.00, 120.00,
    10, 'expired-test', true, statement_timestamp() - interval '2 days', statement_timestamp() - interval '1 hour',
    'Old deal', 'Online checkout', 'Snapshot', statement_timestamp() - interval '3 days'
  ) ON CONFLICT (campaign_key, item_id, revision) DO UPDATE
    SET starts_at = statement_timestamp() - interval '2 days', ends_at = statement_timestamp() - interval '1 hour';
END $$;

-- Test 4: get_storefront_deals includes valid 20% deal item
SELECT ok(
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      public.get_storefront_deals('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid, 10.0, 50, 0)
    ) item WHERE item->>'id' = '99990000-0000-0000-0000-000000000001'
      AND (item->>'discount_percent')::int = 20
      AND (item->>'sellable_qty')::int = 10
  ),
  'get_storefront_deals returns valid item with correct discount_percent and sellable_qty'
);

-- Test 5: get_storefront_deals never leaks cost column to caller
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      public.get_storefront_deals('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid, 10.0, 50, 0)
    ) item WHERE item ? 'cost'
  ),
  'get_storefront_deals payload strictly excludes sensitive cost column'
);

-- Test 6: get_storefront_deals excludes sub-10% discount items
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      public.get_storefront_deals('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid, 10.0, 50, 0)
    ) item WHERE item->>'id' = '99990000-0000-0000-0000-000000000002'
  ),
  'get_storefront_deals excludes items discounted by less than 10%'
);

-- Test 7: get_storefront_deals excludes out-of-stock / fully reserved items
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      public.get_storefront_deals('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid, 10.0, 50, 0)
    ) item WHERE item->>'id' = '99990000-0000-0000-0000-000000000003'
  ),
  'get_storefront_deals excludes items where sellable stock is zero'
);

-- Test 8: Fail-closed on private store
SELECT is(
  public.get_storefront_deals('88880000-0000-0000-0000-000000000001'::uuid, 10.0, 50, 0),
  '[]'::jsonb,
  'get_storefront_deals fails closed (empty array) for non-public stores'
);

-- Test 9: Active weekly promotion calculation (base 200, 5% promo -> unit price 190, delivery 40 -> total 230)
SELECT ok(
  (public.create_order_with_stock_idempotent_unowned(
    'LSO-TEST-PROMO-01',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'Promo Test Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', '99990000-0000-0000-0000-000000000004'::uuid, 'qty', 1)),
    190.00, 40.00, 230.00, 'cod', null, null, 'a1000000-0000-4000-8000-000000000001'
  ) -> 'order' ->> 'order_number') = 'LSO-TEST-PROMO-01',
  'checkout procedure authoritatively applies 5% weekly campaign discount'
);

-- Test 10: Subtotal price tampering is rejected
SELECT throws_ok(
  $$SELECT public.create_order_with_stock_idempotent_unowned(
    'LSO-TEST-TAMPER-01',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'Tamper Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', '99990000-0000-0000-0000-000000000004'::uuid, 'qty', 1)),
    150.00, 40.00, 190.00, 'cod', null, null, 'a1000000-0000-4000-8000-000000000002'
  )$$,
  'Subtotal does not match catalog prices and active offers',
  'checkout procedure throws when client attempts to inject unearned discount'
);

-- Test 11: Expired promotion rejection (promo price 90 rejected when promo has expired; regular price is 100)
SELECT throws_ok(
  $$SELECT public.create_order_with_stock_idempotent_unowned(
    'LSO-TEST-EXPIRED-01',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'Expired Promo Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', '99990000-0000-0000-0000-000000000005'::uuid, 'qty', 1)),
    90.00, 40.00, 130.00, 'cod', null, null, 'a1000000-0000-4000-8000-000000000003'
  )$$,
  'Subtotal does not match catalog prices and active offers',
  'checkout procedure rejects stale promotional discount after campaign expiration'
);

-- Test 12: Checkout succeeds at regular catalogue price after promotion expired
SELECT ok(
  (public.create_order_with_stock_idempotent_unowned(
    'LSO-TEST-REGULAR-01',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'Regular Price Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', '99990000-0000-0000-0000-000000000005'::uuid, 'qty', 1)),
    100.00, 40.00, 140.00, 'cod', null, null, 'a1000000-0000-4000-8000-000000000004'
  ) -> 'order' ->> 'order_number') = 'LSO-TEST-REGULAR-01',
  'checkout procedure accepts regular catalogue price after promotion expired'
);

-- Test 13: Idempotent replay returns replayed = true with same order number
SELECT is(
  (public.create_order_with_stock_idempotent_unowned(
    'LSO-TEST-PROMO-01',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
    'Promo Test Customer',
    '01712345678',
    'Test Address, Chattogram',
    jsonb_build_array(jsonb_build_object('id', '99990000-0000-0000-0000-000000000004'::uuid, 'qty', 1)),
    190.00, 40.00, 230.00, 'cod', null, null, 'a1000000-0000-4000-8000-000000000001'
  ) ->> 'replayed')::boolean,
  true,
  'repeated checkout call with same idempotency key returns replayed: true'
);

ROLLBACK;
