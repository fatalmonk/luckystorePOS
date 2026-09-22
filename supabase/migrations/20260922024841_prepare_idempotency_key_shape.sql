-- Prepare divergent legacy tables before the composite primary-key build.
-- This phase is transactional. The following migration builds the index online.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  tenant_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_at timestamptz,
  completed_at timestamptz,
  response_body jsonb,
  status text NOT NULL DEFAULT 'CLAIMED'
);

-- For an existing legacy table, add created_at without a volatile default so
-- PostgreSQL does not rewrite every row under a strong lock. Historical rows
-- may remain NULL; idempotency semantics do not depend on their creation time.
ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_body jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'CLAIMED';

ALTER TABLE public.idempotency_keys
  ALTER COLUMN created_at SET DEFAULT clock_timestamp(),
  ALTER COLUMN status SET DEFAULT 'CLAIMED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE tenant_id IS NULL OR idempotency_key IS NULL
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains rows without tenant_id or idempotency_key; manual data repair is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE btrim(idempotency_key) = ''
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains blank keys after trimming; manual data repair is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    GROUP BY tenant_id, btrim(idempotency_key)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains duplicate tenant-scoped keys after trimming; manual data repair is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE idempotency_key IS DISTINCT FROM btrim(idempotency_key)
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains non-canonical surrounding whitespace; trim keys before migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE status IS NULL
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains NULL status values; manual data repair is required';
  END IF;
END
$$;

ALTER TABLE public.idempotency_keys
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;
