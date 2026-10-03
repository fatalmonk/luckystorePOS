-- Rollback-only proof for the production ledger-aware purchase contract.
-- Run only against the explicitly guarded disposable Supabase project.
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
    RAISE EXCEPTION 'purchase tests may run only against the authorized disposable project';
  END IF;
END
$$;

DO $test$
DECLARE
  v_tenant UUID;
  v_store UUID;
  v_other_store UUID;
  v_auth_user UUID := gen_random_uuid();
  v_item UUID;
  v_unpriced_item UUID;
  v_supplier UUID;
  v_inventory UUID;
  v_cash UUID;
  v_payable UUID;
  v_posted JSONB;
  v_replay JSONB;
  v_draft JSONB;
  v_batch UUID;
  v_receipt UUID;
  v_cost_error TEXT;
  v_key TEXT := 'purchase-contract-' || gen_random_uuid()::text;
  v_draft_key TEXT := 'purchase-draft-' || gen_random_uuid()::text;
BEGIN
  INSERT INTO public.tenants(name)
  VALUES ('purchase contract rollback fixture')
  RETURNING id INTO v_tenant;

  INSERT INTO public.stores(name, code, tenant_id)
  VALUES ('Purchase contract test', 'PT-' || replace(v_auth_user::text, '-', ''), v_tenant)
  RETURNING id INTO v_store;

  INSERT INTO public.stores(name, code, tenant_id)
  VALUES ('Purchase other-store test', 'PO-' || replace(v_auth_user::text, '-', ''), v_tenant)
  RETURNING id INTO v_other_store;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) VALUES (
    v_auth_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_auth_user::text || '@luckystore.invalid', '',
    now(), now(), now()
  );

  INSERT INTO public.users(id, auth_id, email, role, store_id, tenant_id, name)
  VALUES (
    v_auth_user, v_auth_user, v_auth_user::text || '@luckystore.invalid',
    'manager', v_store, v_tenant, 'Purchase test staff'
  );

  INSERT INTO public.items(tenant_id, name, price, cost)
  VALUES (v_tenant, 'Purchase contract test item', 10, 0)
  RETURNING id INTO v_item;

  INSERT INTO public.parties(tenant_id, party_type, type, name)
  VALUES (v_tenant, 'supplier', 'supplier', 'Purchase contract supplier')
  RETURNING id INTO v_supplier;

  SELECT id INTO v_inventory
  FROM public.ledger_accounts
  WHERE store_id = v_store AND code = '1200_INVENTORY' AND is_active;
  IF v_inventory IS NULL THEN
    RAISE EXCEPTION '[FAIL] new store was not provisioned with an active inventory account';
  END IF;

  INSERT INTO public.ledger_accounts(store_id, code, name, account_type, is_active)
  VALUES (v_store, 'TEST_CASH_' || replace(v_auth_user::text, '-', ''), 'Test cash', 'ASSET', true)
  RETURNING id INTO v_cash;

  INSERT INTO public.ledger_accounts(store_id, code, name, account_type, is_active)
  VALUES (v_store, 'TEST_AP_' || replace(v_auth_user::text, '-', ''), 'Test payable', 'LIABILITY', true)
  RETURNING id INTO v_payable;

  -- Existing target-store stock has a local cost basis. A larger balance in
  -- another store must not be used when calculating this store's weighted cost.
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (v_store, v_item, 5);

  INSERT INTO public.stock_movements(
    tenant_id, store_id, item_id, delta, weighted_average_cost, reason
  ) VALUES (v_tenant, v_store, v_item, 5, 4, 'Target-store opening stock');

  INSERT INTO public.stock_movements(
    tenant_id, store_id, item_id, delta, weighted_average_cost, reason
  ) VALUES (v_tenant, v_other_store, v_item, 10, 90, 'Other-store test fixture');

  PERFORM set_config('request.jwt.claim.sub', v_auth_user::text, true);

  v_posted := public.record_purchase_v2(
    v_key, v_tenant, v_store, v_supplier, 'TEST-' || v_auth_user::text,
    6.248, jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 2, 'unit_cost', 3.124)),
    2.004, v_cash, v_payable, 'posted', 'rollback-only test'
  );

  IF v_posted->>'status' IS DISTINCT FROM 'success'
    OR (v_posted->>'total_cost')::numeric <> 6.25
    OR (v_posted->>'amount_paid')::numeric <> 2.00
    OR (v_posted->>'payable_amount')::numeric <> 4.25 THEN
    RAISE EXCEPTION '[FAIL] posted purchase did not normalize and balance amounts: %', v_posted;
  END IF;

  v_receipt := (v_posted->>'receipt_id')::uuid;
  v_batch := (v_posted->>'batch_id')::uuid;

  IF (SELECT qty FROM public.stock_levels WHERE store_id = v_store AND item_id = v_item) <> 7
    -- items.cost is a two-decimal catalog field; movement cost retains precision.
    OR (SELECT cost FROM public.items WHERE id = v_item) <> 3.75
    OR (SELECT count(*) FROM public.stock_movements
        WHERE store_id = v_store AND item_id = v_item AND reference_id = v_receipt
          AND delta = 2
          AND weighted_average_cost = round(((5::numeric * 4) + (2::numeric * 3.124)) / 7, 4)) <> 1
    OR (SELECT count(*) FROM public.purchase_receipt_items WHERE receipt_id = v_receipt) <> 1 THEN
    RAISE EXCEPTION '[FAIL] posted purchase effects: stock_qty=%, item_cost=%, movement_count=%, receipt_line_count=%',
      (SELECT qty FROM public.stock_levels WHERE store_id = v_store AND item_id = v_item),
      (SELECT cost FROM public.items WHERE id = v_item),
      (SELECT count(*) FROM public.stock_movements
       WHERE store_id = v_store AND item_id = v_item AND reference_id = v_receipt
         AND delta = 2
         AND weighted_average_cost = round(((5::numeric * 4) + (2::numeric * 3.124)) / 7, 4)),
      (SELECT count(*) FROM public.purchase_receipt_items WHERE receipt_id = v_receipt);
  END IF;

  IF (SELECT count(*) FROM public.ledger_entries WHERE batch_id = v_batch) <> 3
    OR (SELECT sum(debit_amount) FROM public.ledger_entries WHERE batch_id = v_batch) <> 6.25
    OR (SELECT sum(credit_amount) FROM public.ledger_entries WHERE batch_id = v_batch) <> 6.25 THEN
    RAISE EXCEPTION '[FAIL] posted purchase ledger entries are not balanced';
  END IF;

  -- A shared catalog cost cannot value existing stock without a local cost
  -- history. Posting must stop instead of importing another store's value.
  INSERT INTO public.items(tenant_id, name, price, cost)
  VALUES (v_tenant, 'Unpriced local stock test item', 10, 90)
  RETURNING id INTO v_unpriced_item;
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (v_store, v_unpriced_item, 4);

  BEGIN
    PERFORM public.record_purchase_v2(
      'purchase-missing-local-cost-' || gen_random_uuid()::text,
      v_tenant, v_store, v_supplier, NULL, 1,
      jsonb_build_array(jsonb_build_object('item_id', v_unpriced_item, 'quantity', 1, 'unit_cost', 1)),
      1, v_cash, v_payable, 'posted', 'rollback-only missing local cost test'
    );
    RAISE EXCEPTION '[FAIL] purchase accepted positive store stock without a local cost';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    GET STACKED DIAGNOSTICS v_cost_error = MESSAGE_TEXT;
  END;
  IF v_cost_error NOT LIKE '%Store-scoped inventory cost missing%'
    OR (SELECT qty FROM public.stock_levels WHERE store_id = v_store AND item_id = v_unpriced_item) IS DISTINCT FROM 4
    OR EXISTS (SELECT 1 FROM public.stock_movements
               WHERE store_id = v_store AND item_id = v_unpriced_item) THEN
    RAISE EXCEPTION '[FAIL] missing local stock cost did not fail closed atomically: %', v_cost_error;
  END IF;

  v_replay := public.record_purchase_v2(
    v_key, v_tenant, v_store, v_supplier, 'TEST-' || v_auth_user::text,
    6.248, jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 2, 'unit_cost', 3.124)),
    2.004, v_cash, v_payable, 'posted', 'rollback-only test'
  );
  IF v_replay->>'receipt_id' IS DISTINCT FROM v_posted->>'receipt_id'
    OR (SELECT qty FROM public.stock_levels WHERE store_id = v_store AND item_id = v_item) <> 7
    OR (SELECT count(*) FROM public.purchase_receipts WHERE id = v_receipt) <> 1 THEN
    RAISE EXCEPTION '[FAIL] idempotent replay created duplicate purchase effects';
  END IF;

  v_draft := public.record_purchase_v2(
    v_draft_key, v_tenant, v_store, v_supplier, NULL, 3,
    jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 3, 'unit_cost', 1)),
    0, NULL, NULL, 'draft', 'rollback-only draft test'
  );
  IF v_draft->>'state' IS DISTINCT FROM 'draft'
    OR (SELECT count(*) FROM public.purchase_receipt_items
        WHERE receipt_id = (v_draft->>'receipt_id')::uuid) <> 1
    OR (SELECT qty FROM public.stock_levels WHERE store_id = v_store AND item_id = v_item) <> 7
    OR EXISTS (SELECT 1 FROM public.ledger_batches
        WHERE source_id = (v_draft->>'receipt_id')::uuid) THEN
    RAISE EXCEPTION '[FAIL] draft did not preserve lines without posting stock or ledger';
  END IF;

  UPDATE public.users SET role = 'stock' WHERE auth_id = v_auth_user;
  BEGIN
    PERFORM public.record_purchase_v2(
      'purchase-unauthorized-' || gen_random_uuid()::text,
      v_tenant, v_store, v_supplier, NULL, 1,
      jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 1, 'unit_cost', 1)),
      0, NULL, NULL, 'draft', 'rollback-only unauthorized role test'
    );
    RAISE EXCEPTION '[FAIL] stock role was allowed to record a purchase';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  UPDATE public.users SET role = 'manager' WHERE auth_id = v_auth_user;

  UPDATE public.users SET role = 'admin' WHERE auth_id = v_auth_user;
  IF public.record_purchase_v2(
    'purchase-admin-' || gen_random_uuid()::text,
    v_tenant, v_store, v_supplier, NULL, 1,
    jsonb_build_array(jsonb_build_object('item_id', v_item, 'quantity', 1, 'unit_cost', 1)),
    0, NULL, NULL, 'draft', 'rollback-only admin role test'
  )->>'state' IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION '[FAIL] admin role was not allowed to record a purchase';
  END IF;

  RAISE NOTICE '[PASS] purchase RPC: store-scoped cost, rounded balanced ledger, stock/materialized cost, idempotency, draft persistence and admin/manager role enforcement';
END
$test$;

ROLLBACK;
