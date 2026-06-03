-- Migration: Fix record_purchase_v2 to update items.cost with weighted average
-- Date: 2026-06-03
-- Issue: Purchase receiving updates stock_movements but not items.cost

-- Drop existing function and recreate with items.cost update
DROP FUNCTION IF EXISTS public.record_purchase_v2(
  TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.record_purchase_v2(
  p_idempotency_key      TEXT,
  p_tenant_id            UUID,
  p_store_id             UUID,
  p_supplier_id          UUID,
  p_invoice_number       TEXT DEFAULT NULL,
  p_invoice_total        NUMERIC DEFAULT NULL,
  p_items                JSONB DEFAULT '[]'::JSONB,
  p_amount_paid          NUMERIC DEFAULT 0,
  p_payment_account_id   UUID DEFAULT NULL,
  p_payable_account_id   UUID DEFAULT NULL,
  p_status               TEXT DEFAULT 'posted',
  p_notes                TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_response            JSONB;
  v_receipt_id          UUID;
  v_batch_id            UUID;
  v_item                RECORD;
  v_total_cost          NUMERIC := 0;
  v_current_qty         NUMERIC;
  v_current_avg_cost    NUMERIC;
  v_new_avg_cost        NUMERIC;
  v_inventory_account_id UUID;
  v_user_id             UUID := auth.uid();
  v_supplier_type       TEXT;
  v_payable_amount      NUMERIC;
BEGIN
  -- 1. Idempotency check
  SELECT response_body INTO v_response
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key
    AND tenant_id = p_tenant_id
    AND completed_at IS NOT NULL;
  IF v_response IS NOT NULL THEN
    RETURN v_response;
  END IF;

  -- 2. Validate status
  IF p_status NOT IN ('draft', 'posted') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft or posted.', p_status;
  END IF;

  -- 3. Validate supplier
  SELECT type INTO v_supplier_type
  FROM public.parties
  WHERE id = p_supplier_id AND tenant_id = p_tenant_id;
  IF v_supplier_type IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  IF v_supplier_type <> 'supplier' THEN
    RAISE EXCEPTION 'Party is not a supplier (type: %)', v_supplier_type;
  END IF;

  -- 4. Duplicate invoice protection
  IF p_invoice_number IS NOT NULL AND p_invoice_number <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.purchase_receipts
      WHERE tenant_id = p_tenant_id
        AND supplier_id = p_supplier_id
        AND invoice_number = p_invoice_number
        AND status = 'posted'
    ) THEN
      RAISE EXCEPTION 'Duplicate invoice number % for this supplier', p_invoice_number;
    END IF;
  END IF;

  -- 5. Get inventory account
  SELECT id INTO v_inventory_account_id
  FROM public.accounts
  WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset'
  LIMIT 1;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory Asset account not configured';
  END IF;

  -- 6. Validate items
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided for purchase';
  END IF;

  -- 7. Calculate total cost
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  -- 8. Invoice validation
  IF p_invoice_total IS NOT NULL AND p_invoice_total > 0 THEN
    IF ABS(v_total_cost - p_invoice_total) > 1.00 THEN
      RAISE EXCEPTION 'Invoice total mismatch: calculated % but invoice says %', v_total_cost, p_invoice_total;
    END IF;
  END IF;

  -- 9. Validate payment
  IF p_amount_paid < 0 THEN
    RAISE EXCEPTION 'Amount paid cannot be negative';
  END IF;
  IF p_amount_paid > v_total_cost THEN
    RAISE EXCEPTION 'Amount paid exceeds total cost';
  END IF;

  -- 10. Create receipt
  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number,
    invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number,
    v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  -- 11. Draft early return
  IF p_status = 'draft' THEN
    v_response := jsonb_build_object(
      'status', 'success',
      'receipt_id', v_receipt_id,
      'total_cost', v_total_cost,
      'state', 'draft'
    );
    INSERT INTO public.idempotency_keys (idempotency_key, tenant_id, response_body, completed_at)
    VALUES (p_idempotency_key, p_tenant_id, v_response, NOW());
    RETURN v_response;
  END IF;

  -- 12. Create journal batch
  INSERT INTO public.journal_batches (tenant_id, store_id, created_by, status)
  VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
  RETURNING id INTO v_batch_id;

  -- 13. Process items and update cost
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    -- Validate item belongs to tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = v_item.item_id 
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Item % not found in tenant', v_item.item_id;
    END IF;

    -- Calculate weighted average
    SELECT COALESCE(SUM(quantity_change), 0) INTO v_current_qty
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id;

    SELECT weighted_average_cost INTO v_current_avg_cost
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;

    v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

    IF (v_current_qty + v_item.quantity) > 0 THEN
      v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost)
                      / (v_current_qty + v_item.quantity);
    ELSE
      v_new_avg_cost := v_item.unit_cost;
    END IF;

    -- Record stock movement
    INSERT INTO public.stock_movements (
      tenant_id, store_id, item_id, quantity_change,
      weighted_average_cost, reference_type, reference_id, created_by
    ) VALUES (
      p_tenant_id, p_store_id, v_item.item_id, v_item.quantity,
      v_new_avg_cost, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id
    );

    -- Record receipt item
    INSERT INTO public.purchase_receipt_items (receipt_id, item_id, quantity, unit_cost)
    VALUES (v_receipt_id, v_item.item_id, v_item.quantity, v_item.unit_cost);

    -- UPDATE ITEM COST (NEW)
    UPDATE public.items
    SET cost = v_new_avg_cost,
        updated_at = NOW()
    WHERE id = v_item.item_id;
  END LOOP;

  -- 14. Ledger entries
  INSERT INTO public.ledger_entries (
    tenant_id, store_id, journal_batch_id, account_id,
    debit_amount, party_id, reference_type, reference_id, created_by, notes
  ) VALUES (
    p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id,
    v_total_cost, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
    'Inventory from purchase receipt'
  );

  v_payable_amount := v_total_cost - p_amount_paid;

  -- Payment entry
  IF p_amount_paid > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      credit_amount, party_id, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payment_account_id,
      p_amount_paid, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Cash payment on purchase'
    );
  END IF;

  -- Payable entry
  IF v_payable_amount > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      credit_amount, party_id, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payable_account_id,
      v_payable_amount, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Payable from purchase receipt'
    );
  END IF;

  -- 15. Build response
  v_response := jsonb_build_object(
    'status', 'success',
    'receipt_id', v_receipt_id,
    'batch_id', v_batch_id,
    'total_cost', v_total_cost,
    'amount_paid', p_amount_paid,
    'payable_amount', v_payable_amount,
    'state', 'posted'
  );

  INSERT INTO public.idempotency_keys (idempotency_key, tenant_id, response_body, completed_at)
  VALUES (p_idempotency_key, p_tenant_id, v_response, NOW());

  RETURN v_response;

EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant permissions
REVOKE ALL ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.record_purchase_v2 IS 'Record purchase receipt, update stock, and update item cost with weighted average';
