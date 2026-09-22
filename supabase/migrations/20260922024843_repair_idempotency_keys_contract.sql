-- Reconstruct the checkout/payment idempotency store when migration history
-- exists but the physical table is absent or retains its legacy global key.
-- The canonical identity is tenant-scoped: the same idempotency key may be
-- used independently by different tenants.
--
-- The preceding phases normalize columns and build the composite candidate
-- index CONCURRENTLY. This phase only performs short metadata/constraint locks.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_at timestamptz,
  completed_at timestamptz,
  response_body jsonb,
  status text NOT NULL DEFAULT 'CLAIMED'
);

DO $migration$
DECLARE
  v_constraint_name text;
BEGIN
  ALTER TABLE public.idempotency_keys
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS idempotency_key text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    ADD COLUMN IF NOT EXISTS locked_at timestamptz,
    ADD COLUMN IF NOT EXISTS completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS response_body jsonb,
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CLAIMED';

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    WHERE tenant_id IS NULL OR idempotency_key IS NULL
  ) THEN
    RAISE EXCEPTION
      'idempotency_keys contains rows without tenant_id or idempotency_key; manual data repair is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    GROUP BY tenant_id, idempotency_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'idempotency_keys contains duplicate tenant-scoped keys; manual data repair is required';
  END IF;

  ALTER TABLE public.idempotency_keys
    ALTER COLUMN tenant_id SET NOT NULL,
    ALTER COLUMN idempotency_key SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

  -- Drop legacy global key constraints only after the tenant-scoped candidate
  -- index has been built and validated by PostgreSQL in the prior migration.
  FOR v_constraint_name IN
    SELECT c.conname
    FROM pg_constraint AS c
    WHERE c.conrelid = 'public.idempotency_keys'::regclass
      AND c.contype IN ('p', 'u')
      AND c.conkey = ARRAY[
        (SELECT attnum
         FROM pg_attribute
         WHERE attrelid = 'public.idempotency_keys'::regclass
           AND attname = 'idempotency_key'
           AND NOT attisdropped)
      ]::smallint[]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.idempotency_keys DROP CONSTRAINT %I',
      v_constraint_name
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_pkey
      PRIMARY KEY USING INDEX idx_idempotency_keys_tenant_pkey_prepared;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND contype = 'f'
      AND confrelid = 'public.tenants'::regclass
      AND conkey = ARRAY[
        (SELECT attnum
         FROM pg_attribute
         WHERE attrelid = 'public.idempotency_keys'::regclass
           AND attname = 'tenant_id'
           AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND conname = 'idempotency_keys_status_check'
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_status_check
      CHECK (status IN ('CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'));
  END IF;
END
$migration$;

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Idempotency rows are an internal transaction boundary. Client roles access
-- them only through reviewed RPCs; service_role retains backend access.
REVOKE ALL PRIVILEGES ON TABLE public.idempotency_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.idempotency_keys TO service_role;
