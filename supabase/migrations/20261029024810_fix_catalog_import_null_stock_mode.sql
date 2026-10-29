-- Reject null stock mode explicitly; SQL NULL comparisons must not fall through as a delta.

CREATE OR REPLACE FUNCTION public.catalog_import_row_apply(
  p_batch_row_id uuid,
  p_actor_id uuid,
  p_tenant_id uuid,
  p_store_id uuid,
  p_source_row integer,
  p_expected_item_id uuid,
  p_expected_image_version bigint,
  p_expected_image_url text,
  p_expected_item_snapshot jsonb,
  p_expected_stock_qty integer,
  p_product jsonb,
  p_stock jsonb,
  p_image_url text,
  p_has_image boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch public.catalog_import_batches%ROWTYPE;
  v_actor public.users%ROWTYPE;
  v_preview_row jsonb;
  v_item_ids uuid[];
  v_sku_id uuid;
  v_barcode_id uuid;
  v_item_id uuid;
  v_category_id uuid;
  v_category_ids uuid[];
  v_existing public.items%ROWTYPE;
  v_inserted_result jsonb;
  v_outcome text;
  v_item_changed boolean := false;
  v_stock_changed boolean := false;
  v_mode text;
  v_quantity numeric;
  v_current_qty integer;
  v_new_qty integer;
  v_delta integer;
BEGIN
  SELECT * INTO v_batch FROM public.catalog_import_batches
  WHERE id = p_batch_row_id AND actor_id = p_actor_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Catalog import batch not found' USING ERRCODE = '42501'; END IF;

  SELECT elem INTO v_preview_row
  FROM jsonb_array_elements(v_batch.preview_rows) elem
  WHERE (elem->>'source_row')::integer = p_source_row;
  IF v_preview_row IS NULL THEN RAISE EXCEPTION 'Row is not part of the approved preview' USING ERRCODE = '22023'; END IF;
  IF coalesce(v_preview_row->>'outcome', 'invalid') NOT IN ('create', 'update', 'unchanged') OR
     jsonb_array_length(coalesce(v_preview_row->'errors', '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Row did not pass its approved preview' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.catalog_import_row_results(batch_row_id, source_row, result)
  VALUES (p_batch_row_id, p_source_row, '{}'::jsonb)
  ON CONFLICT (batch_row_id, source_row) DO NOTHING
  RETURNING result INTO v_inserted_result;
  IF NOT FOUND THEN
    SELECT result INTO v_inserted_result FROM public.catalog_import_row_results
    WHERE batch_row_id = p_batch_row_id AND source_row = p_source_row;
    RETURN v_inserted_result;
  END IF;

  SELECT * INTO v_actor FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND role IN ('admin', 'manager');
  IF NOT FOUND THEN RAISE EXCEPTION 'Catalog import actor is outside tenant scope' USING ERRCODE = '42501'; END IF;
  IF p_product->>'sku' IS NULL OR btrim(p_product->>'sku') = '' OR p_product->>'name' IS NULL OR btrim(p_product->>'name') = '' THEN
    RAISE EXCEPTION 'SKU and product name are required' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(id) INTO v_item_ids FROM public.items
  WHERE tenant_id = p_tenant_id AND sku = p_product->>'sku';
  IF coalesce(cardinality(v_item_ids), 0) > 1 THEN RAISE EXCEPTION 'Ambiguous tenant SKU' USING ERRCODE = '23505'; END IF;
  v_sku_id := v_item_ids[1];

  v_item_ids := NULL;
  IF nullif(p_product->>'barcode', '') IS NOT NULL THEN
    SELECT array_agg(id) INTO v_item_ids FROM public.items
    WHERE tenant_id = p_tenant_id AND barcode = p_product->>'barcode';
    IF coalesce(cardinality(v_item_ids), 0) > 1 THEN RAISE EXCEPTION 'Ambiguous tenant barcode' USING ERRCODE = '23505'; END IF;
    v_barcode_id := v_item_ids[1];
  END IF;
  IF v_sku_id IS NOT NULL AND v_barcode_id IS NOT NULL AND v_sku_id <> v_barcode_id THEN
    RAISE EXCEPTION 'SKU and barcode identify different tenant items' USING ERRCODE = '23505';
  END IF;
  v_item_id := coalesce(v_sku_id, v_barcode_id);

  IF p_expected_item_id IS DISTINCT FROM v_item_id THEN RAISE EXCEPTION 'Catalog item changed after preview' USING ERRCODE = '40001'; END IF;
  IF v_item_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.items WHERE id = v_item_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF p_expected_item_snapshot IS NULL OR
       v_existing.sku IS DISTINCT FROM p_expected_item_snapshot->>'sku' OR
       v_existing.barcode IS DISTINCT FROM p_expected_item_snapshot->>'barcode' OR
       v_existing.name IS DISTINCT FROM p_expected_item_snapshot->>'name' OR
       v_existing.brand IS DISTINCT FROM p_expected_item_snapshot->>'brand' OR
       v_existing.category_id IS DISTINCT FROM nullif(p_expected_item_snapshot->>'category_id', '')::uuid OR
       v_existing.cost IS DISTINCT FROM nullif(p_expected_item_snapshot->>'cost', '')::numeric OR
       v_existing.price IS DISTINCT FROM nullif(p_expected_item_snapshot->>'price', '')::numeric OR
       v_existing.mrp IS DISTINCT FROM nullif(p_expected_item_snapshot->>'mrp', '')::numeric OR
       v_existing.is_active IS DISTINCT FROM nullif(p_expected_item_snapshot->>'is_active', '')::boolean OR
       v_existing.image_key IS DISTINCT FROM p_expected_item_snapshot->>'image_key' THEN
      RAISE EXCEPTION 'Catalog product changed after preview' USING ERRCODE = '40001';
    END IF;
    IF v_existing.image_version IS DISTINCT FROM p_expected_image_version OR v_existing.image_url IS DISTINCT FROM p_expected_image_url THEN
      RAISE EXCEPTION 'Catalog image changed after preview' USING ERRCODE = '40001';
    END IF;
  END IF;

  IF p_product ? 'category' AND nullif(p_product->>'category', '') IS NOT NULL THEN
    SELECT array_agg(id) INTO v_category_ids FROM public.categories
    WHERE tenant_id = p_tenant_id AND name = p_product->>'category';
    IF coalesce(cardinality(v_category_ids), 0) <> 1 THEN RAISE EXCEPTION 'Category must resolve uniquely in the authenticated tenant' USING ERRCODE = '23505'; END IF;
    v_category_id := v_category_ids[1];
  ELSIF p_product ? 'category' THEN
    v_category_id := NULL;
  END IF;

  IF v_item_id IS NULL THEN
    INSERT INTO public.items (
      tenant_id, sku, barcode, name, brand, category_id, cost, price, mrp, is_active, image_url
    ) VALUES (
      p_tenant_id, p_product->>'sku', nullif(p_product->>'barcode', ''), p_product->>'name',
      p_product->>'brand', v_category_id,
      CASE WHEN p_product ? 'cost' THEN (p_product->>'cost')::numeric ELSE 0 END,
      CASE WHEN p_product ? 'price' THEN (p_product->>'price')::numeric ELSE 0 END,
      CASE WHEN p_product ? 'mrp' THEN (p_product->>'mrp')::numeric ELSE NULL END,
      coalesce((p_product->>'is_active')::boolean, true), CASE WHEN p_has_image THEN p_image_url ELSE NULL END
    ) RETURNING id INTO v_item_id;
    v_outcome := 'create';
  ELSE
    v_item_changed :=
      v_existing.name IS DISTINCT FROM p_product->>'name' OR
      v_existing.sku IS DISTINCT FROM p_product->>'sku' OR
      (p_product ? 'barcode' AND v_existing.barcode IS DISTINCT FROM nullif(p_product->>'barcode', '')) OR
      (p_product ? 'brand' AND v_existing.brand IS DISTINCT FROM p_product->>'brand') OR
      (p_product ? 'category' AND v_existing.category_id IS DISTINCT FROM v_category_id) OR
      (p_product ? 'cost' AND v_existing.cost IS DISTINCT FROM (p_product->>'cost')::numeric) OR
      (p_product ? 'price' AND v_existing.price IS DISTINCT FROM (p_product->>'price')::numeric) OR
      (p_product ? 'mrp' AND v_existing.mrp IS DISTINCT FROM (p_product->>'mrp')::numeric) OR
      (p_product ? 'is_active' AND v_existing.is_active IS DISTINCT FROM (p_product->>'is_active')::boolean) OR
      (p_has_image AND v_existing.image_url IS DISTINCT FROM p_image_url);
    IF v_item_changed THEN
      UPDATE public.items SET
        name = p_product->>'name',
        sku = p_product->>'sku',
        barcode = CASE WHEN p_product ? 'barcode' THEN nullif(p_product->>'barcode', '') ELSE barcode END,
        brand = CASE WHEN p_product ? 'brand' THEN p_product->>'brand' ELSE brand END,
        category_id = CASE WHEN p_product ? 'category' THEN v_category_id ELSE category_id END,
        cost = CASE WHEN p_product ? 'cost' THEN (p_product->>'cost')::numeric ELSE cost END,
        price = CASE WHEN p_product ? 'price' THEN (p_product->>'price')::numeric ELSE price END,
        mrp = CASE WHEN p_product ? 'mrp' THEN (p_product->>'mrp')::numeric ELSE mrp END,
        is_active = CASE WHEN p_product ? 'is_active' THEN (p_product->>'is_active')::boolean ELSE is_active END,
        image_url = CASE WHEN p_has_image THEN p_image_url ELSE image_url END,
        updated_at = now()
      WHERE id = v_item_id AND tenant_id = p_tenant_id;
    END IF;
    v_outcome := CASE WHEN v_item_changed THEN 'update' ELSE 'unchanged' END;
  END IF;

  v_mode := p_stock->>'mode';
  IF v_mode IS DISTINCT FROM 'none' THEN
    IF p_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p_store_id AND s.tenant_id = p_tenant_id) THEN
      RAISE EXCEPTION 'Stock intent requires a verified tenant store' USING ERRCODE = '42501';
    END IF;
    IF v_actor.store_id IS NOT NULL AND v_actor.store_id <> p_store_id THEN
      RAISE EXCEPTION 'Requested store is outside the authenticated user store scope' USING ERRCODE = '42501';
    END IF;
    IF v_mode IS NULL OR v_mode NOT IN ('set', 'delta') OR p_stock->>'quantity' IS NULL THEN RAISE EXCEPTION 'Invalid stock intent' USING ERRCODE = '22023'; END IF;
    v_quantity := (p_stock->>'quantity')::numeric;
    IF v_quantity <> trunc(v_quantity) THEN RAISE EXCEPTION 'Stock quantity must be an integer' USING ERRCODE = '22023'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext(p_store_id::text), hashtext(v_item_id::text));
    SELECT coalesce(qty, 0) INTO v_current_qty FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = v_item_id FOR UPDATE;
    v_current_qty := coalesce(v_current_qty, 0);
    IF p_expected_stock_qty IS NULL OR v_current_qty IS DISTINCT FROM p_expected_stock_qty THEN
      RAISE EXCEPTION 'Store stock changed after preview' USING ERRCODE = '40001';
    END IF;
    IF v_mode = 'set' THEN
      IF v_quantity < 0 THEN RAISE EXCEPTION 'Set quantity cannot be negative' USING ERRCODE = '22023'; END IF;
      v_new_qty := v_quantity::integer;
    ELSE
      v_new_qty := v_current_qty + v_quantity::integer;
      IF v_new_qty < 0 THEN RAISE EXCEPTION 'Stock delta would make quantity negative' USING ERRCODE = '23514'; END IF;
    END IF;
    v_delta := v_new_qty - v_current_qty;
    IF v_delta <> 0 THEN
      INSERT INTO public.stock_levels(store_id, item_id, qty)
      VALUES (p_store_id, v_item_id, v_new_qty)
      ON CONFLICT (store_id, item_id) DO UPDATE SET qty = EXCLUDED.qty;
      INSERT INTO public.stock_movements(store_id, item_id, delta, reason, meta, performed_by, tenant_id, created_by)
      VALUES (p_store_id, v_item_id, v_delta, 'import', jsonb_build_object('batch_id', v_batch.batch_id, 'source_row', p_source_row), p_actor_id, p_tenant_id, p_actor_id);
      v_stock_changed := true;
    END IF;
  END IF;

  IF v_outcome = 'unchanged' AND v_stock_changed THEN v_outcome := 'update'; END IF;
  v_inserted_result := jsonb_build_object('item_id', v_item_id, 'outcome', v_outcome, 'stock_changed', v_stock_changed);
  UPDATE public.catalog_import_row_results SET result = v_inserted_result
  WHERE batch_row_id = p_batch_row_id AND source_row = p_source_row;
  RETURN v_inserted_result;
END;
$$;
