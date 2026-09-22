-- Phase 2: attach the concurrently-built unique index as the canonical
-- tenant-scoped uniqueness constraint. The later repair migration sees this
-- constraint and skips its blocking ADD UNIQUE path.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND conname = 'idempotency_keys_tenant_key_unique'
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_tenant_key_unique
      UNIQUE USING INDEX idx_idempotency_keys_tenant_key_prepared;
  END IF;
END
$$;
