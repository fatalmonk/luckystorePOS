-- Keep anonymous-store access fail-closed while exposing the established
-- denial wording used by API callers and the P0/P1 proof.

DO $migration$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.lookup_item_by_scan_anon(text,uuid)'::regprocedure)
  INTO v_definition;

  IF position('Store not public for anonymous users' IN v_definition) > 0 THEN
    RETURN;
  END IF;

  IF position('Store not accessible to anonymous users' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'unexpected anonymous scanner denial contract';
  END IF;

  EXECUTE replace(
    v_definition,
    'Store not accessible to anonymous users',
    'Store not public for anonymous users'
  );
END
$migration$;
