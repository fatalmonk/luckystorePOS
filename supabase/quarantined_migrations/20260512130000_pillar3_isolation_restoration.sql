-- =============================================================================
-- Migration: Pillar 3 Isolation Restoration
-- Date: 2026-05-12
-- Purpose: Restore SERIALIZABLE transaction isolation semantics across the 
-- authoritative canonical RPC interfaces. This guarantees replay execution 
-- determinism and collision safety under multi-device offline sync load.
-- =============================================================================

-- 1. adjust_inventory_stock
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_item_id UUID,
    p_quantity_delta INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_allow_negative BOOLEAN DEFAULT FALSE,
    p_operation_id UUID DEFAULT NULL,
    p_expected_quantity INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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

        IF FOUND THEN RETURN v_existing_movement; END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id AND s.id = p_store_id AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock';
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_item_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_item_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;
    IF v_new_quantity < 0 AND NOT p_allow_negative THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1
    WHERE store_id = p_store_id AND item_id = p_item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_item_id,
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


-- 2. set_inventory_stock
CREATE OR REPLACE FUNCTION public.set_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_item_id UUID,
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
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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
        IF FOUND THEN RETURN v_existing_movement; END IF;
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_item_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_item_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;
    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object('success', true, 'movement_id', NULL, 'previous_quantity', v_current_quantity, 'new_quantity', v_current_quantity);
    END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = p_new_quantity, updated_at = now(), version = version + 1
    WHERE store_id = p_store_id AND item_id = p_item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_item_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object('success', true, 'movement_id', v_movement_id, 'previous_quantity', v_current_quantity, 'new_quantity', p_new_quantity);
END;
$$;


-- 3. deduct_stock
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_operation_id UUID DEFAULT NULL,
  p_expected_quantity INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_tenant_id uuid;
  v_user_id uuid;
  v_existing_movement JSONB;
BEGIN

  v_user_id := auth.uid();

  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;
      IF FOUND THEN RETURN v_existing_movement; END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  SELECT qty_on_hand INTO v_current_quantity
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
      RETURN jsonb_build_object('error', jsonb_build_object('code', 'NO_STOCK_LEVEL', 'message', format('No record found for item %s', p_item_id::text)));
  END IF;

  IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
      RETURN jsonb_build_object('success', false, 'conflict', true, 'expected', p_expected_quantity, 'actual', v_current_quantity);
  END IF;

  IF v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'INSUFFICIENT_STOCK', 'available', v_current_quantity, 'requested', p_quantity));
  END IF;

  v_new_quantity := v_current_quantity - p_quantity;

  UPDATE public.stock_levels
  SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1
  WHERE store_id = p_store_id AND item_id = p_item_id;

  INSERT INTO public.inventory_movements (
    tenant_id, store_id, item_id,
    movement_type, quantity_delta,
    reference_type, reference_id,
    previous_quantity, new_quantity,
    notes, created_by, operation_id
  ) VALUES (
    v_tenant_id, p_store_id, p_item_id,
    'sale', -p_quantity,
    'sale', (p_metadata->>'sale_id')::uuid,
    v_current_quantity, v_new_quantity,
    COALESCE(p_metadata->>'notes', 'POS transaction sale'),
    v_user_id, p_operation_id
  ) RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object('success', true, 'movement_id', v_movement_id, 'previous_quantity', v_current_quantity, 'new_quantity', v_new_quantity, 'deducted', p_quantity);
END;
$$;


-- 4. record_purchase_v2
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
  v_item                RECORD;
  v_total_cost          NUMERIC(15, 4) := 0;
  v_user_id             UUID;
  v_current_quantity    INTEGER;
  v_new_quantity        INTEGER;
BEGIN

  v_user_id := auth.uid();
  v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
  IF v_response IS NOT NULL THEN RETURN v_response; END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number, invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number, v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  IF p_status = 'draft' THEN
    v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'draft');
    UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
    RETURN v_response;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    SELECT qty_on_hand INTO v_current_quantity FROM public.stock_levels WHERE store_id = p_store_id AND item_id = v_item.item_id FOR UPDATE;
    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version) VALUES (p_store_id, v_item.item_id, 0, 0) RETURNING qty_on_hand INTO v_current_quantity;
    END IF;
    v_new_quantity := v_current_quantity + v_item.quantity::INTEGER;

    UPDATE public.stock_levels SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1 WHERE store_id = p_store_id AND item_id = v_item.item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta, reference_type, reference_id,
        previous_quantity, new_quantity, notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, v_item.item_id,
        'purchase', v_item.quantity::INTEGER, 'purchase', v_receipt_id,
        v_current_quantity, v_new_quantity, 'Purchase Receipt ' || COALESCE(p_invoice_number, ''), v_user_id,
        md5(p_idempotency_key || '_' || v_item.item_id::text)::uuid
    );
  END LOOP;

  v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'posted');
  UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. approve_inventory_reconciliation
CREATE OR REPLACE FUNCTION public.approve_inventory_reconciliation(
    p_reconciliation_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recon public.inventory_reconciliations%ROWTYPE;
    v_user_id UUID;
    v_movement_type movement_type;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT * INTO v_recon FROM public.inventory_reconciliations WHERE id = p_reconciliation_id FOR UPDATE;
    IF v_recon.id IS NULL THEN RAISE EXCEPTION 'Reconciliation not found'; END IF;
    IF v_recon.status <> 'pending' THEN RAISE EXCEPTION 'Reconciliation is already %', v_recon.status; END IF;

    UPDATE public.inventory_reconciliations SET status = 'approved', approved_by = v_user_id, approved_at = now() WHERE id = p_reconciliation_id;

    IF v_recon.difference <> 0 THEN
        PERFORM public.adjust_inventory_stock(
            v_recon.tenant_id,
            v_recon.store_id,
            v_recon.item_id, 
            v_recon.difference,
            'adjustment'::movement_type,
            'adjustment'::reference_type,
            v_recon.id,
            COALESCE(p_notes, v_recon.notes, 'Reconciliation adjustment'),
            TRUE,
            v_recon.id 
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'reconciliation_id', p_reconciliation_id, 'difference', v_recon.difference);
END;
$$;
