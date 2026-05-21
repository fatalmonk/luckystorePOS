-- Update delete RPC to handle immutable posted batches
-- Instead of deleting, we mark as DELETED and filter in queries

ALTER TABLE public.ledger_batches 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

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
    
    -- Mark batch as deleted instead of actual delete (immutable ledger)
    UPDATE public.ledger_batches
    SET status = 'DELETED',
        deleted_at = NOW(),
        deleted_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    WHERE id = p_batch_id
    AND store_id = v_user_store_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Recalculate party balance (excluding deleted batches)
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
    WHERE id = p_party_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'deleted_count', v_deleted_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ledger_transaction(UUID, UUID) TO authenticated;
