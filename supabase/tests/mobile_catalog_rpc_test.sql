-- Mobile catalog server-pagination, visibility, translation, and tenant tests.
-- Fixture data is isolated by a generated tenant and rolled back at the end.
BEGIN;

DO $$
DECLARE
  v_tenant_id uuid := gen_random_uuid();
  v_other_tenant_id uuid := gen_random_uuid();
  v_store_id uuid := gen_random_uuid();
  v_other_store_id uuid := gen_random_uuid();
  v_category_id uuid := gen_random_uuid();
  v_other_category_id uuid := gen_random_uuid();
  v_apple_id uuid := gen_random_uuid();
  v_banana_id uuid := gen_random_uuid();
  v_mango_id uuid := gen_random_uuid();
  v_hidden_id uuid := gen_random_uuid();
  v_foreign_id uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES
    (v_tenant_id, 'Mobile Catalog RPC Test'),
    (v_other_tenant_id, 'Mobile Catalog RPC Isolation Test');
  INSERT INTO public.stores (id, name, tenant_id, metadata) VALUES
    (v_store_id, 'Mobile Catalog Public Test', v_tenant_id, '{"is_public_storefront": true}'),
    (v_other_store_id, 'Mobile Catalog Private Test', v_tenant_id, '{"is_public_storefront": false}');
  INSERT INTO public.categories (id, tenant_id, store_id, name, slug) VALUES
    (v_category_id, v_tenant_id, v_store_id, 'Fruit', 'fruit'),
    (v_other_category_id, v_tenant_id, v_store_id, 'Drinks', 'drinks');
  INSERT INTO public.items (id, tenant_id, name, description, price, mrp, cost, category_id, is_active, brand) VALUES
    (v_apple_id, v_tenant_id, 'Apple Juice 100%', 'Fresh apple juice', 10, 15, 5, v_category_id, true, 'Fruit Co'),
    (v_banana_id, v_tenant_id, 'Banana', 'Ripe fruit', 5, 5, 2, v_category_id, true, 'Fruit Co'),
    (v_mango_id, v_tenant_id, 'Mango Drink', 'Sweet drink', 20, 20, 8, v_other_category_id, true, 'Drink Co'),
    (v_hidden_id, v_tenant_id, 'Hidden Item', 'Inactive', 1, 1, 1, v_category_id, false, 'Hidden Co'),
    (v_foreign_id, v_other_tenant_id, 'Foreign Tenant Item', 'Never visible', 1, 1, 1, v_category_id, true, 'Foreign Co');
  INSERT INTO public.stock_levels (store_id, item_id, tenant_id, qty, reserved, qty_reserved_online) VALUES
    (v_store_id, v_apple_id, v_tenant_id, 5, 2, 1),
    (v_store_id, v_banana_id, v_tenant_id, 1, 1, 0),
    (v_store_id, v_mango_id, v_tenant_id, 0, 0, 0),
    (v_store_id, v_hidden_id, v_tenant_id, 20, 0, 0);
  INSERT INTO public.item_translations (item_id, tenant_id, locale, name, description, review_status) VALUES
    (v_mango_id, v_tenant_id, 'bn', 'আমের পানীয়', 'মিষ্টি পানীয়', 'published'),
    (v_banana_id, v_tenant_id, 'bn', 'কলা', 'পাকা ফল', 'draft');

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'best', 2, 0);
  IF (v_result->>'total')::integer <> 3 OR jsonb_array_length(v_result->'items') <> 2 THEN
    RAISE EXCEPTION 'page 1 should return two of three visible products: %', v_result;
  END IF;
  IF v_result->'items'->0->>'id' <> v_apple_id::text
    OR v_result->'items'->1->>'id' <> v_banana_id::text THEN
    RAISE EXCEPTION 'best sort should prioritize sellable stock and preserve stable name order: %', v_result;
  END IF;
  IF (v_result->'items'->0->>'sellable_qty')::integer <> 2
    OR (v_result->'items'->0->>'mrp')::numeric <> 15 THEN
    RAISE EXCEPTION 'price or sellable stock projection is incorrect: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'best', 2, 2);
  IF (v_result->>'total')::integer <> 3
    OR jsonb_array_length(v_result->'items') <> 1
    OR v_result->'items'->0->>'id' <> v_mango_id::text THEN
    RAISE EXCEPTION 'final page or exact total is incorrect: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'best', 2, 20);
  IF (v_result->>'total')::integer <> 3 OR jsonb_array_length(v_result->'items') <> 0 THEN
    RAISE EXCEPTION 'empty page must retain the exact matching total: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', ARRAY[v_category_id], false, 'price-asc', 20, 0);
  IF (v_result->>'total')::integer <> 2
    OR jsonb_array_length(v_result->'items') <> 2
    OR v_result->'items'->0->>'id' <> v_banana_id::text THEN
    RAISE EXCEPTION 'category filter or price sort failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'price-desc', 20, 0);
  IF (v_result->>'total')::integer <> 3 OR v_result->'items'->0->>'id' <> v_mango_id::text THEN
    RAISE EXCEPTION 'descending price sort failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'name-asc', 20, 0);
  IF v_result->'items'->0->>'id' <> v_apple_id::text THEN
    RAISE EXCEPTION 'name sort failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, 'Juice', NULL, false, 'best', 20, 0);
  IF (v_result->>'total')::integer <> 1 OR v_result->'items'->0->>'id' <> v_apple_id::text THEN
    RAISE EXCEPTION 'English product search failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, 'আম', NULL, false, 'name-asc', 20, 0);
  IF (v_result->>'total')::integer <> 1 OR v_result->'items'->0->>'id' <> v_mango_id::text THEN
    RAISE EXCEPTION 'published Bengali translation search failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, 'পাকা', NULL, false, 'best', 20, 0);
  IF (v_result->>'total')::integer <> 0 THEN
    RAISE EXCEPTION 'draft Bengali translation must not be searchable: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '100%', NULL, true, 'price-desc', 20, 0);
  IF (v_result->>'total')::integer <> 1 OR v_result->'items'->0->>'id' <> v_apple_id::text THEN
    RAISE EXCEPTION 'literal search, stock filter, or inactive-item visibility failed: %', v_result;
  END IF;

  v_result := public.search_storefront_mobile_catalog_v1(v_other_store_id, '', NULL, false, 'best', 20, 0);
  IF (v_result->>'total')::integer <> 0 OR jsonb_array_length(v_result->'items') <> 0 THEN
    RAISE EXCEPTION 'non-public store must return an empty catalog: %', v_result;
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.search_storefront_mobile_catalog_v1(uuid,text,uuid[],boolean,text,integer,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must be able to call the public mobile catalog RPC';
  END IF;

  SET LOCAL ROLE anon;
  v_result := public.search_storefront_mobile_catalog_v1(v_store_id, '', NULL, false, 'best', 20, 0);
  RESET ROLE;
  IF (v_result->>'total')::integer <> 3 OR (v_result->'items'->0 ? 'cost') THEN
    RAISE EXCEPTION 'anonymous RPC response or cost redaction is incorrect: %', v_result;
  END IF;
END
$$;

ROLLBACK;
