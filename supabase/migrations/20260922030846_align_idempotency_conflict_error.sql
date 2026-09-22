-- Preserve the existing atomic claim implementation while exposing the
-- documented conflict wording consumed by callers and the P0/P1 proof.

DO $migration$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.check_idempotency(text,uuid)'::regprocedure)
  INTO v_definition;

  IF position(
    'idempotency key conflict: concurrent request in progress' IN v_definition
  ) > 0 THEN
    RETURN;
  END IF;

  IF position(
    'Concurrent request with overlapping idempotency key' IN v_definition
  ) = 0 THEN
    RAISE EXCEPTION 'unexpected check_idempotency conflict contract';
  END IF;

  EXECUTE replace(
    v_definition,
    'Concurrent request with overlapping idempotency key',
    'idempotency key conflict: concurrent request in progress'
  );
END
$migration$;
