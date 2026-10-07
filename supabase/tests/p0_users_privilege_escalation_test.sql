-- Run against the security-test project / local DB only, never production.
BEGIN;
DO $$
DECLARE
  v_auth uuid := gen_random_uuid();
  v_blocked boolean := false;
BEGIN
  INSERT INTO public.users (auth_id, email, role) VALUES (v_auth, 'p0-test@example.invalid', 'cashier');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.users SET role = 'admin' WHERE auth_id = v_auth;
    -- 0 rows or privilege error both acceptable; role must remain cashier
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  RESET ROLE;
  IF NOT v_blocked AND (SELECT role FROM public.users WHERE auth_id = v_auth) <> 'cashier' THEN
    RAISE EXCEPTION 'FAIL: self role escalation succeeded';
  END IF;

  v_blocked := false;
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.users (auth_id, email, role) VALUES (v_auth, 'p0-test2@example.invalid', 'admin');
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN v_blocked := true;
  END;
  RESET ROLE;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: self insert as admin succeeded'; END IF;
END $$;
ROLLBACK;
