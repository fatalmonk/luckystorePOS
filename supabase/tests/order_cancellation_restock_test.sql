-- Test automated restocking on order cancellation.
-- Run against test DB only. Rolls back.
BEGIN;
DO $$
DECLARE
  t_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  s_id uuid := '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid;
  i_id uuid := gen_random_uuid();
  o_id uuid;
  v_initial_stock integer := 50;
  v_order_qty integer := 5;
  v_current_stock integer;
BEGIN
  -- Setup test item and stock level
  INSERT INTO public.items (id, tenant_id, name, price, cost, is_active)
    VALUES (i_id, t_id, 'Restock Test Item', 100.00, 50.00, true);

  INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (s_id, i_id, v_initial_stock)
    ON CONFLICT (store_id, item_id) DO UPDATE SET qty = v_initial_stock;

  -- 1) Create order and deduct stock
  UPDATE public.stock_levels SET qty = qty - v_order_qty WHERE store_id = s_id AND item_id = i_id;

  INSERT INTO public.orders (
    order_number, tenant_id, store_id, customer_name, customer_phone,
    customer_address, items, subtotal, delivery_fee, total, payment_method, status
  ) VALUES (
    'TEST-ORD-' || floor(random()*100000)::text,
    t_id, s_id, 'Test Buyer', '01700000000', 'Test Address',
    jsonb_build_array(jsonb_build_object('id', i_id, 'name', 'Restock Test Item', 'price', 100.00, 'qty', v_order_qty)),
    500.00, 0.00, 500.00, 'cod', 'pending'
  ) RETURNING id INTO o_id;

  SELECT qty INTO v_current_stock FROM public.stock_levels WHERE store_id = s_id AND item_id = i_id;
  IF v_current_stock <> (v_initial_stock - v_order_qty) THEN
    RAISE EXCEPTION 'FAIL 1: stock deduction failed, got % expected %', v_current_stock, (v_initial_stock - v_order_qty);
  END IF;

  -- 2) Cancel order -> Trigger must automatically restock the item
  UPDATE public.orders SET status = 'cancelled' WHERE id = o_id;

  SELECT qty INTO v_current_stock FROM public.stock_levels WHERE store_id = s_id AND item_id = i_id;
  IF v_current_stock <> v_initial_stock THEN
    RAISE EXCEPTION 'FAIL 2: cancellation restocking failed, got % expected %', v_current_stock, v_initial_stock;
  END IF;

  -- 3) Another update while status is already cancelled should NOT restock again
  UPDATE public.orders SET notes = 'Updated notes' WHERE id = o_id;

  SELECT qty INTO v_current_stock FROM public.stock_levels WHERE store_id = s_id AND item_id = i_id;
  IF v_current_stock <> v_initial_stock THEN
    RAISE EXCEPTION 'FAIL 3: double restocking on redundant update, got % expected %', v_current_stock, v_initial_stock;
  END IF;

END $$;
ROLLBACK;
