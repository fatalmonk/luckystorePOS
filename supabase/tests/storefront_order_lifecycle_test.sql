BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(8);

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

INSERT INTO public.orders (
  id, order_number, tenant_id, store_id, customer_name, customer_phone,
  customer_address, items, subtotal, delivery_fee, total, payment_method, status
) VALUES (
  '96000000-0000-0000-0000-000000000001',
  'LSO-TEST-LIFECYCLE-01',
  '00000000-0000-0000-0000-000000000001',
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  'Lifecycle Test', '01712345678', '123 Test Road, Chittagong',
  '[]'::jsonb, 100, 40, 140, 'cod', 'pending'
);

SELECT lives_ok(
  $$UPDATE public.orders SET status = 'confirmed' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'pending orders can be confirmed'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'preparing' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'confirmed orders can enter preparation'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'out_for_delivery' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'prepared orders can enter delivery'
);
SELECT lives_ok(
  $$UPDATE public.orders SET status = 'delivered' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'out-for-delivery orders can be delivered'
);
SELECT throws_ok(
  $$UPDATE public.orders SET status = 'pending' WHERE id = '96000000-0000-0000-0000-000000000001'$$,
  'P0001', NULL,
  'terminal orders cannot return to pending'
);
SELECT * FROM finish();
ROLLBACK;
