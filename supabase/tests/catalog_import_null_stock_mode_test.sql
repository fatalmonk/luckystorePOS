-- Regression test for NULL stock mode rejection in catalog_import_row_apply.
-- Run only against the guarded disposable Supabase project.

BEGIN;

DO $$
BEGIN
  IF NOT (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    OR (session_user = 'postgres' AND current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo')
  ) THEN
    RAISE EXCEPTION 'catalog import tests may run only against the authorized disposable project';
  END IF;
END $$;

DO $$
DECLARE
  v_tenant_id uuid;
  v_store_id uuid;
  v_auth_id uuid;
  v_actor_id uuid;
  v_item_id uuid;
  v_batch_id uuid;
  v_stock_before integer;
  v_stock_after integer;
  v_error_code text;
BEGIN
  INSERT INTO public.tenants(name)
  VALUES ('Catalog import null stock mode proof')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.stores(tenant_id, name, code)
  VALUES (v_tenant_id, 'Catalog import proof store', 'CI-' || v_tenant_id)
  RETURNING id INTO v_store_id;

  INSERT INTO auth.users(id, email)
  VALUES (gen_random_uuid(), 'catalog-import-proof-' || v_tenant_id || '@example.test')
  RETURNING id INTO v_auth_id;

  INSERT INTO public.users(id, auth_id, email, role, tenant_id, store_id)
  VALUES (v_auth_id, v_auth_id, 'catalog-import-proof-' || v_tenant_id || '@example.test', 'manager', v_tenant_id, v_store_id)
  RETURNING id INTO v_actor_id;

  INSERT INTO public.items(tenant_id, sku, name, price)
  VALUES (v_tenant_id, 'NULL-MODE-' || left(v_tenant_id::text, 8), 'Before rejected import', 10)
  RETURNING id INTO v_item_id;

  INSERT INTO public.stock_levels(store_id, item_id, qty)
  VALUES (v_store_id, v_item_id, 7);

  INSERT INTO public.catalog_import_batches(
    actor_id, tenant_id, idempotency_key, batch_id, input_hash, preview_hash, preview_rows
  ) VALUES (
    v_actor_id,
    v_tenant_id,
    'null-stock-mode-' || v_tenant_id,
    'null-stock-mode-' || v_tenant_id,
    repeat('a', 64),
    repeat('b', 64),
    jsonb_build_array(jsonb_build_object('source_row', 2, 'outcome', 'update', 'errors', '[]'::jsonb))
  ) RETURNING id INTO v_batch_id;

  SELECT qty INTO v_stock_before
  FROM public.stock_levels WHERE store_id = v_store_id AND item_id = v_item_id;

  BEGIN
    PERFORM public.catalog_import_row_apply(
      v_batch_id,
      v_actor_id,
      v_tenant_id,
      v_store_id,
      2,
      v_item_id,
      1,
      NULL,
      jsonb_build_object(
        'sku', 'NULL-MODE-' || left(v_tenant_id::text, 8),
        'barcode', NULL,
        'name', 'Must roll back',
        'brand', NULL,
        'category_id', NULL,
        'cost', 0,
        'price', 20,
        'mrp', NULL,
        'is_active', true,
        'image_key', NULL
      ),
      v_stock_before,
      jsonb_build_object('sku', 'NULL-MODE-' || left(v_tenant_id::text, 8), 'name', 'Must roll back', 'price', 20),
      jsonb_build_object('mode', NULL, 'quantity', 4),
      NULL,
      false
    );
    RAISE EXCEPTION 'expected catalog_import_row_apply to reject NULL stock mode';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_error_code = RETURNED_SQLSTATE;
  END;

  SELECT qty INTO v_stock_after
  FROM public.stock_levels WHERE store_id = v_store_id AND item_id = v_item_id;

  IF v_error_code IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION '[FAIL] NULL stock mode did not return SQLSTATE 22023';
  END IF;
  IF v_stock_after IS DISTINCT FROM v_stock_before THEN
    RAISE EXCEPTION '[FAIL] rejected NULL stock mode changed stock from % to %', v_stock_before, v_stock_after;
  END IF;
  IF (SELECT name FROM public.items WHERE id = v_item_id) IS DISTINCT FROM 'Before rejected import' THEN
    RAISE EXCEPTION '[FAIL] rejected NULL stock mode did not roll back product changes';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog_import_row_results WHERE batch_row_id = v_batch_id AND source_row = 2) THEN
    RAISE EXCEPTION '[FAIL] rejected NULL stock mode left a row result behind';
  END IF;

  RAISE NOTICE '[PASS] NULL stock mode returns SQLSTATE 22023 and rolls back product and stock changes';
END $$;

ROLLBACK;
