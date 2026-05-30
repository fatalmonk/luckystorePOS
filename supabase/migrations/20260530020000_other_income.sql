-- Create other income category enum
CREATE TYPE public.other_income_category AS ENUM ('Display Fee', 'Delivery', 'Miscellaneous');

-- Create other income payment method enum
CREATE TYPE public.other_income_payment_method AS ENUM ('Cash', 'bKash', 'Bank');

-- Create other_income table
CREATE TABLE public.other_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category public.other_income_category NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_method public.other_income_payment_method NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on other_income table
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- Create isolation policies for other_income
CREATE POLICY "Users can view other income of their tenant"
    ON public.other_income
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert other income of their tenant"
    ON public.other_income
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update other income of their tenant"
    ON public.other_income
    FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete other income of their tenant"
    ON public.other_income
    FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

-- Re-create get_dashboard_missing_metrics with other_income support
CREATE OR REPLACE FUNCTION public.get_dashboard_missing_metrics(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result json;
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  SELECT json_build_object(
    'toReceive', COALESCE((
       SELECT SUM(current_balance) FROM public.parties 
       WHERE tenant_id = v_tenant_id AND type = 'customer' AND current_balance > 0
    ), 0),
    'toGive', COALESCE((
       SELECT SUM(current_balance) FROM public.parties 
       WHERE tenant_id = v_tenant_id AND type = 'supplier' AND current_balance > 0
    ), 0),
    'totalBalance', COALESCE((
       SELECT SUM(debit_amount - credit_amount) FROM public.ledger_entries le
       JOIN public.ledger_accounts la ON la.id = le.account_id
       WHERE le.store_id = p_store_id AND (la.name ILIKE '%cash%' OR la.name ILIKE '%bank%' OR la.name ILIKE '%bkash%')
    ), 0) + COALESCE((
       SELECT SUM(amount) FROM public.other_income
       WHERE store_id = p_store_id OR (store_id IS NULL AND tenant_id = v_tenant_id)
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant permissions for authenticated users on other_income
GRANT ALL ON public.other_income TO authenticated;
