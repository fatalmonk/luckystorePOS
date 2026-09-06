-- Migration: 20260907010000_pr3_unified_payment_rpcs.sql
-- Description: PR 3 - Unified Customer & Supplier Payment RPCs (v2)
--              1. record_customer_payment_v2:
--                 - Authenticates caller and verifies tenant and store boundaries.
--                 - Validates customer party and active payment account in store.
--                 - Supports explicit ledger account or payment method mapping.
--                 - Idempotency-guarded atomic posting (Dr Cash/Bank, Cr AR).
--                 - Recalculates party balance against posted AR ledger entries.
--              2. record_supplier_payment_v2:
--                 - Authenticates caller and verifies tenant and store boundaries.
--                 - Validates supplier party and active payment account in store.
--                 - Idempotency-guarded atomic posting (Dr AP, Cr Cash/Bank).
--                 - Recalculates party balance against posted AP ledger entries.
--              3. Restricts execution strictly to authenticated and service_role.

-- ============================================================================
-- 1. RECORD_CUSTOMER_PAYMENT_V2
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_customer_payment_v2(
    p_idempotency_key TEXT,
    p_party_id UUID,
    p_amount NUMERIC,
    p_tenant_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_payment_account_id UUID DEFAULT NULL,
    p_payment_method_id UUID DEFAULT NULL,
    p_client_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_payment_account_id UUID;
    v_auth_uid UUID := auth.uid();
    v_calling_user public.users%ROWTYPE;
    v_tenant_id UUID;
    v_store_id UUID;
    v_party public.parties%ROWTYPE;
    v_account public.ledger_accounts%ROWTYPE;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Authentication Check
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_calling_user
    FROM public.users
    WHERE auth_id = v_auth_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
    END IF;

    -- 2. Tenant Boundary Enforcement
    IF p_tenant_id IS NOT NULL AND v_calling_user.tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'Access denied: user does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;
    v_tenant_id := v_calling_user.tenant_id;

    -- 3. Store Boundary Enforcement
    IF p_store_id IS NOT NULL THEN
        IF v_calling_user.role NOT IN ('admin', 'manager') AND v_calling_user.store_id IS DISTINCT FROM p_store_id THEN
            RAISE EXCEPTION 'Access denied: cashier not authorized for specified store' USING ERRCODE = '42501';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.stores
            WHERE id = p_store_id AND tenant_id = v_tenant_id
        ) THEN
            RAISE EXCEPTION 'Access denied: store does not belong to tenant' USING ERRCODE = '42501';
        END IF;
        v_store_id := p_store_id;
    ELSE
        v_store_id := v_calling_user.store_id;
        IF v_store_id IS NULL THEN
            RAISE EXCEPTION 'Store context required';
        END IF;
    END IF;

    -- 4. Amount Validation
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    -- 5. Customer Party Verification
    SELECT * INTO v_party
    FROM public.parties
    WHERE id = p_party_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party not found';
    END IF;

    IF v_party.tenant_id IS DISTINCT FROM v_tenant_id THEN
        RAISE EXCEPTION 'Access denied: party does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;

    IF v_party.type != 'customer' THEN
        RAISE EXCEPTION 'Party is not a customer';
    END IF;

    -- 6. Payment Account Resolution & Verification
    IF p_payment_account_id IS NOT NULL THEN
        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE id = p_payment_account_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Payment account not found';
        END IF;

        IF v_account.store_id IS DISTINCT FROM v_store_id THEN
            RAISE EXCEPTION 'Access denied: payment account does not belong to specified store' USING ERRCODE = '42501';
        END IF;

        IF NOT v_account.is_active THEN
            RAISE EXCEPTION 'Payment account is inactive';
        END IF;

        v_payment_account_id := v_account.id;
    ELSIF p_payment_method_id IS NOT NULL THEN
        v_payment_account_id := public.resolve_payment_ledger_account(v_store_id, p_payment_method_id);
        IF v_payment_account_id IS NULL THEN
            RAISE EXCEPTION 'Could not resolve ledger account for specified payment method';
        END IF;

        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE id = v_payment_account_id AND store_id = v_store_id;

        IF NOT FOUND OR NOT v_account.is_active THEN
            RAISE EXCEPTION 'Resolved payment account is inactive or missing';
        END IF;
    ELSE
        -- Default to store cash account
        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE store_id = v_store_id AND code = '1000_CASH';

        IF NOT FOUND OR NOT v_account.is_active THEN
            RAISE EXCEPTION 'Default cash account not configured or inactive for store';
        END IF;

        v_payment_account_id := v_account.id;
    END IF;

    -- 7. Accounts Receivable (AR) Account Resolution
    SELECT id INTO v_ar_account_id
    FROM public.ledger_accounts
    WHERE store_id = v_store_id AND code = '1300_ACCOUNTS_RECEIVABLE' AND is_active = true
    LIMIT 1;

    IF v_ar_account_id IS NULL THEN
        v_ar_account_id := public.get_or_create_ar_account(v_tenant_id);
    END IF;

    IF v_ar_account_id IS NULL THEN
        RAISE EXCEPTION 'Accounts Receivable (AR) account not configured for store';
    END IF;

    -- 8. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        v_response := public.check_idempotency(p_idempotency_key, v_tenant_id);
        IF v_response IS NOT NULL THEN
            RETURN v_response;
        END IF;
    END IF;

    -- 9. Create Balanced Ledger Batch
    INSERT INTO public.ledger_batches (
        store_id, source_type, source_id, source_ref, status, created_by
    ) VALUES (
        v_store_id,
        'customer_payment',
        p_party_id,
        COALESCE(p_client_transaction_id, p_idempotency_key, gen_random_uuid()::text),
        'POSTED',
        v_calling_user.id
    ) RETURNING id INTO v_batch_id;

    -- 10. Ledger Entries (Double-Entry Balanced)
    -- Debit: Cash/Bank Account (Asset increased)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        v_store_id, v_batch_id, v_payment_account_id, p_party_id,
        p_amount, 0, p_amount, 0,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_calling_user.id, CURRENT_DATE
    );

    -- Credit: Accounts Receivable (Asset decreased)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        v_store_id, v_batch_id, v_ar_account_id, p_party_id,
        0, p_amount, 0, p_amount,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_calling_user.id, CURRENT_DATE
    );

    -- 11. Recalculate and Align Party AR Balance
    SELECT COALESCE(SUM(COALESCE(le.debit, le.debit_amount, 0) - COALESCE(le.credit, le.credit_amount, 0)), 0)
    INTO v_new_balance
    FROM public.ledger_entries le
    JOIN public.ledger_accounts la ON la.id = le.account_id
    JOIN public.ledger_batches lb ON lb.id = le.batch_id
    WHERE le.party_id = p_party_id
      AND la.code = '1300_ACCOUNTS_RECEIVABLE'
      AND lb.status NOT IN ('VOIDED', 'DELETED');

    UPDATE public.parties
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_party_id;

    -- 12. Idempotency Completion & Result Formulation
    v_response := jsonb_build_object(
        'status', 'success',
        'ledger_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );

    IF p_idempotency_key IS NOT NULL THEN
        UPDATE public.idempotency_keys
        SET completed_at = NOW(), response_body = v_response
        WHERE idempotency_key = p_idempotency_key AND tenant_id = v_tenant_id;
    END IF;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    IF p_idempotency_key IS NOT NULL AND v_tenant_id IS NOT NULL THEN
        DELETE FROM public.idempotency_keys
        WHERE idempotency_key = p_idempotency_key AND tenant_id = v_tenant_id AND completed_at IS NULL;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_customer_payment_v2(TEXT, UUID, NUMERIC, UUID, UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment_v2(TEXT, UUID, NUMERIC, UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 2. RECORD_SUPPLIER_PAYMENT_V2
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_supplier_payment_v2(
    p_idempotency_key TEXT,
    p_supplier_id UUID,
    p_amount NUMERIC,
    p_tenant_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_payment_account_id UUID DEFAULT NULL,
    p_payment_method_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ap_account_id UUID;
    v_payment_account_id UUID;
    v_auth_uid UUID := auth.uid();
    v_calling_user public.users%ROWTYPE;
    v_tenant_id UUID;
    v_store_id UUID;
    v_supplier public.parties%ROWTYPE;
    v_account public.ledger_accounts%ROWTYPE;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Authentication Check
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_calling_user
    FROM public.users
    WHERE auth_id = v_auth_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
    END IF;

    -- 2. Tenant Boundary Enforcement
    IF p_tenant_id IS NOT NULL AND v_calling_user.tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'Access denied: user does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;
    v_tenant_id := v_calling_user.tenant_id;

    -- 3. Store Boundary Enforcement
    IF p_store_id IS NOT NULL THEN
        IF v_calling_user.role NOT IN ('admin', 'manager') AND v_calling_user.store_id IS DISTINCT FROM p_store_id THEN
            RAISE EXCEPTION 'Access denied: cashier not authorized for specified store' USING ERRCODE = '42501';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.stores
            WHERE id = p_store_id AND tenant_id = v_tenant_id
        ) THEN
            RAISE EXCEPTION 'Access denied: store does not belong to tenant' USING ERRCODE = '42501';
        END IF;
        v_store_id := p_store_id;
    ELSE
        v_store_id := v_calling_user.store_id;
        IF v_store_id IS NULL THEN
            RAISE EXCEPTION 'Store context required';
        END IF;
    END IF;

    -- 4. Amount Validation
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    -- 5. Supplier Party Verification
    SELECT * INTO v_supplier
    FROM public.parties
    WHERE id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Supplier not found';
    END IF;

    IF v_supplier.tenant_id IS DISTINCT FROM v_tenant_id THEN
        RAISE EXCEPTION 'Access denied: supplier does not belong to specified tenant' USING ERRCODE = '42501';
    END IF;

    IF v_supplier.type != 'supplier' THEN
        RAISE EXCEPTION 'Party is not a supplier';
    END IF;

    -- 6. Payment Account Resolution & Verification
    IF p_payment_account_id IS NOT NULL THEN
        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE id = p_payment_account_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Payment account not found';
        END IF;

        IF v_account.store_id IS DISTINCT FROM v_store_id THEN
            RAISE EXCEPTION 'Access denied: payment account does not belong to specified store' USING ERRCODE = '42501';
        END IF;

        IF NOT v_account.is_active THEN
            RAISE EXCEPTION 'Payment account is inactive';
        END IF;

        v_payment_account_id := v_account.id;
    ELSIF p_payment_method_id IS NOT NULL THEN
        v_payment_account_id := public.resolve_payment_ledger_account(v_store_id, p_payment_method_id);
        IF v_payment_account_id IS NULL THEN
            RAISE EXCEPTION 'Could not resolve ledger account for specified payment method';
        END IF;

        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE id = v_payment_account_id AND store_id = v_store_id;

        IF NOT FOUND OR NOT v_account.is_active THEN
            RAISE EXCEPTION 'Resolved payment account is inactive or missing';
        END IF;
    ELSIF p_payment_method IS NOT NULL THEN
        IF LOWER(TRIM(p_payment_method)) = 'cash' THEN
            SELECT * INTO v_account
            FROM public.ledger_accounts
            WHERE store_id = v_store_id AND code = '1000_CASH';
        ELSE
            SELECT * INTO v_account
            FROM public.ledger_accounts
            WHERE store_id = v_store_id AND code = '1010_BANK';
        END IF;

        IF NOT FOUND OR NOT v_account.is_active THEN
            -- Fallback to cash
            SELECT * INTO v_account
            FROM public.ledger_accounts
            WHERE store_id = v_store_id AND code = '1000_CASH';
        END IF;

        IF NOT FOUND OR NOT v_account.is_active THEN
            RAISE EXCEPTION 'Payment account not configured or inactive for store';
        END IF;

        v_payment_account_id := v_account.id;
    ELSE
        -- Default to cash
        SELECT * INTO v_account
        FROM public.ledger_accounts
        WHERE store_id = v_store_id AND code = '1000_CASH';

        IF NOT FOUND OR NOT v_account.is_active THEN
            RAISE EXCEPTION 'Default cash account not configured or inactive for store';
        END IF;

        v_payment_account_id := v_account.id;
    END IF;

    -- 7. Accounts Payable (AP) Account Resolution
    SELECT id INTO v_ap_account_id
    FROM public.ledger_accounts
    WHERE store_id = v_store_id AND code = '2000_ACCOUNTS_PAYABLE' AND is_active = true
    LIMIT 1;

    IF v_ap_account_id IS NULL THEN
        -- Create or ensure AP account exists
        INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system, is_active)
        VALUES (v_store_id, '2000_ACCOUNTS_PAYABLE', 'Accounts Payable', 'LIABILITY', true, true)
        ON CONFLICT (store_id, code) DO UPDATE SET is_active = true
        RETURNING id INTO v_ap_account_id;
    END IF;

    IF v_ap_account_id IS NULL THEN
        RAISE EXCEPTION 'Accounts Payable (AP) account not configured for store';
    END IF;

    -- 8. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        v_response := public.check_idempotency(p_idempotency_key, v_tenant_id);
        IF v_response IS NOT NULL THEN
            RETURN v_response;
        END IF;
    END IF;

    -- 9. Create Balanced Ledger Batch
    INSERT INTO public.ledger_batches (
        store_id, source_type, source_id, source_ref, status, created_by
    ) VALUES (
        v_store_id,
        'supplier_payment',
        p_supplier_id,
        COALESCE(p_reference, p_idempotency_key, gen_random_uuid()::text),
        'POSTED',
        v_calling_user.id
    ) RETURNING id INTO v_batch_id;

    -- 10. Ledger Entries (Double-Entry Balanced)
    -- Debit: Accounts Payable (Liability reduced)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        v_store_id, v_batch_id, v_ap_account_id, p_supplier_id,
        p_amount, 0, p_amount, 0,
        'SUPPLIER_PAYMENT', v_batch_id, COALESCE(p_notes, p_reference), v_calling_user.id, CURRENT_DATE
    );

    -- Credit: Cash/Bank Account (Asset reduced)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        v_store_id, v_batch_id, v_payment_account_id, p_supplier_id,
        0, p_amount, 0, p_amount,
        'SUPPLIER_PAYMENT', v_batch_id, COALESCE(p_notes, p_reference), v_calling_user.id, CURRENT_DATE
    );

    -- 11. Recalculate and Align Party AP Balance (Credit - Debit)
    SELECT COALESCE(SUM(COALESCE(le.credit, le.credit_amount, 0) - COALESCE(le.debit, le.debit_amount, 0)), 0)
    INTO v_new_balance
    FROM public.ledger_entries le
    JOIN public.ledger_accounts la ON la.id = le.account_id
    JOIN public.ledger_batches lb ON lb.id = le.batch_id
    WHERE le.party_id = p_supplier_id
      AND la.code = '2000_ACCOUNTS_PAYABLE'
      AND lb.status NOT IN ('VOIDED', 'DELETED');

    UPDATE public.parties
    SET current_balance = v_new_balance,
        outstanding_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_supplier_id;

    -- 12. Idempotency Completion & Result Formulation
    v_response := jsonb_build_object(
        'status', 'success',
        'ledger_batch_id', v_batch_id,
        'new_supplier_balance', v_new_balance
    );

    IF p_idempotency_key IS NOT NULL THEN
        UPDATE public.idempotency_keys
        SET completed_at = NOW(), response_body = v_response
        WHERE idempotency_key = p_idempotency_key AND tenant_id = v_tenant_id;
    END IF;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    IF p_idempotency_key IS NOT NULL AND v_tenant_id IS NOT NULL THEN
        DELETE FROM public.idempotency_keys
        WHERE idempotency_key = p_idempotency_key AND tenant_id = v_tenant_id AND completed_at IS NULL;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_payment_v2(TEXT, UUID, NUMERIC, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment_v2(TEXT, UUID, NUMERIC, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
