-- Test project / local DB only. Rolls back.
BEGIN;
DO $$
DECLARE
  t_a uuid := gen_random_uuid(); t_b uuid := gen_random_uuid();
  a_auth uuid := gen_random_uuid(); b_auth uuid := gen_random_uuid();
  cat_b uuid := gen_random_uuid(); cat_a uuid := gen_random_uuid();
  n int;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (t_a, 'T A'), (t_b, 'T B');
  INSERT INTO auth.users (id, email) VALUES (a_auth, a_auth || '@p0.invalid'), (b_auth, b_auth || '@p0.invalid');
  INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES
    (a_auth, a_auth, 'a@p0.invalid', 'admin', t_a), (b_auth, b_auth, 'b@p0.invalid', 'admin', t_b);
  INSERT INTO public.categories (id, name, tenant_id) VALUES (cat_a, 'cat A', t_a), (cat_b, 'cat B', t_b);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.categories WHERE id = cat_b;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: tenant A reads tenant B category'; END IF;
  SELECT count(*) INTO n FROM public.categories WHERE id = cat_a;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: tenant A cannot read own category'; END IF;

  UPDATE public.categories SET name = 'hacked' WHERE id = cat_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: cross-tenant category update'; END IF;
  DELETE FROM public.categories WHERE id = cat_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: cross-tenant category delete'; END IF;
  RESET ROLE;
END $$;
ROLLBACK;
