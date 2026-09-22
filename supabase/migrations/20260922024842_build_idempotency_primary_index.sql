-- pg-delta: transaction=false
-- Build the tenant-scoped candidate primary-key index without blocking writes.
-- The prepared name is disposable: after successful PRIMARY KEY USING INDEX,
-- PostgreSQL renames the backing index to the constraint name.

DROP INDEX CONCURRENTLY IF EXISTS public.idx_idempotency_keys_tenant_pkey_prepared;

CREATE UNIQUE INDEX CONCURRENTLY idx_idempotency_keys_tenant_pkey_prepared
  ON public.idempotency_keys (tenant_id, idempotency_key);
