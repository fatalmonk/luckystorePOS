\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_observed text;
  v_catalog text;
  v_status text;
BEGIN
  IF has_function_privilege('anon', 'public.extract_product_variant(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_valid_product_gtin(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anonymous role can execute matcher helper functions';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.extract_product_variant(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.is_valid_product_gtin(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated role cannot execute matcher helper functions';
  END IF;

  v_observed := public.extract_product_variant('Acme Chocolate Mint 500g');
  v_catalog := public.extract_product_variant('Acme Chocolate Original 500g');

  IF v_observed <> 'mint' OR v_catalog <> 'original' THEN
    RAISE EXCEPTION 'variant parser selected a family word instead of the explicit qualifier: %, %', v_observed, v_catalog;
  END IF;

  IF v_observed IS NOT DISTINCT FROM v_catalog THEN
    RAISE EXCEPTION 'different recognized variants collapsed to the same value: %', v_observed;
  END IF;

  v_status := public.classify_competitor_product_match(
    'Acme Chocolate Mint 500g', 'Acme', NULL,
    'Acme Chocolate Original 500g', 'Acme', NULL, false
  );

  IF v_status <> 'REJECTED' THEN
    RAISE EXCEPTION 'conflicting product variants must be rejected, got %', v_status;
  END IF;

  IF public.classify_competitor_product_match(
    'Acme Chocolate', 'Acme', NULL,
    'Acme Chocolate Original 500g', 'Acme', NULL, true
  ) <> 'VERIFIED' THEN
    RAISE EXCEPTION 'previously verified mapping should tolerate omitted variant evidence';
  END IF;
END;
$$;

ROLLBACK;
