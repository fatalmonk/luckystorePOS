-- Run only against the Security Tests project. Every call uses a nonexistent item.
BEGIN;

DO $guard$
BEGIN
  IF NOT (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    OR (session_user = 'postgres' AND current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo')
  ) THEN
    RAISE EXCEPTION 'preview CAS test may run only against the Security Tests project';
  END IF;
END $guard$;

DO $proof$
DECLARE
  v_other_store uuid;
  v_other_tenant uuid;
  v_test_store uuid;
  v_key text;
  v_test_key text;
  v_message text;
BEGIN
  SELECT id, tenant_id INTO v_other_store, v_other_tenant
  FROM public.stores
  WHERE tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY id LIMIT 1;
  SELECT id INTO v_test_store
  FROM public.stores
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  ORDER BY id LIMIT 1;
  IF v_other_store IS NULL OR v_test_store IS NULL THEN
    RAISE EXCEPTION 'required test and non-test stores are missing';
  END IF;

  v_key := 'products/' || v_other_tenant || '/TEST-' || gen_random_uuid() || '.webp';
  BEGIN
    PERFORM public.publish_item_image_if_current(
      gen_random_uuid(), v_other_tenant, v_other_store, NULL, 0, v_key,
      'https://lucky-store-images-preview.luckystore-1947.workers.dev/' || v_key,
      repeat('a', 64)
    );
    RAISE EXCEPTION 'preview host accepted for non-test tenant';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'Preview image URLs are restricted to the Security Tests tenant' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM public.publish_item_image_if_current(
      gen_random_uuid(), v_other_tenant, v_other_store, NULL, 0, NULL,
      'https://images.luckystore1947.com/products/invalid.webp', NULL
    );
    RAISE EXCEPTION 'URL accepted with null image key';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'URL and checksum must be NULL when image key is NULL' THEN
      RAISE;
    END IF;
  END;

  v_test_key := 'products/00000000-0000-0000-0000-000000000001/TEST-' ||
    gen_random_uuid() || '.webp';
  IF public.publish_item_image_if_current(
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
    v_test_store, NULL, 0, v_test_key,
    'https://lucky-store-images-preview.luckystore-1947.workers.dev/' || v_test_key,
    repeat('b', 64)
  ) THEN
    RAISE EXCEPTION 'nonexistent test item was updated';
  END IF;

  IF public.publish_item_image_if_current(
    gen_random_uuid(), v_other_tenant, v_other_store, NULL, 0, v_key,
    'https://images.luckystore1947.com/' || v_key, repeat('c', 64)
  ) THEN
    RAISE EXCEPTION 'nonexistent production-host item was updated';
  END IF;
END $proof$;

ROLLBACK;
