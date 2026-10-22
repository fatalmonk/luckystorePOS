\set ON_ERROR_STOP on

BEGIN;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-0000-0000-000000000011","role":"authenticated"}',
  true
);

INSERT INTO public.tenants (id, name)
VALUES ('91000000-0000-0000-0000-000000000011', 'Confirmed competitor match test');

INSERT INTO public.stores (id, tenant_id, code, name)
VALUES (
  '92000000-0000-0000-0000-000000000011',
  '91000000-0000-0000-0000-000000000011',
  'COMP-MATCH-CONFIRMED-11',
  'Confirmed competitor match test'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
VALUES (
  '95000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'competitor-rematch-11@test.invalid', '',
  now(), now(), now()
);

INSERT INTO public.users (id, auth_id, email, role, store_id, tenant_id, name)
VALUES (
  '95000000-0000-0000-0000-000000000011',
  '95000000-0000-0000-0000-000000000011',
  'competitor-rematch-11@test.invalid', 'manager',
  '92000000-0000-0000-0000-000000000011',
  '91000000-0000-0000-0000-000000000011',
  'Competitor rematch test'
);

INSERT INTO public.items (id, tenant_id, name, brand, price, barcode, is_active)
VALUES (
  '93000000-0000-0000-0000-000000000011',
  '91000000-0000-0000-0000-000000000011',
  'Acme Chocolate Original 500g', 'Acme', 945, NULL, true
);

INSERT INTO public.competitor_prices (
  id, store_id, product_name, competitor_name, competitor_price,
  competitor_product_url, raw_data, competitor_key, matcher_version
)
VALUES
(
  '94000000-0000-0000-0000-000000000011',
  '92000000-0000-0000-0000-000000000011',
  'Acme Chocolate', 'Test Competitor', 1300,
  NULL, '{"brand":"Acme"}'::jsonb, 'test-competitor', 'legacy-v1'
),
(
  '94000000-0000-0000-0000-000000000012',
  '92000000-0000-0000-0000-000000000011',
  'Acme Chocolate Original 500g', 'Test Competitor 2', 1300,
  NULL, '{"brand":"Acme"}'::jsonb, 'test-competitor', 'legacy-v1'
);

DO $$
DECLARE
  v_match_version text;
  v_linked boolean;
BEGIN
  -- Existing four-argument matcher callers remain valid with the new optional brand argument.
  SELECT matcher_version INTO v_match_version
  FROM public.match_competitor_price_item(
    p_store_id => '92000000-0000-0000-0000-000000000011',
    p_scraped_product_name => 'Acme Chocolate Original 500g',
    p_scraped_barcode => NULL,
    p_scraped_url => NULL
  );
  IF v_match_version IS NULL THEN RAISE EXCEPTION 'legacy matcher argument set did not resolve'; END IF;

  -- Existing four-argument link calls continue using the default false confirmation flag.
  v_linked := public.link_competitor_price_item(
    p_store_id => '92000000-0000-0000-0000-000000000011',
    p_price_record_id => '94000000-0000-0000-0000-000000000012',
    p_item_id => '93000000-0000-0000-0000-000000000011',
    p_competitor_product_url => NULL
  );
  IF v_linked IS DISTINCT FROM true THEN RAISE EXCEPTION 'legacy link argument set did not resolve'; END IF;
END;
$$;

SELECT public.link_competitor_price_item(
  p_store_id => '92000000-0000-0000-0000-000000000011',
  p_price_record_id => '94000000-0000-0000-0000-000000000011',
  p_item_id => '93000000-0000-0000-0000-000000000011',
  p_confirmed_product_identity => true
);

SELECT * FROM public.rematch_competitor_prices('92000000-0000-0000-0000-000000000011');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.competitor_prices
    WHERE id = '94000000-0000-0000-0000-000000000011'
      AND item_id = '93000000-0000-0000-0000-000000000011'
      AND matcher_version = 'safe-v2:VERIFIED:user-confirmed'
  ) THEN
    RAISE EXCEPTION 'valid user-confirmed mapping was lost during rematch';
  END IF;
END;
$$;

UPDATE public.competitor_prices
SET product_name = 'Acme Chocolate Original 1kg'
WHERE id = '94000000-0000-0000-0000-000000000011';

SELECT * FROM public.rematch_competitor_prices('92000000-0000-0000-0000-000000000011');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.competitor_prices
    WHERE id = '94000000-0000-0000-0000-000000000011'
      AND (item_id IS NOT NULL OR matcher_version LIKE 'safe-v2:VERIFIED:%')
  ) THEN
    RAISE EXCEPTION 'confirmed mapping bypassed a later package-size conflict';
  END IF;
END;
$$;

ROLLBACK;
