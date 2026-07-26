-- Repair live schema drift in the ledger posting function.
--
-- public.sale_items stores its authoritative selling value in `price`; the
-- deployed function still dereferences a removed `unit_price` record field.
-- Rewrite only that exact stale field reference and fail closed if the live
-- function or schema no longer matches the reviewed contract.

DO $migration$
DECLARE
  v_definition text;
  v_rewritten text;
  v_reference_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_items'
      AND column_name = 'price'
  ) THEN
    RAISE EXCEPTION 'public.sale_items.price is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_items'
      AND column_name = 'unit_price'
  ) THEN
    RAISE EXCEPTION
      'public.sale_items.unit_price exists; reviewed live contract has changed';
  END IF;

  SELECT pg_get_functiondef(
    'public.post_sale_to_ledger(uuid)'::regprocedure
  )
  INTO v_definition;

  v_reference_count :=
    (
      length(v_definition)
      - length(replace(v_definition, 'v_item.unit_price', ''))
    ) / length('v_item.unit_price');

  IF v_reference_count IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION
      'Expected 4 stale unit_price references, found %',
      v_reference_count;
  END IF;

  v_rewritten := replace(
    v_definition,
    'v_item.unit_price',
    'v_item.price'
  );

  EXECUTE v_rewritten;

  IF position(
    'v_item.unit_price' IN pg_get_functiondef(
      'public.post_sale_to_ledger(uuid)'::regprocedure
    )
  ) > 0 THEN
    RAISE EXCEPTION 'Stale unit_price reference remains after repair';
  END IF;
END;
$migration$;

COMMENT ON FUNCTION public.post_sale_to_ledger(uuid) IS
  'Posts a sale to the ledger using sale_items.price as the selling-price contract.';
