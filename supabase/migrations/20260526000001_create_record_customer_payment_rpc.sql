-- Migration: Create or replace record_customer_payment RPC function
-- This function records a customer payment and updates their balance
-- Compatible signature with existing usage

DROP FUNCTION IF EXISTS public.record_customer_payment(UUID, DECIMAL, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.record_customer_payment(
    p_party_id UUID,
    p_amount DECIMAL,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_collected_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_store_id UUID;
    v_party_store_id UUID;
    v_user_id UUID;
    v_ar_account_id UUID;
    v_payment_account_id UUID;
    v_batch_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Validate user session
    SELECT store_id, id INTO v_user_store_id, v_user_id
    FROM public.users
    WHERE auth_id = auth.uid();
    
    IF v_user_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User not authenticated');
    END IF;
    
    -- Verify party belongs to user's store
    SELECT store_id INTO v_party_store_id
    FROM public.parties
    WHERE id = p_party_id;
    
    IF v_party_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Party not found');
    END IF;
    
    IF v_party_store_id != v_user_store_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied: party does not belong to your store');
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Payment amount must be greater than zero');
    END IF;
    
    -- Get the Accounts Receivable ledger account (1300_ACCOUNTS_RECEIVABLE)
    SELECT id INTO v_ar_account_id
    FROM public.ledger_accounts
    WHERE code = '1300_ACCOUNTS_RECEIVABLE' 
    AND store_id = v_user_store_id;
    
    IF v_ar_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Accounts Receivable account not configured');
    END IF;
    
    -- Get the payment method ledger account (1000_CASH, 1110_BANK_MOBILE, etc.)
    SELECT la.id INTO v_payment_account_id
    FROM public.ledger_accounts la
    JOIN public.ledger_account_mappings lam ON lam.account_id = la.id
    JOIN public.payment_methods pm ON pm.id = lam.payment_method_id
    WHERE pm.store_id = v_user_store_id
    AND pm.type = p_payment_method
    LIMIT 1;
    
    -- Default to Cash (1000) if not found for the specific method
    IF v_payment_account_id IS NULL THEN
        SELECT id INTO v_payment_account_id
        FROM public.ledger_accounts
        WHERE code = '1000_CASH'
        AND store_id = v_user_store_id;
    END IF;
    
    IF v_payment_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Payment account not configured');
    END IF;
    
    -- Create a ledger batch for this collection
    INSERT INTO public.ledger_batches (
        store_id,
        transaction_date,
        description,
        status,
        created_by
    ) VALUES (
        v_user_store_id,
        CURRENT_DATE,
        'Payment collection - ' || COALESCE(p_reference, 'Cash payment'),
        'POSTED',
        COALESCE(p_collected_by, v_user_id)
    ) RETURNING id INTO v_batch_id;
    
    -- Create ledger entries
    -- Entry 1: Debit A/R (reducing receivable)
    INSERT INTO public.ledger_entries (
        batch_id,
        account_id,
        party_id,
        debit_amount,
        credit_amount,
        description,
        created_by
    ) VALUES (
        v_batch_id,
        v_ar_account_id,
        p_party_id,
        p_amount,
        0,
        'Payment received - ' || p_payment_method || COALESCE(' - Ref: ' || p_reference, ''),
        COALESCE(p_collected_by, v_user_id)
    );
    
    -- Entry 2: Credit Payment Account (increasing cash/bank)
    INSERT INTO public.ledger_entries (
        batch_id,
        account_id,
        party_id,
        debit_amount,
        credit_amount,
        description,
        created_by
    ) VALUES (
        v_batch_id,
        v_payment_account_id,
        NULL,
        0,
        p_amount,
        'Payment received - ' || p_payment_method || COALESCE(' - Ref: ' || p_reference, ''),
        COALESCE(p_collected_by, v_user_id)
    );
    
    -- Update party balance
    UPDATE public.parties
    SET current_balance = COALESCE((
        SELECT SUM(le.debit_amount - le.credit_amount)
        FROM public.ledger_entries le
        JOIN public.ledger_accounts la ON la.id = le.account_id
        JOIN public.ledger_batches lb ON lb.id = le.batch_id
        WHERE le.party_id = p_party_id
        AND la.code = '1300_ACCOUNTS_RECEIVABLE'
        AND lb.status != 'DELETED'
    ), 0)
    WHERE id = p_party_id
    RETURNING current_balance INTO v_new_balance;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'batch_id', v_batch_id,
        'payment_amount', p_amount,
        'new_balance', v_new_balance,
        'party_id', p_party_id,
        'payment_method', p_payment_method,
        'reference', p_reference
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_customer_payment(UUID, DECIMAL, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.record_customer_payment(UUID, DECIMAL, TEXT, TEXT, UUID) IS 
'Records a customer payment and updates their account balance.
Parameters:
- p_party_id: UUID of the customer party
- p_amount: Payment amount (must be > 0)
- p_payment_method: Type of payment (cash, mobile_banking, card)
- p_reference: Optional reference number for non-cash payments
- p_collected_by: Optional UUID of the user collecting the payment';
