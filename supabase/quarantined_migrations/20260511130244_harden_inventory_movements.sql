-- =============================================================================
-- Migration: Harden Inventory Movements
-- Date: 2026-05-11
-- Purpose: Enforce database constraints and idempotency on the inventory ledger
-- =============================================================================

-- 1. Add operation_id and Constraints
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS operation_id UUID UNIQUE;

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT chk_inventory_movements_new_qty_non_negative CHECK (new_quantity >= 0);

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT chk_inventory_movements_qty_math CHECK (previous_quantity + quantity_delta = new_quantity);

-- 2. Update adjust_inventory_stock to accept p_operation_id and implement idempotency
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_product_id UUID,
    p_quantity_delta INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_allow_negative BOOLEAN DEFAULT FALSE,
    p_operation_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency check
    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;

-- 3. Update set_inventory_stock
CREATE OR REPLACE FUNCTION public.set_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_operation_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency check
    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    UPDATE public.stock_levels
    SET qty = p_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity
    );
END;
$$;

-- 4. Update deduct_stock
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_store_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_operation_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
  v_existing_movement JSONB;
BEGIN
  -- Idempotency check
  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'stock_level_id', (SELECT id FROM stock_levels WHERE store_id = p_store_id AND item_id = p_product_id),
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true,
          'timestamp', created_at
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;

      IF FOUND THEN
          RETURN v_existing_movement;
      END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
      tenant_id, store_id, product_id,
      movement_type, quantity_delta,
      reference_type, reference_id,
      previous_quantity, new_quantity,
      notes, created_by, operation_id
    ) VALUES (
      v_tenant_id, p_store_id, p_product_id,
      'sale', -p_quantity,
      'sale', (p_metadata->>'sale_id')::uuid,
      v_current_quantity, v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;

-- 5. Update record_purchase_v2 to assign operation_id
CREATE OR REPLACE FUNCTION public.record_purchase_v2(
  p_idempotency_key      TEXT,
  p_tenant_id            UUID,
  p_store_id             UUID,
  p_supplier_id          UUID,
  p_invoice_number       TEXT DEFAULT NULL,
  p_invoice_total        NUMERIC(15, 4) DEFAULT NULL,
  p_items                JSONB DEFAULT '[]'::jsonb,
  p_amount_paid          NUMERIC(15, 4) DEFAULT 0,
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
  v_total_cost          NUMERIC(15, 4) := 0;
  v_inventory_account_id UUID;
  v_user_id             UUID := auth.uid();
  v_supplier_type       TEXT;
  v_payable_amount      NUMERIC(15, 4);
  v_stock_level_id      UUID;
  v_current_quantity    INTEGER;
  v_new_quantity        INTEGER;
  v_item_operation_id   UUID;
BEGIN
  -- 1. Idempotency Check
  v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
  IF v_response IS NOT NULL THEN
    RETURN v_response;
  END IF;

  IF p_status NOT IN ('draft', 'posted') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft or posted.', p_status;
  END IF;

  SELECT type INTO v_supplier_type
  FROM public.parties
  WHERE id = p_supplier_id AND tenant_id = p_tenant_id;
  IF v_supplier_type IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  IF v_supplier_type <> 'supplier' THEN
    RAISE EXCEPTION 'Party is not a supplier (type: %)', v_supplier_type;
  END IF;

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

  SELECT id INTO v_inventory_account_id
  FROM public.accounts
  WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset'
  LIMIT 1;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory Asset account not configured for tenant';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided for purchase';
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  IF p_invoice_total IS NOT NULL AND p_invoice_total > 0 THEN
    IF ABS(v_total_cost - p_invoice_total) > 1.00 THEN
      RAISE EXCEPTION 'Invoice total mismatch: calculated % but invoice says %', v_total_cost, p_invoice_total;
    END IF;
  END IF;

  IF p_amount_paid < 0 THEN
    RAISE EXCEPTION 'Amount paid cannot be negative';
  END IF;
  IF p_amount_paid > v_total_cost THEN
    RAISE EXCEPTION 'Amount paid (%) cannot exceed total cost (%)', p_amount_paid, v_total_cost;
  END IF;

  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number,
    invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number,
    v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  IF p_status = 'draft' THEN
    v_response := jsonb_build_object(
      'status', 'success',
      'receipt_id', v_receipt_id,
      'total_cost', v_total_cost,
      'state', 'draft'
    );
    UPDATE public.idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
    RETURN v_response;
  END IF;

  INSERT INTO public.journal_batches (tenant_id, store_id, created_by, status)
  VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
  RETURNING id INTO v_batch_id;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_items
      WHERE id = v_item.item_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Item % not found in tenant', v_item.item_id;
    END IF;

    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = v_item.item_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, v_item.item_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + v_item.quantity::INTEGER;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Generate a deterministic operation_id based on idempotency key and item_id
    v_item_operation_id := md5(p_idempotency_key || '_' || v_item.item_id::text)::uuid;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, v_item.item_id,
        'purchase', v_item.quantity::INTEGER,
        'purchase', v_receipt_id,
        v_current_quantity, v_new_quantity,
        'Purchase Receipt ' || COALESCE(p_invoice_number, ''), v_user_id, v_item_operation_id
    );

    INSERT INTO public.purchase_receipt_items (receipt_id, item_id, quantity, unit_cost)
    VALUES (v_receipt_id, v_item.item_id, v_item.quantity, v_item.unit_cost);
  END LOOP;

  INSERT INTO public.ledger_entries (
    tenant_id, store_id, journal_batch_id, account_id,
    debit_amount, party_id, reference_type, reference_id, created_by, notes
  ) VALUES (
    p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id,
    v_total_cost, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
    'Inventory from purchase receipt'
  );

  v_payable_amount := v_total_cost - p_amount_paid;

  IF p_amount_paid > 0 THEN
    IF p_payment_account_id IS NULL THEN
      RAISE EXCEPTION 'Payment account required when amount_paid > 0';
    END IF;
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      party_id, credit_amount, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payment_account_id,
      p_supplier_id, p_amount_paid, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Cash payment on purchase'
    );
  END IF;

  IF v_payable_amount > 0 THEN
    IF p_payable_account_id IS NULL THEN
      RAISE EXCEPTION 'Payable account required when there is a remaining balance';
    END IF;
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      party_id, credit_amount, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payable_account_id,
      p_supplier_id, v_payable_amount, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Payable from purchase receipt'
    );
  END IF;

  v_response := jsonb_build_object(
    'status', 'success',
    'receipt_id', v_receipt_id,
    'batch_id', v_batch_id,
    'total_cost', v_total_cost,
    'amount_paid', p_amount_paid,
    'payable_amount', v_payable_amount,
    'state', 'posted'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
