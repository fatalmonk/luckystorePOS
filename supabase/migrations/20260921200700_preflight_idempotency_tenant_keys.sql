-- Preflight the online uniqueness build. Duplicate financial-idempotency rows
-- are not auto-deleted because choosing a winner can discard a completed
-- response. Fail closed and require explicit reconciliation instead.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    WHERE tenant_id IS NULL OR idempotency_key IS NULL
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains NULL tenant/key values; reconcile before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    GROUP BY tenant_id, idempotency_key
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains duplicate tenant/key rows; reconcile completed responses before migration';
  END IF;
END
$$;
