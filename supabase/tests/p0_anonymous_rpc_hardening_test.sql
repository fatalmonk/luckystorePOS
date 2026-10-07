-- Test anonymous RPC access and cost column redaction.
-- Run against test DB only. Rolls back.
BEGIN;
DO $$
DECLARE
  t_id uuid := gen_random_uuid();
  s_id uuid := gen_random_uuid();
  i_id uuid := gen_random_uuid();
  v_res jsonb;
  v_blocked boolean;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (t_id, 'Anon Test Tenant');
  INSERT INTO public.stores (id, name, tenant_id, metadata)
    VALUES (s_id, 'Anon Public Store', t_id, '{"is_public_storefront": true}'::jsonb);
  INSERT INTO public.items (id, tenant_id, name, price, cost, is_active)
    VALUES (i_id, t_id, 'Secured Item', 100.00, 45.00, true);

  -- 1) Anon can call search_storefront_catalog and receives NO cost field
  SET LOCAL ROLE anon;
  SELECT public.search_storefront_catalog(s_id, 'Secured') INTO v_res;
  RESET ROLE;

  IF jsonb_array_length(v_res) <> 1 THEN
    RAISE EXCEPTION 'FAIL 1a: anon catalog search returned % items, expected 1', jsonb_array_length(v_res);
  END IF;

  IF (v_res->0)?'cost' THEN
    RAISE EXCEPTION 'FAIL 1b: anon catalog search leaked cost column';
  END IF;

  -- 2) Anon cannot call search_items_pos
  v_blocked := false;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.search_items_pos(s_id, 'Secured');
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  RESET ROLE;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL 2: anon was able to call search_items_pos';
  END IF;

  -- 3) Anon cannot call get_inventory_list_v2
  v_blocked := false;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.get_inventory_list_v2(s_id, '', NULL, 'all', 'name', 'asc', 10, 0);
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  RESET ROLE;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL 3: anon was able to call get_inventory_list_v2';
  END IF;

  -- 4) Anon cannot select cost directly from items table
  v_blocked := false;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM cost FROM public.items WHERE id = i_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  RESET ROLE;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL 4: anon was able to select cost from items table';
  END IF;

END $$;
ROLLBACK;
