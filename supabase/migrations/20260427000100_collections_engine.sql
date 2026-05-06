-- =============================================================================
-- Phase 1: Database Migration for Collections Engine
-- Builds on Retail Profit Control Foundation (accounts, parties, ledger_entries)
-- =============================================================================

-- 1. customer_reminders
CREATE TABLE customer_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('whatsapp', 'call', 'manual')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_reminders_tenant_store ON customer_reminders(tenant_id, store_id);
CREATE INDEX idx_customer_reminders_party ON customer_reminders(party_id);
CREATE INDEX idx_customer_reminders_sent_at ON customer_reminders(sent_at DESC);

-- 2. followup_notes
CREATE TABLE followup_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    promise_to_pay_date DATE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_followup_notes_tenant_store ON followup_notes(tenant_id, store_id);
CREATE INDEX idx_followup_notes_party ON followup_notes(party_id);
CREATE INDEX idx_followup_notes_promise_date ON followup_notes(promise_to_pay_date);

-- 3. Row Level Security
ALTER TABLE customer_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_select" ON customer_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = customer_reminders.tenant_id));
CREATE POLICY "cr_insert" ON customer_reminders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = customer_reminders.tenant_id AND u.role IN ('admin', 'manager')));

CREATE POLICY "fn_select" ON followup_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = followup_notes.tenant_id));
CREATE POLICY "fn_insert" ON followup_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = followup_notes.tenant_id AND u.role IN ('admin', 'manager')));
CREATE POLICY "fn_update" ON followup_notes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = followup_notes.tenant_id AND u.role IN ('admin', 'manager')));

-- 4. Ensure Accounts Receivable Exists
DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants LOOP
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = v_tenant.id AND name = 'Accounts Receivable' AND type = 'asset') THEN
      INSERT INTO accounts (tenant_id, name, type) VALUES (v_tenant.id, 'Accounts Receivable', 'asset');
    END IF;
  END LOOP;
END;
$$;

-- Helper function to get or create Accounts Receivable for a tenant
CREATE OR REPLACE FUNCTION public.get_or_create_ar_account(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT id INTO v_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Accounts Receivable' AND type = 'asset' LIMIT 1;
    IF v_account_id IS NULL THEN
        INSERT INTO accounts (tenant_id, name, type) VALUES (p_tenant_id, 'Accounts Receivable', 'asset') RETURNING id INTO v_account_id;
    END IF;
    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Phase 2: RPC / Backend Business Logic
-- =============================================================================

-- 1. get_receivables_aging
CREATE OR REPLACE FUNCTION public.get_receivables_aging(
    p_tenant_id UUID,
    p_store_id UUID,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    party_id UUID,
    customer_name TEXT,
    phone TEXT,
    balance_due NUMERIC,
    days_overdue INT,
    last_note TEXT,
    promise_to_pay_date DATE
) AS $$
DECLARE
    v_ar_account_id UUID;
BEGIN
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    RETURN QUERY
    WITH party_balances AS (
        SELECT 
            le.party_id,
            SUM(le.debit_amount - le.credit_amount) AS balance_due,
            MAX(le.effective_date) FILTER (WHERE le.debit_amount > 0) AS last_credit_sale_date
        FROM ledger_entries le
        WHERE le.tenant_id = p_tenant_id 
          AND le.store_id = p_store_id
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
        FROM followup_notes fn
        WHERE fn.tenant_id = p_tenant_id AND fn.store_id = p_store_id
        ORDER BY fn.party_id, fn.created_at DESC
    )
    SELECT 
        pb.party_id,
        p.name AS customer_name,
        p.phone,
        pb.balance_due,
        COALESCE(CURRENT_DATE - pb.last_credit_sale_date, 0) AS days_overdue,
        ln.note_text AS last_note,
        ln.promise_to_pay_date
    FROM party_balances pb
    JOIN parties p ON p.id = pb.party_id
    LEFT JOIN latest_notes ln ON ln.party_id = pb.party_id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY pb.balance_due DESC, pb.last_credit_sale_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.get_receivables_aging(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_receivables_aging(UUID, UUID, TEXT) TO authenticated;

-- 2. record_customer_payment
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
RETURNS JSONB AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_user_id UUID := auth.uid();
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency Check
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    -- 2. Accounts
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    -- 3. Create Journal Batch
    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    -- 4. Ledger Entries (Double Entry)
    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, p_payment_account_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, credit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_ar_account_id, p_party_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- 5. Calculate new balance
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_new_balance
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND account_id = v_ar_account_id AND party_id = p_party_id;

    -- 6. Update Idempotency
    v_response := jsonb_build_object(
        'status', 'success',
        'journal_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );
    UPDATE idempotency_keys 
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.record_customer_payment(TEXT, UUID, UUID, UUID, NUMERIC, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(TEXT, UUID, UUID, UUID, NUMERIC, UUID, TEXT, TEXT) TO authenticated;

-- 3. log_customer_reminder
CREATE OR REPLACE FUNCTION public.log_customer_reminder(
    p_tenant_id UUID,
    p_store_id UUID,
    p_party_id UUID,
    p_type TEXT
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO customer_reminders (tenant_id, store_id, party_id, reminder_type, sent_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_type, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.log_customer_reminder(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_customer_reminder(UUID, UUID, UUID, TEXT) TO authenticated;

-- 4. add_followup_note
CREATE OR REPLACE FUNCTION public.add_followup_note(
    p_tenant_id UUID,
    p_store_id UUID,
    p_party_id UUID,
    p_note_text TEXT,
    p_promise_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO followup_notes (tenant_id, store_id, party_id, note_text, promise_to_pay_date, created_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_note_text, p_promise_date, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.add_followup_note(UUID, UUID, UUID, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_followup_note(UUID, UUID, UUID, TEXT, DATE) TO authenticated;

-- 5. mark_followup_resolved
CREATE OR REPLACE FUNCTION public.mark_followup_resolved(
    p_note_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE followup_notes
    SET status = 'resolved'
    WHERE id = p_note_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.mark_followup_resolved(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_followup_resolved(UUID) TO authenticated;
