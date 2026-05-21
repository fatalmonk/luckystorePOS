-- Add RPC to delete ledger transactions (bypassing RLS for authorized users)
-- This fixes the delete permission issue

CREATE OR REPLACE FUNCTION public.delete_ledger_transaction(
    p_batch_id UUID,
    p_party_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_store_id UUID;
    v_batch_store_id UUID;
    v_deleted_count INTEGER := 0;
BEGIN
    -- Get the current user's store
    SELECT store_id INTO v_user_store_id
    FROM public.users
    WHERE auth_id = auth.uid();
    
    IF v_user_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User not found');
    END IF;
    
    -- Verify the batch belongs to the user's store
    SELECT store_id INTO v_batch_store_id
    FROM public.ledger_batches
    WHERE id = p_batch_id;
    
    IF v_batch_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Transaction not found');
    END IF;
    
    IF v_batch_store_id != v_user_store_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied');
    END IF;
    
    -- Delete the batch (cascades to entries)
    DELETE FROM public.ledger_batches
    WHERE id = p_batch_id AND store_id = v_user_store_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Recalculate party balance
    UPDATE public.parties
    SET current_balance = COALESCE((
        SELECT SUM(le.debit_amount - le.credit_amount)
        FROM public.ledger_entries le
        JOIN public.ledger_accounts la ON la.id = le.account_id
        WHERE le.party_id = p_party_id
        AND la.code = '1300_ACCOUNTS_RECEIVABLE'
    ), 0)
    WHERE id = p_party_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'deleted_count', v_deleted_count
    );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.delete_ledger_transaction(UUID, UUID) TO authenticated;
