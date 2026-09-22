-- Reconstruct the checkout/payment idempotency store when migration history
-- exists but the physical table is absent or retains its legacy global key.
-- The canonical identity is tenant-scoped.

-- If the table is physically absent, create it already in canonical form. This
-- is the safe fallback for environments whose migration ledger says the earlier
-- index phase ran even though the table was later lost.
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_at timestamptz,
  completed_at timestamptz,
  response_body jsonb,
  status text NOT NULL DEFAULT 'CLAIMED',
  CONSTRAINT idempotency_keys_pkey PRIMARY KEY (tenant_id, idempotency_key)
);

DO $migration$
DECLARE
  v_constraint_name text;
  v_candidate_valid boolean;
BEGIN
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

  IF EXISTS (SELECT 1 FROM public.idempotency_keys WHERE status IS NULL) THEN
    RAISE EXCEPTION 'idempotency_keys contains NULL status values; manual data repair is required';
  END IF;

  ALTER TABLE public.idempotency_keys
    ALTER COLUMN tenant_id SET NOT NULL,
    ALTER COLUMN idempotency_key SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

  -- Remove only legacy global uniqueness on idempotency_key.
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
    EXECUTE format('ALTER TABLE public.idempotency_keys DROP CONSTRAINT %I', v_constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND contype = 'p'
  ) THEN
    SELECT i.indisvalid
      INTO v_candidate_valid
    FROM pg_class idx
    JOIN pg_index i ON i.indexrelid = idx.oid
    WHERE idx.oid = to_regclass('public.idx_idempotency_keys_tenant_pkey_prepared');

    IF v_candidate_valid IS TRUE THEN
      ALTER TABLE public.idempotency_keys
        ADD CONSTRAINT idempotency_keys_pkey
        PRIMARY KEY USING INDEX idx_idempotency_keys_tenant_pkey_prepared;
    ELSE
      RAISE EXCEPTION 'Prepared tenant primary-key index is missing or invalid; rerun the concurrent primary-index phase before repair';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND contype = 'f'
      AND confrelid = 'public.tenants'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.idempotency_keys'::regclass
           AND attname = 'tenant_id' AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
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
REVOKE ALL PRIVILEGES ON TABLE public.idempotency_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.idempotency_keys TO service_role;
