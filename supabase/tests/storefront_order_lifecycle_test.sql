BEGIN;

DO $$
BEGIN
  IF NOT (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    OR (
      session_user = 'postgres'
      AND current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo'
    )
  ) THEN
    RAISE EXCEPTION 'order lifecycle tests may run only against the authorized disposable project';
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(13);

-- The guest-safe wrapper must delegate to the private promotion-aware core.
SELECT ok(
  position(
    'create_order_with_stock_idempotent_unowned'
    IN pg_get_functiondef('public.create_order_with_stock_idempotent(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,text)'::regprocedure)
  ) > 0,
  'public guest-tracking wrapper delegates to the private checkout core'
);
SELECT ok(
  position(
    'storefront_item_promotions'
    IN pg_get_functiondef('public.create_order_with_stock_idempotent_unowned(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,text)'::regprocedure)
  ) > 0,
  'private checkout core applies verified storefront promotions'
);

-- Storefront search projections expose sellable stock after both reservation pools.
SELECT ok(
  position('reserved' IN pg_get_functiondef('public.search_storefront_catalog(uuid,text,uuid,integer,integer)'::regprocedure)) > 0
  AND position('qty_reserved_online' IN pg_get_functiondef('public.search_storefront_catalog(uuid,text,uuid,integer,integer)'::regprocedure)) > 0,
  'catalogue search accounts for reserved and online-reserved quantities'
);
SELECT ok(
  position('reserved' IN pg_get_functiondef('public.search_storefront_catalog_v2(uuid,text,uuid,uuid[],integer,integer)'::regprocedure)) > 0
  AND position('qty_reserved_online' IN pg_get_functiondef('public.search_storefront_catalog_v2(uuid,text,uuid,uuid[],integer,integer)'::regprocedure)) > 0,
  'catalogue search v2 accounts for reserved and online-reserved quantities'
);

-- 1. Check privilege rules
SELECT ok(
  has_column_privilege('authenticated', 'public.orders', 'status', 'UPDATE'),
  'authenticated fulfillment staff can update order status'
);
SELECT ok(
  not has_column_privilege('authenticated', 'public.orders', 'customer_name', 'UPDATE'),
  'authenticated users cannot update order customer data'
);
SELECT ok(
  not has_table_privilege('authenticated', 'public.storefront_order_tracking', 'SELECT'),
  'order tracking token hashes are not visible to staff clients'
);

-- 2. Seed test users and orders
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '96000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'staff-order-test@luckystore.invalid', '',
  now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, auth_id, email, role, store_id, tenant_id, name)
VALUES (
  '96000000-0000-0000-0000-000000000099',
  '96000000-0000-0000-0000-000000000099',
  'staff-order-test@luckystore.invalid',
  'stock',
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  '00000000-0000-0000-0000-000000000001',
  'Store Staff'
) ON CONFLICT (id) DO UPDATE SET store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

INSERT INTO public.orders (
  id, order_number, tenant_id, store_id, customer_name, customer_phone,
  customer_address, items, subtotal, delivery_fee, total, payment_method, status
) VALUES 
(
  '96000000-0000-0000-0000-000000000001',
  'LSO-TEST-LIFECYCLE-01',
  '00000000-0000-0000-0000-000000000001',
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  'Lifecycle Test', '01712345678', '123 Test Road, Chittagong',
  '[]'::jsonb, 100, 40, 140, 'cod', 'pending'
),
(
  '96000000-0000-0000-0000-000000000002',
  'LSO-TEST-OTHER-STORE-01',
  '00000000-0000-0000-0000-000000000001',
  '55555555-5555-5555-5555-555555555555',
  'Other Store Test', '01812345678', '456 Other Road, Chittagong',
  '[]'::jsonb, 100, 40, 140, 'cod', 'pending'
);

-- 3. Switch role to authenticated staff user
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "96000000-0000-0000-0000-000000000099", "role": "authenticated"}', true);

SELECT lives_ok(
  $$UPDATE public.orders SET status = 'confirmed' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'pending orders can be confirmed by store staff'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'preparing' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'confirmed orders can enter preparation by store staff'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'out_for_delivery' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'prepared orders can enter delivery by store staff'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'delivered' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'out-for-delivery orders can be delivered by store staff'
);
SELECT throws_ok(
  $$UPDATE public.orders SET status = 'pending' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'Invalid order status transition: delivered to pending',
  'invalid status transitions are blocked by trigger'
);

-- 4. Store-scoping negative test: staff cannot update another store's order
UPDATE public.orders SET status = 'confirmed' WHERE id = '96000000-0000-0000-0000-000000000002';
SELECT is(
  (SELECT status FROM public.orders WHERE id = '96000000-0000-0000-0000-000000000002'),
  'pending',
  'staff from store A cannot update status on store B order via RLS'
);

ROLLBACK;
