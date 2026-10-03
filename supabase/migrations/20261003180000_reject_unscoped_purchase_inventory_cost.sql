-- Never seed a store's weighted-average inventory cost from items.cost, which
-- is shared across stores. Preserve the existing RPC implementation and
-- replace only its store-scoped cost lookup with a fail-closed variant.
DO $migration$
DECLARE
  v_function regprocedure := to_regprocedure(
    'public.record_purchase_v2(text,uuid,uuid,uuid,text,numeric,jsonb,numeric,uuid,uuid,text,text)'
  );
  v_definition text;
  v_updated_definition text;
BEGIN
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'Expected public.record_purchase_v2 function is missing';
  END IF;

  v_definition := pg_get_functiondef(v_function);
  v_updated_definition := replace(
    v_definition,
    btrim($old$
    SELECT sm.weighted_average_cost
    INTO v_current_avg_cost
    FROM public.stock_movements AS sm
    WHERE sm.item_id = v_item.item_id
      AND sm.tenant_id = p_tenant_id
      AND sm.store_id = p_store_id
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT 1;

    IF v_current_avg_cost IS NULL THEN
      SELECT COALESCE(i.cost, 0)
      INTO v_current_avg_cost
      FROM public.items AS i
      WHERE i.id = v_item.item_id
        AND i.tenant_id = p_tenant_id;
    END IF;
    $old$),
    btrim($new$
    SELECT sm.weighted_average_cost
    INTO v_current_avg_cost
    FROM public.stock_movements AS sm
    WHERE sm.item_id = v_item.item_id
      AND sm.tenant_id = p_tenant_id
      AND sm.store_id = p_store_id
      AND sm.weighted_average_cost IS NOT NULL
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT 1;

    IF COALESCE(v_current_qty, 0) > 0 AND v_current_avg_cost IS NULL THEN
      RAISE EXCEPTION
        'Store-scoped inventory cost missing for item % at store %; reconcile opening inventory cost before posting purchase',
        v_item.item_id,
        p_store_id
        USING ERRCODE = '23514';
    END IF;

    -- With no scoped stock valuation, this purchase establishes the cost.
    -- The quantity-weighted formula below ignores this value when quantity is 0.
    IF v_current_avg_cost IS NULL THEN
      v_current_avg_cost := 0;
    END IF;
    $new$)
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION
      'Could not find the expected shared items.cost fallback in record_purchase_v2';
  END IF;

  EXECUTE v_updated_definition;
END;
$migration$;
