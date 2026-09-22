-- Prepare divergent legacy tables before the online composite-key build.
-- Keep this phase transactional; the following migration builds the index online.

ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_body jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CLAIMED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE tenant_id IS NULL OR idempotency_key IS NULL
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains rows without tenant_id or idempotency_key; manual data repair is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    GROUP BY tenant_id, idempotency_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains duplicate tenant-scoped keys; manual data repair is required';
  END IF;
END
$$;

ALTER TABLE public.idempotency_keys
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;
