-- Keep purchase receiving aligned with the production stock and ledger contracts.
-- OCR and drafts may prefill candidates, but posting is always staff-reviewed.

CREATE OR REPLACE FUNCTION public.record_purchase_v2(
  p_idempotency_key TEXT,
  p_tenant_id UUID,
  p_store_id UUID,
  p_supplier_id UUID,
  p_invoice_number TEXT DEFAULT NULL,
  p_invoice_total NUMERIC(15, 4) DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_amount_paid NUMERIC(15, 4) DEFAULT 0,
  p_payment_account_id UUID DEFAULT NULL,
  p_payable_account_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'posted',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_response JSONB;
  v_receipt_id UUID;
  v_batch_id UUID;
  v_item RECORD;
  v_total_cost NUMERIC(15, 4) := 0;
  v_current_qty NUMERIC(15, 4);
  v_current_avg_cost NUMERIC(15, 4);
  v_new_avg_cost NUMERIC(15, 4);
  v_inventory_account_id UUID;
  v_auth_uid UUID := auth.uid();
  v_calling_user public.users%ROWTYPE;
  v_supplier_type TEXT;
  v_payable_amount NUMERIC(15, 4);
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_calling_user
  FROM public.users
  WHERE auth_id = v_auth_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS DISTINCT FROM v_calling_user.tenant_id THEN
    RAISE EXCEPTION 'Access denied: user does not belong to specified tenant' USING ERRCODE = '42501';
  END IF;

  IF p_store_id IS NULL THEN
    p_store_id := v_calling_user.store_id;
    IF p_store_id IS NULL THEN
      RAISE EXCEPTION 'Store context required';
    END IF;
  ELSIF v_calling_user.role NOT IN ('admin', 'manager')
        AND v_calling_user.store_id IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'Access denied: user is not authorized for specified store' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: store does not belong to tenant' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(v_calling_user.role, '') NOT IN ('admin', 'manager', 'stock') THEN
    RAISE EXCEPTION 'Access denied: role cannot record purchase receipts' USING ERRCODE = '42501';
  END IF;

  v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
  IF v_response IS NOT NULL THEN RETURN v_response; END IF;

  IF p_status NOT IN ('draft', 'posted') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft or posted.', p_status;
  END IF;

  SELECT type INTO v_supplier_type FROM public.parties
  WHERE id = p_supplier_id AND tenant_id = p_tenant_id;
  IF v_supplier_type IS NULL THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  IF v_supplier_type <> 'supplier' THEN
    RAISE EXCEPTION 'Party is not a supplier (type: %)', v_supplier_type;
  END IF;

  IF p_invoice_number IS NOT NULL AND p_invoice_number <> '' AND EXISTS (
    SELECT 1 FROM public.purchase_receipts
    WHERE tenant_id = p_tenant_id AND supplier_id = p_supplier_id
      AND invoice_number = p_invoice_number AND status = 'posted'
  ) THEN
    RAISE EXCEPTION 'Duplicate invoice number % for this supplier', p_invoice_number;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Purchase items must be a JSON array';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'No items provided for purchase'; END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items)
    AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    IF v_item.item_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Each purchase item requires a valid item and positive quantity';
    END IF;
    IF v_item.quantity <> trunc(v_item.quantity) THEN
      RAISE EXCEPTION 'Purchase quantity must be a whole number';
    END IF;
    IF v_item.unit_cost IS NULL OR v_item.unit_cost < 0 THEN
      RAISE EXCEPTION 'Each purchase item requires a non-negative unit cost';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = v_item.item_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Item % not found in tenant', v_item.item_id;
    END IF;
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  IF p_invoice_total IS NOT NULL AND p_invoice_total > 0
     AND ABS(v_total_cost - p_invoice_total) > 1.00 THEN
    RAISE EXCEPTION 'Invoice total mismatch: calculated % but invoice says %', v_total_cost, p_invoice_total;
  END IF;
  IF p_amount_paid IS NULL OR p_amount_paid < 0 THEN
    RAISE EXCEPTION 'Amount paid cannot be negative';
  END IF;
  IF p_amount_paid > v_total_cost THEN
    RAISE EXCEPTION 'Amount paid (%) cannot exceed total cost (%)', p_amount_paid, v_total_cost;
  END IF;

  IF p_status = 'posted' THEN
    -- Ledger columns are two-decimal amounts. Normalize once before persisting
    -- header totals or calculating the balancing payable entry.
    v_total_cost := round(v_total_cost, 2);
    p_amount_paid := round(p_amount_paid, 2);
    IF v_total_cost <= 0 THEN
      RAISE EXCEPTION 'Posted purchase receipt must have a positive total at ledger precision';
    END IF;
  END IF;

  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number,
    invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number,
    v_total_cost, p_amount_paid, p_status, p_notes, v_calling_user.id
  ) RETURNING id INTO v_receipt_id;

  IF p_status = 'draft' THEN
    INSERT INTO public.purchase_receipt_items (receipt_id, item_id, quantity, unit_cost)
    SELECT v_receipt_id, x.item_id, x.quantity, x.unit_cost
    FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC);

    v_response := jsonb_build_object(
      'status', 'success', 'receipt_id', v_receipt_id,
      'total_cost', v_total_cost, 'state', 'draft'
    );
    UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
    RETURN v_response;
  END IF;

  SELECT id INTO v_inventory_account_id
  FROM public.ledger_accounts
  WHERE store_id = p_store_id AND code = '1200_INVENTORY' AND is_active = true
  LIMIT 1;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory Asset ledger account not configured for store';
  END IF;

  v_payable_amount := v_total_cost - p_amount_paid;

  IF p_amount_paid > 0 THEN
    IF p_payment_account_id IS NULL THEN
      RAISE EXCEPTION 'Payment account required when amount_paid > 0';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts
      WHERE id = p_payment_account_id AND store_id = p_store_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Payment account is inactive or not configured for store';
    END IF;
  END IF;

  IF v_payable_amount > 0 THEN
    IF p_payable_account_id IS NULL THEN
      RAISE EXCEPTION 'Payable account required when there is a remaining balance';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_accounts
      WHERE id = p_payable_account_id AND store_id = p_store_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Payable account is inactive or not configured for store';
    END IF;
  END IF;

  INSERT INTO public.ledger_batches (
    store_id, source_type, source_id, source_ref, status, created_by
  ) VALUES (
    p_store_id, 'purchase_receipt', v_receipt_id,
    COALESCE(NULLIF(p_invoice_number, ''), p_idempotency_key), 'POSTED', v_calling_user.id
  ) RETURNING id INTO v_batch_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items)
    AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    PERFORM 1
    FROM public.items
    WHERE id = v_item.item_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    SELECT COALESCE(SUM(delta), 0) INTO v_current_qty
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id AND store_id = p_store_id;

    SELECT weighted_average_cost INTO v_current_avg_cost
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id AND store_id = p_store_id
    ORDER BY created_at DESC LIMIT 1;
    v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

    IF (v_current_qty + v_item.quantity) > 0 THEN
      v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost)
                        / (v_current_qty + v_item.quantity);
    ELSE
      v_new_avg_cost := v_item.unit_cost;
    END IF;

    INSERT INTO public.stock_movements (
      tenant_id, store_id, item_id, delta, reason,
      weighted_average_cost, reference_type, reference_id, created_by
    ) VALUES (
      p_tenant_id, p_store_id, v_item.item_id, v_item.quantity, 'Purchase receipt',
      v_new_avg_cost, 'PURCHASE_RECEIPT', v_receipt_id, v_calling_user.id
    );

    INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (p_store_id, v_item.item_id, v_item.quantity::integer)
    ON CONFLICT (store_id, item_id) DO UPDATE
      SET qty = COALESCE(public.stock_levels.qty, 0) + EXCLUDED.qty;

    UPDATE public.items
    SET cost = v_new_avg_cost, updated_at = NOW()
    WHERE id = v_item.item_id AND tenant_id = p_tenant_id;

    INSERT INTO public.purchase_receipt_items (receipt_id, item_id, quantity, unit_cost)
    VALUES (v_receipt_id, v_item.item_id, v_item.quantity, v_item.unit_cost);
  END LOOP;

  INSERT INTO public.ledger_entries (
    tenant_id, store_id, batch_id, account_id, party_id,
    debit, credit, debit_amount, credit_amount,
    reference_type, reference_id, created_by, notes, effective_date
  ) VALUES (
    p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id, p_supplier_id,
    v_total_cost, 0, v_total_cost, 0,
    'PURCHASE_RECEIPT', v_receipt_id, v_calling_user.id,
    'Inventory from purchase receipt', CURRENT_DATE
  );

  IF p_amount_paid > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, batch_id, account_id, party_id,
      debit, credit, debit_amount, credit_amount,
      reference_type, reference_id, created_by, notes, effective_date
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payment_account_id, p_supplier_id,
      0, p_amount_paid, 0, p_amount_paid,
      'PURCHASE_RECEIPT', v_receipt_id, v_calling_user.id,
      'Payment on purchase receipt', CURRENT_DATE
    );
  END IF;

  IF v_payable_amount > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, batch_id, account_id, party_id,
      debit, credit, debit_amount, credit_amount,
      reference_type, reference_id, created_by, notes, effective_date
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payable_account_id, p_supplier_id,
      0, v_payable_amount, 0, v_payable_amount,
      'PURCHASE_RECEIPT', v_receipt_id, v_calling_user.id,
      'Payable from purchase receipt', CURRENT_DATE
    );
  END IF;

  v_response := jsonb_build_object(
    'status', 'success', 'receipt_id', v_receipt_id, 'batch_id', v_batch_id,
    'total_cost', v_total_cost, 'amount_paid', p_amount_paid,
    'payable_amount', v_payable_amount, 'state', 'posted'
  );
  UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response
  WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
  RETURN v_response;
EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) TO authenticated;
