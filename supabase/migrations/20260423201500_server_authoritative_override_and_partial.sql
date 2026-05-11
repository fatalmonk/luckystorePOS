-- Server-authoritative sale execution: override token + partial fulfillment + immutable audit.

CREATE TABLE IF NOT EXISTS public.pos_override_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  reason text NOT NULL,
  affected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_override_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pot_select ON public.pos_override_tokens;
CREATE POLICY pot_select ON public.pos_override_tokens
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

CREATE TABLE IF NOT EXISTS public.sale_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  client_transaction_id text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  operator_user_id uuid REFERENCES public.users(id),
  status text NOT NULL,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_used boolean NOT NULL DEFAULT false,
  override_user_id uuid REFERENCES public.users(id),
  override_reason text,
  stock_delta jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sal_select ON public.sale_audit_log;
CREATE POLICY sal_select ON public.sale_audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

CREATE OR REPLACE FUNCTION public.prevent_sale_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'sale_audit_log is immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sale_audit_log_update ON public.sale_audit_log;
CREATE TRIGGER trg_prevent_sale_audit_log_update
BEFORE UPDATE OR DELETE ON public.sale_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sale_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.issue_pos_override_token(
  p_store_id uuid,
  p_reason text,
  p_affected_items jsonb DEFAULT '[]'::jsonb,
  p_ttl_minutes integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_plain_token text;
BEGIN
  SELECT id, role INTO v_user_id, v_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Manager/Admin role required'
    );
  END IF;

  v_plain_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.pos_override_tokens (
    store_id, issued_by, token_hash, reason, affected_items, expires_at
  ) VALUES (
    p_store_id,
    v_user_id,
    encode(digest(v_plain_token, 'sha256'), 'hex'),
    p_reason,
    COALESCE(p_affected_items, '[]'::jsonb),
    now() + make_interval(mins => GREATEST(1, p_ttl_minutes))
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'override_token', v_plain_token,
    'expires_at', (now() + make_interval(mins => GREATEST(1, p_ttl_minutes)))
  );
END;
$$;

-- NOTE: complete_sale() is now defined in migration 20260426213841_domain_rpcs_trust_engine.sql
-- This migration previously defined it here, but the canonical version is in the later migration.
-- Keeping DROP for idempotency if rolling back:
DROP FUNCTION IF EXISTS public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb);

-- Function body removed to avoid duplicate definition conflicts.
-- See 20260426213841_domain_rpcs_trust_engine.sql for the canonical implementation.

-- Permissions handled in baseline migration (20260301000000_baseline_core_tables.sql)
-- REVOKE ALL ON FUNCTION public.complete_sale(...) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.complete_sale(...) TO authenticated;
