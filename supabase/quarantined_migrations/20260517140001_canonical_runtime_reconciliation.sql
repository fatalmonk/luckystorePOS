-- =============================================================================
-- Migration: Canonical Runtime Reconciliation
-- Date: 2026-05-12
-- Purpose: Final reconciliation of schema drift and RPC fragmentation. 
-- Establishes Canonical Lineage (Pillar 1) by standardizing on qty_on_hand, 
-- restoring the version increment logic, and patching composite key resolution.
-- =============================================================================

-- Recreate custom enum types if they were dropped by staging reconciliation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM ('sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer', 'manual', 'sync_repair');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_type') THEN
    CREATE TYPE public.reference_type AS ENUM ('sale', 'purchase', 'expense', 'adjustment', 'system', 'sync');
  END IF;
END $$;

-- Standardize qty column to ensure both qty and qty_on_hand exist and are active
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS qty integer DEFAULT 0;
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS qty_on_hand integer DEFAULT 0;

-- Backfill missing values
UPDATE public.stock_levels 
SET qty = COALESCE(qty, qty_on_hand, 0),
    qty_on_hand = COALESCE(qty_on_hand, qty, 0);

-- Create or update synchronization function and trigger
CREATE OR REPLACE FUNCTION public.sync_qty_qty_on_hand()
RETURNS trigger AS $$
BEGIN
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    NEW.qty_on_hand := NEW.qty;
  ELSIF NEW.qty_on_hand IS DISTINCT FROM OLD.qty_on_hand THEN
    NEW.qty := NEW.qty_on_hand;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_qty_qty_on_hand ON public.stock_levels;
CREATE TRIGGER trg_sync_qty_qty_on_hand
  BEFORE INSERT OR UPDATE ON public.stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_qty_qty_on_hand();

-- Ensure the expected version column exists to support authoritative logic
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;


-- -----------------------------------------------------------------------------
-- 2. RPC RECONCILIATION
-- -----------------------------------------------------------------------------

-- 2.1 adjust_inventory_stock
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
    -- NOTE: Isolation handled by execution driver for PostgREST compatibility.
    -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- TODO: Revisit in Pillar 3

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

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = v_user_id
          AND u.store_id = p_store_id
          AND u.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    -- CORRECTED: Composite key fetch & authoritative column name
    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_product_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    -- Conflict detection
    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- CORRECTED: Valid composite key reference and version bump included
    UPDATE public.stock_levels
    SET qty_on_hand = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE store_id = p_store_id AND item_id = p_product_id;

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


-- 2.2 set_inventory_stock (Comprehensive overload with replay safety)
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
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- TODO: Revisit in Pillar 3

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

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

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = v_user_id
          AND u.store_id = p_store_id
          AND u.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- Fetch via composite key
    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_product_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
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

    -- Correct update
    UPDATE public.stock_levels
    SET qty_on_hand = p_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE store_id = p_store_id AND item_id = p_product_id;

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


-- 2.3 set_inventory_stock (Simpler legacy overload shim to maintain signature safety)
CREATE OR REPLACE FUNCTION public.set_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.set_inventory_stock(
        p_tenant_id, p_store_id, p_product_id, p_new_quantity,
        p_movement_type, p_reference_type, p_reference_id, p_notes, NULL
    );
END;
$$;


-- 2.4 deduct_stock (Replay compatible, fully normalized)
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_store_id uuid,
  p_product_id uuid,
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
  -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- TODO: Revisit in Pillar 3
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

      IF FOUND THEN
          RETURN v_existing_movement;
      END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  -- Corrected composite lock lookup
  SELECT qty_on_hand INTO v_current_quantity
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_product_id
  FOR UPDATE;

  -- Standard failure pattern if record is missing (eliminates self-seeding eval hacks)
  IF v_current_quantity IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        )
      );
  END IF;

  -- Conflict detection (Pre-verify state)
  IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
      RETURN jsonb_build_object(
          'success', false,
          'conflict', true,
          'expected_quantity', p_expected_quantity,
          'actual_quantity', v_current_quantity
      );
  END IF;

  IF v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'INSUFFICIENT_STOCK',
        'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
        'available', v_current_quantity,
        'requested', p_quantity
      )
    );
  END IF;

  v_new_quantity := v_current_quantity - p_quantity;

  -- Authoritative update
  UPDATE public.stock_levels
  SET qty_on_hand = v_new_quantity,
      updated_at = now(),
      version = version + 1
  WHERE store_id = p_store_id AND item_id = p_product_id;

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

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_quantity', v_current_quantity,
    'new_quantity', v_new_quantity,
    'deducted', p_quantity,
    'timestamp', now()
  );
END;
$$;


-- 2.5 record_purchase_v2 (Restored support for version column)
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
  v_user_id             UUID;
  v_supplier_type       TEXT;
  v_payable_amount      NUMERIC(15, 4);
  v_current_quantity    INTEGER;
  v_new_quantity        INTEGER;
  v_item_operation_id   UUID;
BEGIN
  -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- TODO: Revisit in Pillar 3
  v_user_id := auth.uid();

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

  SELECT id INTO v_inventory_account_id
  FROM public.accounts
  WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset'
  LIMIT 1;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory Asset account not configured for tenant';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number,
    invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number,
    v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  IF p_status = 'draft' THEN
    -- Return quick skip for draft
    v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'draft');
    UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
    RETURN v_response;
  END IF;

  INSERT INTO public.journal_batches (tenant_id, store_id, created_by, status)
  VALUES (p_tenant_id, p_store_id, v_user_id, 'posted') RETURNING id INTO v_batch_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = v_item.item_id FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, v_item.item_id, 0, 0) RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + v_item.quantity::INTEGER;

    -- Correct update
    UPDATE public.stock_levels
    SET qty_on_hand = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE store_id = p_store_id AND item_id = v_item.item_id;

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
  END LOOP;

  v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'posted');
  UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2.6 approve_inventory_reconciliation (Transaction compatibility update)
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
    -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- TODO: Revisit in Pillar 3
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_recon
    FROM public.inventory_reconciliations
    WHERE id = p_reconciliation_id
    FOR UPDATE;

    IF v_recon.id IS NULL THEN
        RAISE EXCEPTION 'Reconciliation not found';
    END IF;

    IF v_recon.status <> 'pending' THEN
        RAISE EXCEPTION 'Reconciliation is already %', v_recon.status;
    END IF;

    UPDATE public.inventory_reconciliations
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now()
    WHERE id = p_reconciliation_id;

    IF v_recon.difference <> 0 THEN
        v_movement_type := CASE WHEN v_recon.difference > 0 THEN 'adjustment'::movement_type ELSE 'damage'::movement_type END;
        
        PERFORM public.adjust_inventory_stock(
            v_recon.tenant_id,
            v_recon.store_id,
            v_recon.product_id,
            v_recon.difference,
            'adjustment'::movement_type,
            'adjustment'::reference_type,
            v_recon.id,
            COALESCE(p_notes, v_recon.notes, 'Reconciliation adjustment'),
            TRUE,
            v_recon.id 
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', p_reconciliation_id,
        'difference', v_recon.difference
    );
END;
$$;
