-- =============================================================================
-- Migration: Stock Deduction RPC with Atomic Transaction
-- Date: 2026-04-27
-- Purpose: Atomic stock deduction with FOR UPDATE lock and stock ledger logging
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Drop existing function if it exists (for migration idempotency)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb) CASCADE;

-- -----------------------------------------------------------------------------
-- 2) Create stock_deduce RPC
--        Features:
--          - Atomic transaction with FOR UPDATE lock
--          - Prevents negative stock
--          - Logs to stock_ledger table
--          - Returns detailed result for audit trail
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_store_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
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
BEGIN
  -- Start atomic transaction
  BEGIN
    -- Step 1: Get current stock level with FOR UPDATE lock (prevents race conditions)
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    -- Step 2: Check for sufficient stock
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

    -- Step 3: Calculate new quantity
    v_new_quantity := v_current_quantity - p_quantity;
    
    -- Step 4: Generate movement ID for audit trail
    v_movement_id := gen_random_uuid();

    -- Step 5: Update stock level (atomic update)
    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Step 6: Log to stock ledger (audit trail)
    INSERT INTO public.stock_ledger (
      store_id,
      product_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      transaction_type,
      reason,
      movement_id,
      metadata
    ) VALUES (
      p_store_id,
      p_product_id,
      v_current_quantity,
      v_new_quantity,
      -p_quantity,
      'sale_deduction',
      'POS transaction sale',
      v_movement_id,
      p_metadata
    );

    -- Step 7: Build and return result
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
    -- Rollback and return error
    RAISE;
    
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'code', 'TRANSACTION_FAILED',
        'message', SQLERRM
      ),
      'movement_id', NULL,
      'previous_quantity', v_current_quantity,
      'new_quantity', NULL,
      'deducted', 0
    );
  END;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Grant execute permissions
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) TO service_role;