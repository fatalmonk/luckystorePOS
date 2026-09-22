-- pg-delta: transaction=false
-- Phase 1: prepare tenant-scoped idempotency uniqueness without holding a
-- table lock for the duration of the index build.
--
-- Supabase CLI honors the pg-delta transaction directive for db push/reset.
-- DROP/CREATE CONCURRENTLY must remain top-level statements.
--
-- A failed concurrent build can leave an INVALID index with the target name.
-- Dropping the prepared index first makes a replay/retry deterministic. After
-- successful attachment in the next migration PostgreSQL renames the backing
-- index to the constraint name, so this prepared name is no longer present.

DROP INDEX CONCURRENTLY IF EXISTS public.idx_idempotency_keys_tenant_key_prepared;

CREATE UNIQUE INDEX CONCURRENTLY idx_idempotency_keys_tenant_key_prepared
  ON public.idempotency_keys (tenant_id, idempotency_key);
