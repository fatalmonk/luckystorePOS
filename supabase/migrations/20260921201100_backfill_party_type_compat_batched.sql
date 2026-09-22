-- pg-delta: transaction=false
-- Reconcile legacy/new party type columns without rewriting the full table in
-- one migration transaction. The procedure commits after each bounded batch,
-- so row locks are released and an interrupted replay resumes from remaining
-- mismatches.

CREATE OR REPLACE PROCEDURE public.backfill_party_type_compat(
  p_batch_size integer DEFAULT 500
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'party type backfill batch size must be between 1 and 5000';
  END IF;

  LOOP
    WITH batch AS (
      SELECT p.id
      FROM public.parties p
      WHERE p.party_type IS NULL
         OR p.type IS NULL
         OR p.party_type IS DISTINCT FROM p.type
      ORDER BY p.id
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.parties p
    SET party_type = COALESCE(p.party_type, p.type, 'customer'),
        type = COALESCE(p.party_type, p.type, 'customer')
    FROM batch b
    WHERE p.id = b.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;

    COMMIT;
  END LOOP;
END;
$$;

CALL public.backfill_party_type_compat(500);
DROP PROCEDURE public.backfill_party_type_compat(integer);
