-- Normalize the minimum legacy idempotency shape before the online uniqueness
-- build. This must run before the concurrent index phases because some replay
-- histories have the migration ledger but no physical table/columns.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  tenant_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_at timestamptz,
  completed_at timestamptz,
  response_body jsonb,
  status text NOT NULL DEFAULT 'CLAIMED'
);

ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Duplicate financial-idempotency rows are never auto-deleted: choosing a
-- winner could discard a completed response. Fail closed and require explicit
-- reconciliation. Canonical keys are trimmed because every current RPC uses
-- BTRIM/TRIM before lookup and insertion.
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
    WHERE btrim(idempotency_key) = ''
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains blank keys after trimming; reconcile before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    GROUP BY tenant_id, btrim(idempotency_key)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains duplicate tenant/key rows after trimming; reconcile completed responses before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    WHERE idempotency_key IS DISTINCT FROM btrim(idempotency_key)
  ) THEN
    RAISE EXCEPTION 'idempotency_keys contains non-canonical surrounding whitespace; trim keys explicitly before migration';
  END IF;
END
$$;
