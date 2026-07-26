-- Complete the internal ledger-worker boundary at its enqueue entry points.
--
-- Sales continue to enqueue through trg_enqueue_sale_for_ledger_posting, whose
-- trigger function executes as its owner. Direct Data API execution is not part
-- of the application contract and must remain service-only.

DO $migration$
BEGIN
  IF to_regprocedure(
    'public.enqueue_sale_for_ledger_posting(uuid,uuid,integer)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Required ledger enqueue function is missing';
  END IF;

  IF to_regprocedure(
    'public.enqueue_sale_for_ledger_posting_from_sales()'
  ) IS NULL THEN
    RAISE EXCEPTION 'Required ledger enqueue trigger function is missing';
  END IF;
END;
$migration$;

REVOKE ALL ON FUNCTION
  public.enqueue_sale_for_ledger_posting(uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION
  public.enqueue_sale_for_ledger_posting_from_sales()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.enqueue_sale_for_ledger_posting(uuid, uuid, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.enqueue_sale_for_ledger_posting_from_sales()
  TO service_role;

DO $migration$
DECLARE
  v_signature text;
  v_function regprocedure;
  v_signatures constant text[] := ARRAY[
    'public.enqueue_sale_for_ledger_posting(uuid,uuid,integer)',
    'public.enqueue_sale_for_ledger_posting_from_sales()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures
  LOOP
    v_function := to_regprocedure(v_signature);

    IF has_function_privilege('anon', v_function, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Public execution remains on %', v_signature;
    END IF;

    IF NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role execution is missing on %', v_signature;
    END IF;
  END LOOP;
END;
$migration$;
