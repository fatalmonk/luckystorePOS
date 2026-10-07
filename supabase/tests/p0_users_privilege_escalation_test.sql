-- Test project / local DB only, never production. Rolls back.
BEGIN;
DO $$
DECLARE
  t_a uuid := gen_random_uuid();
  t_b uuid := gen_random_uuid();
  a_auth uuid := gen_random_uuid();   -- admin tenant A
  c_auth uuid := gen_random_uuid();   -- cashier tenant A
  b_auth uuid := gen_random_uuid();   -- admin tenant B
  x1 uuid := gen_random_uuid(); x2 uuid := gen_random_uuid(); x3 uuid := gen_random_uuid();
  ok boolean;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (t_a, 'p0 A'), (t_b, 'p0 B');
  INSERT INTO auth.users (id, email) SELECT i, i::text || '@p0.invalid' FROM unnest(ARRAY[a_auth, c_auth, b_auth, x1, x2, x3]) i;
  INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES
    (a_auth, a_auth, 'a@p0.invalid', 'admin', t_a),
    (c_auth, c_auth, 'c@p0.invalid', 'cashier', t_a),
    (b_auth, b_auth, 'b@p0.invalid', 'admin', t_b);

  -- 1) cashier cannot self-promote
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  ok := false;
  BEGIN UPDATE public.users SET role = 'admin' WHERE auth_id = c_auth;
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  RESET ROLE;
  IF NOT ok OR (SELECT role FROM public.users WHERE auth_id = c_auth) <> 'cashier' THEN
    RAISE EXCEPTION 'FAIL 1: cashier self-escalation'; END IF;

  -- 2) cashier cannot insert an admin profile
  SET LOCAL ROLE authenticated;
  ok := false;
  BEGIN INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES (x1, x1, 'x@p0.invalid', 'admin', t_a);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN ok := true; END;
  RESET ROLE;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL 2: non-admin insert'; END IF;

  -- 3) cashier CAN edit own name
  SET LOCAL ROLE authenticated;
  UPDATE public.users SET full_name = 'Self Edit' WHERE auth_id = c_auth;
  RESET ROLE;
  IF (SELECT full_name FROM public.users WHERE auth_id = c_auth) <> 'Self Edit' THEN
    RAISE EXCEPTION 'FAIL 3: self profile edit blocked'; END IF;

  -- 4) tenant-A admin CAN change cashier role and create a user in tenant A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.users SET role = 'manager' WHERE auth_id = c_auth;
  INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES (x2, x2, 'new@p0.invalid', 'stock', t_a);
  RESET ROLE;
  IF (SELECT role FROM public.users WHERE auth_id = c_auth) <> 'manager' THEN
    RAISE EXCEPTION 'FAIL 4: admin cannot edit tenant user'; END IF;

  -- 5) tenant-A admin cannot create users in tenant B or move users to B
  SET LOCAL ROLE authenticated;
  ok := false;
  BEGIN INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES (x3, x3, 'y@p0.invalid', 'cashier', t_b);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL 5a: cross-tenant insert'; END IF;
  ok := false;
  BEGIN UPDATE public.users SET tenant_id = t_b WHERE auth_id = c_auth;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN ok := true; END;
  RESET ROLE;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL 5b: cross-tenant move'; END IF;

  -- 6) tenant-A admin cannot see or edit tenant-B rows
  SET LOCAL ROLE authenticated;
  UPDATE public.users SET role = 'cashier' WHERE auth_id = b_auth;
  RESET ROLE;
  IF (SELECT role FROM public.users WHERE auth_id = b_auth) <> 'admin' THEN
    RAISE EXCEPTION 'FAIL 6: cross-tenant edit'; END IF;
END $$;
ROLLBACK;
