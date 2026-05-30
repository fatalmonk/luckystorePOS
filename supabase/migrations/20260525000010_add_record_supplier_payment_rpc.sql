-- RPC function to record supplier payments (AP payments)
-- Updates party table balance and creates ledger transaction

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_supplier_id uuid,
  p_amount numeric(12,2),
  p_payment_method text,
  p_reference text DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction_id uuid;
  v_supplier record;
  v_current_outstanding numeric(12,2);
  v_store_id uuid;
  v_user_id uuid;
BEGIN
  -- Auth check
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Get supplier details and lock the row
  SELECT id, name, outstanding_balance, store_id
  INTO v_supplier
  FROM public.parties
  WHERE id = p_supplier_id AND type = 'supplier'
  FOR UPDATE;

  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  -- Validate store context
  IF p_store_id IS NOT NULL AND v_supplier.store_id != p_store_id THEN
    RAISE EXCEPTION 'Supplier does not belong to the current store';
  END IF;

  v_store_id := v_supplier.store_id;

  -- Validate amount
  v_current_outstanding := COALESCE(v_supplier.outstanding_balance, 0);
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  IF p_amount > v_current_outstanding THEN
    RAISE EXCEPTION 'Payment amount (৳%) exceeds outstanding balance (৳%)', 
      p_amount::text, v_current_outstanding::text;
  END IF;

  -- Validate reference for non-cash payments
  IF p_payment_method NOT IN ('cash') AND (p_reference IS NULL OR TRIM(p_reference) = '') THEN
    RAISE EXCEPTION 'Reference/transaction ID is required for % payments', p_payment_method;
  END IF;

  -- Create ledger transaction for the payment
  INSERT INTO public.ledger_accounts (
    store_id,
    transaction_type,
    transaction_date,
    description,
    debit_amount,
    credit_amount,
    party_id,
    party_type,
    payment_method,
    reference_number,
    created_by,
    created_at
  ) VALUES (
    v_store_id,
    'supplier_payment',
    CURRENT_DATE,
    'Payment to ' || v_supplier.name || ' - ' || COALESCE(p_payment_method, 'cash'),
    p_amount,  -- Debit: Payable is being reduced (liability decreased)
    0,         -- Credit: 0
    p_supplier_id,
    'supplier',
    COALESCE(p_payment_method, 'cash'),
    p_reference,
    v_user_id,
    NOW()
  ) RETURNING id INTO v_transaction_id;

  -- Update supplier outstanding balance (decreasing the payable)
  UPDATE public.parties
  SET 
    outstanding_balance = outstanding_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_supplier_id;

  RETURN v_transaction_id;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid, numeric, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid, numeric, text, text, uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_supplier_payment(uuid, numeric, text, text, uuid, uuid) IS 
'Records a payment to a supplier. Validates amount against outstanding balance, 
creates a ledger transaction, and updates supplier payable balance.';
