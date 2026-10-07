-- Test expenses, items, and stock_levels tenant isolation and role restrictions.
-- Run against test DB only. Rolls back.
BEGIN;
DO $$
DECLARE
  t_a uuid := gen_random_uuid();
  t_b uuid := gen_random_uuid();
  s_a uuid := gen_random_uuid();
  s_b uuid := gen_random_uuid();
  a_auth uuid := gen_random_uuid();
  b_auth uuid := gen_random_uuid();
  c_auth uuid := gen_random_uuid(); -- cashier tenant A
  exp_b uuid := gen_random_uuid();
  item_a uuid := gen_random_uuid();
  item_b uuid := gen_random_uuid();
  n int;
  v_blocked boolean;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (t_a, 'Tenant A'), (t_b, 'Tenant B');
  INSERT INTO public.stores (id, name, tenant_id) VALUES (s_a, 'Store A', t_a), (s_b, 'Store B', t_b);
  INSERT INTO auth.users (id, email) VALUES
    (a_auth, a_auth || '@p1.invalid'),
    (b_auth, b_auth || '@p1.invalid'),
    (c_auth, c_auth || '@p1.invalid');

  INSERT INTO public.users (id, auth_id, email, role, tenant_id, store_id) VALUES
    (a_auth, a_auth, 'adminA@p1.invalid', 'admin', t_a, s_a),
    (b_auth, b_auth, 'adminB@p1.invalid', 'admin', t_b, s_b),
    (c_auth, c_auth, 'cashierA@p1.invalid', 'cashier', t_a, s_a);

  INSERT INTO public.expenses (id, store_id, expense_date, vendor_name, category, amount, payment_type, description)
    VALUES (exp_b, s_b, CURRENT_DATE, 'Power Co', 'Utilities', 500.00, 'Cash', 'Tenant B power bill');

  INSERT INTO public.items (id, tenant_id, name, price, is_active)
    VALUES (item_a, t_a, 'Item A', 10.00, true), (item_b, t_b, 'Item B', 20.00, true);

  INSERT INTO public.stock_levels (item_id, store_id, qty)
    VALUES (item_a, s_a, 100), (item_b, s_b, 50);

  -- 1) Admin A cannot read or modify Tenant B expenses
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.expenses WHERE id = exp_b;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 1a: Admin A can read Tenant B expense'; END IF;

  UPDATE public.expenses SET amount = 999 WHERE id = exp_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 1b: Admin A can update Tenant B expense'; END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.expenses (store_id, expense_date, vendor_name, category, amount, payment_type, description)
      VALUES (s_b, CURRENT_DATE, 'Landlord Co', 'Rent', 1000.00, 'Cash', 'Cross tenant expense insert');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL 1c: Admin A inserted expense into Tenant B'; END IF;
  RESET ROLE;

  -- 2) Cashier A cannot delete or insert items
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  v_blocked := false;
  BEGIN
    INSERT INTO public.items (tenant_id, name, price, is_active)
      VALUES (t_a, 'Cashier Item', 5.00, true);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL 2a: Cashier A was able to insert items'; END IF;

  DELETE FROM public.items WHERE id = item_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 2b: Cashier A was able to delete items'; END IF;
  RESET ROLE;

  -- 3) Admin A cannot read or write Tenant B stock_levels
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.stock_levels WHERE store_id = s_b;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 3a: Admin A can read Tenant B stock_levels'; END IF;

  UPDATE public.stock_levels SET qty = 999 WHERE store_id = s_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 3b: Admin A can update Tenant B stock_levels'; END IF;
  RESET ROLE;

END $$;
ROLLBACK;
