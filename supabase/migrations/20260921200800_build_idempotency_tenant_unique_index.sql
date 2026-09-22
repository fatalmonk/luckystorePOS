-- pg-delta: transaction=false
-- Phase 1: prepare the tenant-scoped idempotency uniqueness contract without
-- holding a table lock for the duration of an index build.
--
-- This statement must remain outside a DO/BEGIN block: PostgreSQL forbids
-- CREATE INDEX CONCURRENTLY inside a transaction block.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_keys_tenant_key_prepared
  ON public.idempotency_keys (tenant_id, idempotency_key);
