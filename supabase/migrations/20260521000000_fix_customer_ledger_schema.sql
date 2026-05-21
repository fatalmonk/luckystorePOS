-- Fix customer/supplier receivable ledger schema
-- Production has posting-engine schema (ledger_batches + ledger_entries); foundation code expected different tables

-- 1. Add missing columns to ledger_entries for foundation-style metadata
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.parties(id),
  ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID;

-- 2. Make batch_id nullable for manual entries (sales batches still required)
ALTER TABLE public.ledger_entries ALTER COLUMN batch_id DROP NOT NULL;

-- 3. Add tenant_id/source metadata to journal_batches for manual transactions
ALTER TABLE public.journal_batches
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS source_ref TEXT;

-- 4. Add current_balance to parties
ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15,4) DEFAULT 0;

-- 5. Sync existing posting-engine rows into new columns
UPDATE public.ledger_entries
SET
  debit_amount = debit,
  credit_amount = credit,
  effective_date = created_at::date
WHERE debit_amount = 0 AND credit_amount = 0 AND (debit > 0 OR credit > 0);

-- 6. Create AR and AP ledger_accounts for stores that lack them
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '1300_ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'ASSET', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '1300_ACCOUNTS_RECEIVABLE'
);

INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '2000_ACCOUNTS_PAYABLE', 'Accounts Payable', 'LIABILITY', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '2000_ACCOUNTS_PAYABLE'
);

-- 7. Create idempotency_keys table if missing (needed by record_customer_payment)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    idempotency_key TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_body JSONB,
    PRIMARY KEY (idempotency_key, tenant_id)
);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 8. Rewrite get_or_create_ar_account to return a ledger_accounts.id
CREATE OR REPLACE FUNCTION public.get_or_create_ar_account(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account_id UUID;
    v_store_id UUID;
BEGIN
    -- Find AR ledger account for any store in this tenant
    SELECT la.id INTO v_account_id
    FROM public.ledger_accounts la
    JOIN public.stores s ON s.id = la.store_id
    WHERE s.tenant_id = p_tenant_id AND la.code = '1300_ACCOUNTS_RECEIVABLE'
    LIMIT 1;

    IF v_account_id IS NULL THEN
        SELECT id INTO v_store_id FROM public.stores WHERE tenant_id = p_tenant_id LIMIT 1;
        IF v_store_id IS NOT NULL THEN
            INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
            VALUES (v_store_id, '1300_ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'ASSET', true)
            RETURNING id INTO v_account_id;
        END IF;
    END IF;

    RETURN v_account_id;
END;
$$;

-- 9. Rewrite record_customer_payment to work with PRODUCTION schema
-- Uses ledger_batches (posting engine) + batch_id, NOT journal_batches + journal_batch_id
CREATE OR REPLACE FUNCTION public.record_customer_payment(
    p_idempotency_key TEXT,
    p_tenant_id UUID,
    p_store_id UUID,
    p_party_id UUID,
    p_amount NUMERIC,
    p_payment_account_id UUID,
    p_client_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_user_id UUID := auth.uid();
    v_new_balance NUMERIC;
BEGIN
    -- Idempotency check
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);
    IF v_ar_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'AR account not found');
    END IF;

    -- Create ledger batch (posting engine schema)
    INSERT INTO public.ledger_batches (store_id, source_type, source_id, source_ref, status, created_by)
    VALUES (p_store_id, 'customer_payment', p_party_id, COALESCE(p_client_transaction_id, p_idempotency_key), 'POSTED', v_user_id)
    RETURNING id INTO v_batch_id;

    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, p_payment_account_id, p_party_id,
        p_amount, 0, p_amount, 0,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_user_id, CURRENT_DATE
    );

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, v_ar_account_id, p_party_id,
        0, p_amount, 0, p_amount,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_user_id, CURRENT_DATE
    );

    -- Calculate new balance from AR ledger
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_new_balance
    FROM public.ledger_entries
    WHERE store_id = p_store_id AND account_id = v_ar_account_id AND party_id = p_party_id;

    -- Update party balance
    UPDATE public.parties
    SET current_balance = v_new_balance
    WHERE id = p_party_id;

    -- Idempotency response
    v_response := jsonb_build_object(
        'status', 'success',
        'ledger_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );
    UPDATE public.idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM public.idempotency_keys
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;

-- 10. Rewrite get_receivables_aging to use production ledger schema
CREATE OR REPLACE FUNCTION public.get_receivables_aging(
    p_tenant_id UUID,
    p_store_id UUID,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
    party_id UUID,
    customer_name TEXT,
    phone TEXT,
    balance_due NUMERIC,
    days_overdue INTEGER,
    last_note TEXT,
    promise_to_pay_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ar_account_id UUID;
BEGIN
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);
    IF v_ar_account_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH party_balances AS (
        SELECT
            le.party_id,
            SUM(le.debit_amount - le.credit_amount) AS balance_due,
            MAX(le.effective_date) FILTER (WHERE le.debit_amount > 0) AS last_credit_sale_date
        FROM public.ledger_entries le
        WHERE le.store_id = p_store_id
          AND le.account_id = v_ar_account_id
          AND le.party_id IS NOT NULL
        GROUP BY le.party_id
        HAVING SUM(le.debit_amount - le.credit_amount) > 0
    ),
    latest_notes AS (
        SELECT DISTINCT ON (fn.party_id)
            fn.party_id,
            fn.note_text,
            fn.promise_to_pay_date
        FROM public.followup_notes fn
        WHERE fn.store_id = p_store_id
        ORDER BY fn.party_id, fn.created_at DESC
    )
    SELECT
        pb.party_id,
        p.name AS customer_name,
        p.phone,
        pb.balance_due,
        COALESCE(CURRENT_DATE - pb.last_credit_sale_date, 0)::INTEGER AS days_overdue,
        ln.note_text AS last_note,
        ln.promise_to_pay_date
    FROM party_balances pb
    JOIN public.parties p ON p.id = pb.party_id
    LEFT JOIN latest_notes ln ON ln.party_id = pb.party_id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY pb.balance_due DESC, pb.last_credit_sale_date ASC;
END;
$$;

-- 11. RLS policies for ledger_entries
DROP POLICY IF EXISTS "le_insert_tenant" ON public.ledger_entries;
CREATE POLICY "le_insert_tenant" ON public.ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid())
    OR store_id = (SELECT store_id FROM public.users WHERE auth_id = auth.uid())
  );

-- 12. Grants
GRANT INSERT ON public.ledger_entries TO authenticated;
GRANT INSERT ON public.ledger_batches TO authenticated;

-- 13. Set search paths
ALTER FUNCTION public.get_or_create_ar_account(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_customer_payment(TEXT, UUID, UUID, UUID, NUMERIC, UUID, TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_receivables_aging(UUID, UUID, TEXT) SET search_path = public, pg_temp;
