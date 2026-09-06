-- Migration: 20260906191500_pr0b_rpc_revocations_and_guards.sql
-- Description: PR 0B - Revoke direct mutations on ledger tables, revoke broken payment RPCs,
--              guard 8-argument record_customer_payment and close_session_with_reconciliation.

-- ============================================================================
-- 1. REVOKE DIRECT MUTATIONS ON CORE LEDGER TABLES (Anon & Authenticated)
-- ============================================================================
-- Authenticated & anon roles must never directly INSERT, UPDATE, or DELETE
-- ledger records. All financial mutations must proceed through reviewed RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.ledger_accounts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ledger_batches FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ledger_entries FROM anon, authenticated;

-- ============================================================================
-- 2. REVOKE BROKEN MOBILE PAYMENT RPC SIGNATURES
-- ============================================================================
-- Exactly revokes the broken 5-arg customer payment and 6-arg supplier payment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'record_customer_payment'
      AND oidvectortypes(p.proargtypes) = 'uuid, numeric, text, text, uuid'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.record_customer_payment(uuid, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'record_supplier_payment'
      AND oidvectortypes(p.proargtypes) = 'uuid, numeric, text, text, uuid, uuid'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid, numeric, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;';
  END IF;
END $$;

-- ============================================================================
-- 3. HARDEN 8-ARGUMENT record_customer_payment
-- ============================================================================
-- Inject strict validation:
-- 1. Caller belongs to p_tenant_id and p_store_id.
-- 2. Party belongs to p_tenant_id.
-- 3. Payment account belongs to p_store_id.
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
    v_auth_uid UUID := auth.uid();
    v_calling_user public.users%ROWTYPE;
    v_party_tenant_id UUID;
    v_account_store_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Authorization: verify calling user membership
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_calling_user
    FROM public.users
    WHERE auth_id = v_auth_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
    END IF;

    IF v_calling_user.tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'Access denied: user does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;

    IF v_calling_user.role NOT IN ('admin', 'manager') AND v_calling_user.store_id IS DISTINCT FROM p_store_id THEN
        RAISE EXCEPTION 'Access denied: cashier not authorized for specified store' USING ERRCODE = '42501';
    END IF;

    -- 2. Relational consistency: party must belong to caller tenant
    SELECT tenant_id INTO v_party_tenant_id
    FROM public.parties
    WHERE id = p_party_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party not found';
    END IF;

    IF v_party_tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'Access denied: party does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;

    -- 3. Relational consistency: payment account must belong to store
    SELECT store_id INTO v_account_store_id
    FROM public.ledger_accounts
    WHERE id = p_payment_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment account not found';
    END IF;

    IF v_account_store_id IS DISTINCT FROM p_store_id THEN
        RAISE EXCEPTION 'Access denied: payment account does not belong to specified store' USING ERRCODE = '42501';
    END IF;

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
    VALUES (p_store_id, 'customer_payment', p_party_id, COALESCE(p_client_transaction_id, p_idempotency_key), 'POSTED', v_calling_user.id)
    RETURNING id INTO v_batch_id;

    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, p_payment_account_id, p_party_id,
        p_amount, 0, p_amount, 0,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_calling_user.id, CURRENT_DATE
    );

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, v_ar_account_id, p_party_id,
        0, p_amount, 0, p_amount,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_calling_user.id, CURRENT_DATE
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

REVOKE ALL ON FUNCTION public.record_customer_payment(TEXT, UUID, UUID, UUID, NUMERIC, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(TEXT, UUID, UUID, UUID, NUMERIC, UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 4. HARDEN close_session_with_reconciliation
-- ============================================================================
-- 1. Lock search_path to public, pg_temp.
-- 2. Enforce cashier identity or store-manager role within the session's tenant.
CREATE OR REPLACE FUNCTION public.close_session_with_reconciliation(
    p_session_id uuid,
    p_actual_cash numeric,
    p_variance numeric,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session public.pos_sessions;
    v_summary jsonb;
    v_expected_drawer numeric;
    v_cash_sales numeric;
    v_opening_cash numeric;
    v_variance numeric;
    v_variance_status text;
    v_variance_threshold_exceeded boolean;
    v_auth_uid uuid := auth.uid();
    v_calling_user public.users%ROWTYPE;
    v_store_tenant_id uuid;
BEGIN
    -- 1. Resolve application user
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_calling_user
    FROM public.users
    WHERE auth_id = v_auth_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
    END IF;

    -- 2. Get session details
    SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status = 'closed' THEN
        RAISE EXCEPTION 'Session is already closed';
    END IF;

    -- 3. Verify tenant boundary
    SELECT tenant_id INTO v_store_tenant_id
    FROM public.stores
    WHERE id = v_session.store_id;

    IF v_store_tenant_id IS DISTINCT FROM v_calling_user.tenant_id THEN
        RAISE EXCEPTION 'Access denied: session belongs to another tenant' USING ERRCODE = '42501';
    END IF;

    -- 4. Verify cashier identity or store manager
    IF v_session.cashier_id IS DISTINCT FROM v_calling_user.id THEN
        IF v_calling_user.role NOT IN ('admin', 'manager') OR v_calling_user.store_id IS DISTINCT FROM v_session.store_id THEN
            RAISE EXCEPTION 'Access denied: session can only be closed by cashier or assigned store manager' USING ERRCODE = '42501';
        END IF;
    END IF;

    v_opening_cash := COALESCE(v_session.opening_cash, 0);

    -- Get session summary to calculate expected drawer
    SELECT get_session_summary(p_session_id) INTO v_summary;
    v_expected_drawer := (v_summary->>'expected_drawer')::numeric;
    v_cash_sales := (v_summary->>'total_cash_sales')::numeric;

    -- Calculate variance (actual - expected)
    v_variance := p_actual_cash - v_expected_drawer;

    -- Determine variance status
    IF v_variance > 0 THEN
        v_variance_status := 'over';
    ELSIF v_variance < 0 THEN
        v_variance_status := 'short';
    ELSE
        v_variance_status := 'balanced';
    END IF;

    -- Check if variance exceeds threshold (50 Taka)
    v_variance_threshold_exceeded := ABS(v_variance) > 50;

    -- Update session
    UPDATE public.pos_sessions
    SET 
        status = 'closed',
        closed_at = NOW(),
        closing_cash = p_actual_cash,
        total_sales = v_cash_sales
    WHERE id = p_session_id;

    -- Return result with variance details
    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'opening_cash', v_opening_cash,
        'cash_sales', v_cash_sales,
        'expected_drawer', v_expected_drawer,
        'actual_cash', p_actual_cash,
        'variance', v_variance,
        'variance_status', v_variance_status,
        'variance_threshold_exceeded', v_variance_threshold_exceeded,
        'threshold_value', 50
    );
END;
$$;

REVOKE ALL ON FUNCTION public.close_session_with_reconciliation(uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_session_with_reconciliation(uuid, numeric, numeric, text) TO authenticated;
