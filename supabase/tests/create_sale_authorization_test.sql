BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(21);

CREATE TEMP TABLE tap_results (
  sequence integer GENERATED ALWAYS AS IDENTITY,
  result text NOT NULL
);
GRANT INSERT, SELECT ON tap_results TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tap_results_sequence_seq TO authenticated;

-- Isolated fixture identifiers. The outer transaction rolls everything back.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sale-a@test.invalid', '',
    now(), now(), now()
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sale-b@test.invalid', '',
    now(), now(), now()
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sale-other@test.invalid', '',
    now(), now(), now()
  );

INSERT INTO public.tenants (id, name) VALUES
  ('91000000-0000-0000-0000-000000000001', 'Sale test tenant A'),
  ('91000000-0000-0000-0000-000000000002', 'Sale test tenant B');

INSERT INTO public.stores (id, tenant_id, code, name) VALUES
  (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'SALE-TEST-A', 'Sale test store A'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000002',
    'SALE-TEST-B', 'Sale test store B'
  );

INSERT INTO public.users (
  id, auth_id, email, role, store_id, tenant_id, name
) VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'sale-a@test.invalid', 'cashier',
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'Sale test cashier A'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000002',
    'sale-b@test.invalid', 'manager',
    '92000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000002',
    'Sale test manager B'
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    '90000000-0000-0000-0000-000000000003',
    'sale-other@test.invalid', 'cashier',
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'Sale test cashier A2'
  );

INSERT INTO public.items (
  id, tenant_id, sku, name, price, cost, is_active
) VALUES
  (
    '93000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'SALE-TEST-ITEM-A', 'Sale test item A', 100, 60, true
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000002',
    'SALE-TEST-ITEM-B', 'Sale test item B', 100, 60, true
  );

INSERT INTO public.stock_levels (store_id, item_id, qty, tenant_id) VALUES
  (
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    10, '91000000-0000-0000-0000-000000000001'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000002',
    10, '91000000-0000-0000-0000-000000000002'
  );

INSERT INTO public.payment_methods (id, store_id, name, type, is_active) VALUES
  (
    '94000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'Sale test cash A', 'cash', true
  ),
  (
    '94000000-0000-0000-0000-000000000002',
    '92000000-0000-0000-0000-000000000002',
    'Sale test cash B', 'cash', true
  );

INSERT INTO public.pos_sessions (
  id, session_number, store_id, cashier_id, status
) VALUES
  (
    '95000000-0000-0000-0000-000000000001',
    'SALE-TEST-OPEN-A',
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'open'
  ),
  (
    '95000000-0000-0000-0000-000000000002',
    'SALE-TEST-CLOSED-A',
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'closed'
  ),
  (
    '95000000-0000-0000-0000-000000000003',
    'SALE-TEST-OTHER-A',
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000003',
    'open'
  );

INSERT INTO tap_results(result) SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute create_sale'
);

INSERT INTO tap_results(result) SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text)',
    'EXECUTE'
  ),
  'authenticated callers can execute create_sale'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":100}]',
    0, 'sale-test-no-auth'
  )->>'conflict_reason',
  'not_authenticated',
  'authenticated role without a user JWT is rejected'
);

SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"90000000-0000-0000-0000-000000000001"}',
  true
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000003',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":100}]',
    0, 'sale-test-impersonation'
  )->>'conflict_reason',
  'cashier_mismatch',
  'caller cannot impersonate another cashier'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000002","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000002","amount":100}]',
    0, 'sale-test-cross-tenant-store'
  )->>'conflict_reason',
  'store_not_authorized',
  'cashier cannot sell through a cross-tenant store'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '95000000-0000-0000-0000-000000000002',
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":100}]',
    0, 'sale-test-closed-session'
  )->>'conflict_reason',
  'session_not_authorized',
  'closed POS session is rejected'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '95000000-0000-0000-0000-000000000003',
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":100}]',
    0, 'sale-test-other-session'
  )->>'conflict_reason',
  'session_not_authorized',
  'another cashier POS session is rejected'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000002","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":100}]',
    0, 'sale-test-cross-tenant-item'
  )->>'conflict_reason',
  'item_not_authorized',
  'cross-tenant item is rejected'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000002","amount":100}]',
    0, 'sale-test-cross-store-payment'
  )->>'conflict_reason',
  'payment_method_not_authorized',
  'cross-store payment method is rejected'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":99}]',
    0, 'sale-test-insufficient-payment'
  )->>'conflict_reason',
  'payment_insufficient',
  'underpayment is rejected before mutation'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":90}]',
    10, 'sale-test-discount-no-token'
  )->>'conflict_reason',
  'override_token_required',
  'cart discount without a manager token is rejected'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[
      {"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100},
      {"item_id":"93000000-0000-0000-0000-000000000001","qty":1,"unit_price":100}
    ]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":200}]',
    0, 'sale-test-duplicate-items'
  )->>'conflict_reason',
  'duplicate_items',
  'duplicate item identifiers are rejected before stock checks'
);

