-- Retail-grade accounting and reconciliation layer.
-- Adds double-entry ledger, immutable posting, sale->ledger linkage, and daily reconciliation RPC.

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE')),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

CREATE TABLE IF NOT EXISTS public.ledger_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  source_ref text,
  status text NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED')),
  override_used boolean NOT NULL DEFAULT false,
  risk_flag boolean NOT NULL DEFAULT false,
  risk_note text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.ledger_batches(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES public.sales(id),
  line_ref text,
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  annotation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS ledger_batch_id uuid REFERENCES public.ledger_batches(id),
  ADD COLUMN IF NOT EXISTS fulfilled_subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS backordered_subtotal numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_ledger_batches_store_posted ON public.ledger_batches(store_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_batch ON public.ledger_entries(batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_batch ON public.sales(ledger_batch_id);

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS la_select ON public.ledger_accounts;
CREATE POLICY la_select ON public.ledger_accounts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS lb_select ON public.ledger_batches;
CREATE POLICY lb_select ON public.ledger_batches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS le_select ON public.ledger_entries;
CREATE POLICY le_select ON public.ledger_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ledger_batches lb
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE lb.id = ledger_entries.batch_id
      AND u.role IN ('admin', 'manager')
  )
);

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ledger_entries_mutation ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_entries_mutation
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_ledger_batches_mutation ON public.ledger_batches;
CREATE TRIGGER trg_prevent_ledger_batches_mutation
BEFORE UPDATE OR DELETE ON public.ledger_batches
FOR EACH ROW
WHEN (OLD.status = 'POSTED')
EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION public.ensure_sale_ledger_accounts(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '1000_CASH', 'Cash on Hand', 'ASSET', true),
    (p_store_id, '1010_BANK', 'Bank / Mobile Settlement', 'ASSET', true),
    (p_store_id, '4000_SALES_REVENUE', 'Sales Revenue (Gross)', 'REVENUE', true),
    (p_store_id, '5000_COGS', 'Cost of Goods Sold', 'EXPENSE', true),
    (p_store_id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true),
    (p_store_id, '5100_DISCOUNT_ABSORPTION', 'Discount Absorption (MRP delta)', 'EXPENSE', true)
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_payment_ledger_account(
  p_store_id uuid,
  p_payment_method_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type public.payment_type;
  v_account uuid;
BEGIN
  SELECT pm.type INTO v_type
  FROM public.payment_methods pm
  WHERE pm.id = p_payment_method_id
    AND pm.store_id = p_store_id
  LIMIT 1;

  IF v_type = 'cash' THEN
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1010_BANK';
  END IF;

  RETURN v_account;
END;
$$;

-- NOTE: complete_sale() is now defined in migration 20260426213841_domain_rpcs_trust_engine.sql
-- This migration previously defined it here, but the canonical version is in the later migration.
-- Keeping DROP for idempotency if rolling back:
DROP FUNCTION IF EXISTS public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text);

-- Function body removed to avoid duplicate definition conflicts.
-- See 20260426213841_domain_rpcs_trust_engine.sql for the canonical implementation.

-- NOTE: Permissions for complete_sale are managed in the canonical migration (20260426213841).
-- Keeping these here for backward compatibility if this migration is re-run:

CREATE OR REPLACE FUNCTION public.generate_daily_reconciliation(
  p_store_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start timestamptz := (p_date::timestamptz);
  v_end timestamptz := ((p_date + 1)::timestamptz);
  v_total_sales numeric(14,2) := 0;
  v_total_cash_inflow numeric(14,2) := 0;
  v_inventory_delta_value numeric(14,2) := 0;
  v_expected_inventory_delta numeric(14,2) := 0;
  v_mismatch jsonb := '[]'::jsonb;
  v_risk_overrides integer := 0;
BEGIN
  SELECT COALESCE(SUM(s.total_amount), 0)
    INTO v_total_sales
  FROM public.sales s
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.debit), 0)
    INTO v_total_cash_inflow
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code IN ('1000_CASH', '1010_BANK');

  SELECT COALESCE(SUM(si.qty * si.cost), 0)
    INTO v_expected_inventory_delta
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.credit), 0)
    INTO v_inventory_delta_value
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code = '1200_INVENTORY';

  SELECT COUNT(*)
    INTO v_risk_overrides
  FROM public.ledger_batches lb
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND lb.risk_flag = true;

  IF ROUND(v_total_sales, 2) <> ROUND(v_total_cash_inflow, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'cash_vs_sales_mismatch',
      'total_sales', v_total_sales,
      'total_cash_inflow', v_total_cash_inflow
    );
  END IF;

  IF ROUND(v_expected_inventory_delta, 2) <> ROUND(v_inventory_delta_value, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'inventory_vs_cogs_mismatch',
      'expected_inventory_delta', v_expected_inventory_delta,
      'ledger_inventory_delta', v_inventory_delta_value
    );
  END IF;

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'date', p_date,
    'total_sales', ROUND(v_total_sales, 2),
    'total_cash_inflow', ROUND(v_total_cash_inflow, 2),
    'inventory_movement_vs_sales_delta', jsonb_build_object(
      'expected_inventory_delta', ROUND(v_expected_inventory_delta, 2),
      'ledger_inventory_delta', ROUND(v_inventory_delta_value, 2)
    ),
    'risk_override_count', v_risk_overrides,
    'mismatches', v_mismatch,
    'is_balanced', (jsonb_array_length(v_mismatch) = 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_sale_ledger_accounts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_sale_ledger_accounts(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_payment_ledger_account(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_payment_ledger_account(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) TO authenticated;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.generate_daily_reconciliation(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_daily_reconciliation(uuid, date) TO authenticated;
