-- =============================================================================
-- Function: sync_offline_orders
-- Purpose: Synchronize batch of offline orders from Flutter app
-- Security: SECURITY DEFINER with proper validation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_offline_orders(
  p_orders JSONB -- Array of order objects with items and payments
)
RETURNS TABLE (
  order_id UUID,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order JSONB;
  v_order_id UUID;
  v_store_id UUID;
  v_user_id UUID;
  v_idempotency_key TEXT;
  v_order_total DECIMAL(15,2);
  v_item JSONB;
  v_payment JSONB;
  v_conflict_exists BOOLEAN;
BEGIN
  -- Get current user's store_id
  SELECT store_id, id INTO v_store_id, v_user_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a store';
  END IF;

  -- Process each order
  FOR v_order IN SELECT * FROM jsonb_array_elements(p_orders) LOOP
    BEGIN
      -- Extract order data
      v_order_id := (v_order->>'id')::UUID;
      v_idempotency_key := v_order->>'idempotency_key';
      v_order_total := (v_order->>'total')::DECIMAL;
      
      -- Check if order already exists (idempotency check)
      SELECT EXISTS (
        SELECT 1 FROM public.sales WHERE id = v_order_id
      ) INTO v_conflict_exists;
      
      IF v_conflict_exists THEN
        -- Order already synced, return success
        RETURN QUERY SELECT v_order_id, 'success'::TEXT, 'Order already synchronized'::TEXT;
        CONTINUE;
      END IF;
      
      -- Validate that the order belongs to the user's store
      IF (v_order->>'store_id')::UUID != v_store_id THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Order does not belong to user store'::TEXT;
        CONTINUE;
      END IF;
      
      -- Validate that the order was created by this user
      IF (v_order->>'created_by')::UUID != v_user_id THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Order not created by current user'::TEXT;
        CONTINUE;
      END IF;
      
      -- Start transaction for this order
      BEGIN
        -- Insert the order
        INSERT INTO public.sales (
          id,
          store_id,
          total,
          subtotal,
          discount,
          tax,
          payment_type,
          status,
          notes,
          created_by,
          created_at,
          updated_at,
          synced_at
        ) VALUES (
          v_order_id,
          (v_order->>'store_id')::UUID,
          (v_order->>'total')::DECIMAL,
          (v_order->>'subtotal')::DECIMAL,
          COALESCE((v_order->>'discount')::DECIMAL, 0),
          COALESCE((v_order->>'tax')::DECIMAL, 0),
          (v_order->>'payment_type')::payment_type,
          COALESCE(v_order->>'status', 'completed'),
          v_order->>'notes',
          v_user_id,
          (v_order->>'created_at')::TIMESTAMP,
          (v_order->>'created_at')::TIMESTAMP,
          NOW()
        );
        
        -- Insert order items
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_order->'items') LOOP
          INSERT INTO public.sale_items (
            id,
            sale_id,
            item_id,
            quantity,
            unit_price,
            total_price,
            discount,
            created_at
          ) VALUES (
            (v_item->>'id')::UUID,
            v_order_id,
            (v_item->>'item_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'discount')::DECIMAL, 0),
            (v_item->>'created_at')::TIMESTAMP
          );
        END LOOP;
        
        -- Insert payments
        FOR v_payment IN SELECT * FROM jsonb_array_elements(v_order->'payments') LOOP
          INSERT INTO public.sale_payments (
            id,
            sale_id,
            amount,
            payment_type,
            reference_number,
            created_at
          ) VALUES (
            (v_payment->>'id')::UUID,
            v_order_id,
            (v_payment->>'amount')::DECIMAL,
            (v_payment->>'payment_type')::payment_type,
            v_payment->>'reference_number',
            (v_payment->>'created_at')::TIMESTAMP
          );
        END LOOP;
        
        -- Insert idempotency key
        INSERT INTO public.idempotency_keys (key, created_at)
        VALUES (v_idempotency_key, NOW())
        ON CONFLICT (key) DO NOTHING;
        
        -- Return success
        RETURN QUERY SELECT v_order_id, 'success'::TEXT, 'Order synchronized successfully'::TEXT;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Rollback this order and return error
          RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Failed to synchronize: ' || SQLERRM::TEXT;
      END;
      
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Unexpected error: ' || SQLERRM::TEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_offline_orders(JSONB) TO authenticated;

-- =============================================================================
-- Function: get_offline_sync_status
-- Purpose: Check the sync status of offline orders
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_offline_sync_status(
  p_order_ids UUID[]
)
RETURNS TABLE (
  order_id UUID,
  is_synced BOOLEAN,
  synced_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as order_id,
    s.synced_at IS NOT NULL as is_synced,
    s.synced_at
  FROM public.sales s
  WHERE s.id = ANY(p_order_ids)
    AND s.store_id = (
      SELECT store_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_offline_sync_status(UUID[]) TO authenticated;