INSERT INTO tap_results(result) SELECT is(
  public.create_sale(
    '92000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    NULL,
    '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":11,"unit_price":100}]',
    '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":1100}]',
    0, 'sale-test-insufficient-stock'
  )->>'conflict_reason',
  'insufficient_stock_strict_policy',
  'sale cannot oversubscribe available stock'
);

RESET ROLE;

INSERT INTO tap_results(result) SELECT is(
  (
    SELECT count(*)::integer
    FROM public.sales
    WHERE client_transaction_id LIKE 'sale-test-%'
  ),
  0,
  'all rejected cases leave sales unchanged'
);

INSERT INTO tap_results(result) SELECT is(
  (
    SELECT qty
    FROM public.stock_levels
    WHERE store_id = '92000000-0000-0000-0000-000000000001'
      AND item_id = '93000000-0000-0000-0000-000000000001'
  ),
  10,
  'all rejected cases leave stock unchanged'
);

SET LOCAL ROLE authenticated;

CREATE TEMP TABLE sale_test_result AS
SELECT public.create_sale(
  '92000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":2,"unit_price":100}]',
  '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":200}]',
  0, 'sale-test-replay'
) AS result;

INSERT INTO tap_results(result) SELECT ok(
  (SELECT result->>'status' FROM sale_test_result) IN ('SUCCESS', 'ADJUSTED'),
  'authorized sale succeeds'
);

CREATE TEMP TABLE sale_test_replay_result AS
SELECT public.create_sale(
  '92000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  '[{"item_id":"93000000-0000-0000-0000-000000000001","qty":2,"unit_price":100}]',
  '[{"payment_method_id":"94000000-0000-0000-0000-000000000001","amount":200}]',
  0, 'sale-test-replay'
) AS result;

INSERT INTO tap_results(result) SELECT is(
  (SELECT result->>'sale_id' FROM sale_test_replay_result),
  (SELECT result->>'sale_id' FROM sale_test_result),
  'idempotent replay returns the canonical sale'
);

RESET ROLE;

INSERT INTO tap_results(result) SELECT is(
  (
    SELECT count(*)::integer
    FROM public.sales
    WHERE client_transaction_id = 'sale-test-replay'
  ),
  1,
  'idempotent replay creates exactly one sale'
);

INSERT INTO tap_results(result) SELECT is(
  (
    SELECT qty
    FROM public.stock_levels
    WHERE store_id = '92000000-0000-0000-0000-000000000001'
      AND item_id = '93000000-0000-0000-0000-000000000001'
  ),
  8,
  'idempotent replay decrements stock exactly once'
);

INSERT INTO tap_results(result) SELECT ok(
  position(
    'FOR UPDATE OF sl' IN pg_get_functiondef(
      'public.create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text)'::regprocedure
    )
  ) > 0,
  'create_sale locks stock rows before mutation'
);

INSERT INTO tap_results(result) SELECT ok(
  position(
    'pg_advisory_xact_lock' IN pg_get_functiondef(
      'public.create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text)'::regprocedure
    )
  ) > 0,
  'create_sale serializes concurrent idempotency keys'
);

RESET ROLE;
SELECT jsonb_build_object(
  'assertions',
  (SELECT jsonb_agg(result ORDER BY sequence) FROM tap_results),
  'finish',
  (SELECT jsonb_agg(finish_result) FROM finish() AS f(finish_result))
) AS test_report;
ROLLBACK;
