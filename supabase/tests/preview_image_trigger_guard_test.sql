-- Security Tests project only. All item fixtures are rolled back.
BEGIN;

DO $guard$
BEGIN
  IF NOT (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    OR (session_user = 'postgres' AND current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo')
  ) THEN
    RAISE EXCEPTION 'preview trigger test may run only against the Security Tests project';
  END IF;
END $guard$;

DO $proof$
DECLARE
  v_other_tenant uuid;
  v_other_item uuid;
  v_test_store uuid;
  v_test_item uuid;
  v_key text;
  v_message text;
BEGIN
  SELECT tenant_id INTO v_other_tenant FROM public.stores
  WHERE tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY id LIMIT 1;
  SELECT id INTO v_test_store FROM public.stores
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY id LIMIT 1;
  IF v_other_tenant IS NULL OR v_test_store IS NULL THEN
    RAISE EXCEPTION 'required stores are missing';
  END IF;

  BEGIN
    INSERT INTO public.items(tenant_id, name, image_url)
    VALUES (
      v_other_tenant, 'Preview trigger non-test insert proof',
      'https://lucky-store-images-preview.luckystore-1947.workers.dev/products/' ||
        v_other_tenant || '/TEST-' || gen_random_uuid() || '.webp'
    );
    RAISE EXCEPTION 'non-test preview insert was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs are restricted to the Security Tests tenant' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO public.items(tenant_id, name, image_url)
    VALUES (
      v_other_tenant, 'Preview trigger mixed-case host proof',
      'https://LUCKY-STORE-IMAGES-PREVIEW.LUCKYSTORE-1947.WORKERS.DEV:443/products/' ||
        v_other_tenant || '/TEST-' || gen_random_uuid() || '.webp?param=1#frag'
    );
    RAISE EXCEPTION 'mixed-case preview host was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs are restricted to the Security Tests tenant' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO public.items(tenant_id, name, image_url)
    VALUES (
      v_other_tenant, 'Preview trigger arbitrary port proof',
      'https://lucky-store-images-preview.luckystore-1947.workers.dev:8443/products/' ||
        v_other_tenant || '/TEST-' || gen_random_uuid() || '.webp'
    );
    RAISE EXCEPTION 'arbitrary port preview host was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs are restricted to the Security Tests tenant' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO public.items(tenant_id, name, image_url)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Preview trigger direct insert proof',
      'https://lucky-store-images-preview.luckystore-1947.workers.dev/products/' ||
        '00000000-0000-0000-0000-000000000001/TEST-' || gen_random_uuid() || '.webp'
    );
    RAISE EXCEPTION 'direct preview insert was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs require CAS publication' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.items(tenant_id, name)
  VALUES (v_other_tenant, 'Preview trigger non-test update proof')
  RETURNING id INTO v_other_item;
  BEGIN
    UPDATE public.items
    SET image_url = 'https://lucky-store-images-preview.luckystore-1947.workers.dev/products/' ||
      v_other_tenant || '/TEST-' || gen_random_uuid() || '.webp'
    WHERE id = v_other_item;
    RAISE EXCEPTION 'non-test preview update was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs are restricted to the Security Tests tenant' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.items(tenant_id, name)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Preview trigger CAS proof'
  ) RETURNING id INTO v_test_item;
  v_key := 'products/00000000-0000-0000-0000-000000000001/TEST-' ||
    gen_random_uuid() || '.webp';
  IF NOT public.publish_item_image_if_current(
    v_test_item, '00000000-0000-0000-0000-000000000001'::uuid,
    v_test_store, NULL, 0, v_key,
    'https://lucky-store-images-preview.luckystore-1947.workers.dev/' || v_key,
    repeat('a', 64)
  ) THEN
    RAISE EXCEPTION 'test-tenant CAS did not update item';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.items
    WHERE id = v_test_item AND image_key = v_key AND image_version = 1
  ) THEN
    RAISE EXCEPTION 'test-tenant CAS did not preserve image provenance';
  END IF;
  UPDATE public.items SET name = 'Preview trigger unrelated update proof'
  WHERE id = v_test_item;
END $proof$;

ROLLBACK;
