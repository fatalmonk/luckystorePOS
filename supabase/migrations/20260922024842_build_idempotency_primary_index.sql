-- pg-delta: transaction=false
-- Build the tenant-scoped candidate primary-key index without blocking writes.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_keys_tenant_pkey_prepared
  ON public.idempotency_keys (tenant_id, idempotency_key);
