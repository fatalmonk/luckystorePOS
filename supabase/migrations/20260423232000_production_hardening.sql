-- =============================================================================
-- Production Hardening: Idempotency & Financial Integrity
-- =============================================================================

-- 1) Add idempotency_key columns
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency 
  ON public.sales (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.stock_movements 
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_idempotency 
  ON public.stock_movements (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 2) Update complete_sale to handle idempotency
-- canonical definition in 20260426213841_domain_rpcs_trust_engine.sql
DROP FUNCTION IF EXISTS public.complete_sale();
-- (previous definition commented out to avoid migration conflicts)
-- CREATE OR REPLACE FUNCTION public.complete_sale(
--   p_store_id      uuid,
--   p_cashier_id    uuid,
--   p_session_id    uuid        DEFAULT NULL,
--   p_items         jsonb       DEFAULT '[]',
--   p_payments      jsonb       DEFAULT '[]',
--   p_discount      numeric     DEFAULT 0,
--   p_notes         text        DEFAULT NULL,
--   p_idempotency_key text      DEFAULT NULL
-- )
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- DECLARE
--   v_user_id       uuid;
--   v_sale_id       uuid;
--   v_sale_number   text;
--   v_existing_sale jsonb;
--   v_subtotal      numeric(12,2) := 0;
--   v_total         numeric(12,2);
--   v_tendered      numeric(12,2) := 0;
--   v_change        numeric(12,2);
--   v_item          record;
--   v_payment       record;
--   v_item_rec      public.items%ROWTYPE;
-- BEGIN
--   -- 1. Check idempotency
--   IF p_idempotency_key IS NOT NULL THEN
--     SELECT jsonb_build_object(
--       'sale_id', id,
--       'sale_number', sale_number,
--       'total_amount', total_amount,
--       'status', status,
--       'is_duplicate', true
--     ) INTO v_existing_sale
--     FROM public.sales 
--     WHERE idempotency_key = p_idempotency_key;

--     IF v_existing_sale IS NOT NULL THEN
--       RETURN v_existing_sale;
--     END IF;
--   END IF;

--   -- 2. Authenticate
--   SELECT id INTO v_user_id
--     FROM public.users WHERE auth_id = (SELECT auth.uid());
--   IF v_user_id IS NULL THEN
--     RAISE EXCEPTION 'Not authenticated';
--   END IF;

--   -- 3. Validate items array
--   IF jsonb_array_length(p_items) = 0 THEN
--     RAISE EXCEPTION 'Sale must have at least one item';
--   END IF;

--   -- 4. Insert sale
--   INSERT INTO public.sales (store_id, cashier_id, session_id, status, notes, idempotency_key)
--     VALUES (p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_idempotency_key)
--     RETURNING id, sale_number INTO v_sale_id, v_sale_number;

--   -- 5. Process each line item
--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_items) AS x(
--       item_id    uuid,
--       qty        integer,
--       unit_price numeric,
--       cost       numeric,
--       discount   numeric
--     )
--   LOOP
--     -- Validate item exists and is active
--     SELECT * INTO v_item_rec FROM public.items WHERE id = v_item.item_id AND active = true;
--     IF v_item_rec.id IS NULL THEN
--       RAISE EXCEPTION 'Item % not found or inactive', v_item.item_id;
--     END IF;

--     IF v_item.qty <= 0 THEN
--       RAISE EXCEPTION 'Qty must be > 0 for item %', v_item_rec.name;
--     END IF;

--     DECLARE
--       v_line_total numeric(12,2);
--     BEGIN
--       v_line_total := ROUND((v_item.unit_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
--       v_subtotal   := v_subtotal + v_line_total;

--       INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, cost, discount, line_total)
--         VALUES (v_sale_id, v_item.item_id, v_item.qty,
--                 v_item.unit_price, COALESCE(v_item.cost, 0),
--                 COALESCE(v_item.discount, 0), v_line_total);
--     END;

--     -- Decrement stock
--     PERFORM public.adjust_stock(
--       p_store_id,
--       v_item.item_id,
--       -v_item.qty,
--       'sale',
--       'Sale: ' || v_sale_number,
--       v_user_id,
--       'sale-' || v_sale_id || '-' || v_item.item_id
--     );
--   END LOOP;

--   -- 6. Compute totals
--   v_total := ROUND(v_subtotal - COALESCE(p_discount, 0), 2);
--   IF v_total < 0 THEN v_total := 0; END IF;

--   -- 7. Process payments
--   FOR v_payment IN
--     SELECT * FROM jsonb_to_recordset(p_payments) AS x(
--       payment_method_id uuid,
--       amount            numeric,
--       reference         text
--     )
--   LOOP
--     v_tendered := v_tendered + v_payment.amount;

--     INSERT INTO public.sale_payments (sale_id, payment_method_id, amount, reference)
--       VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
--   END LOOP;

--   v_change := ROUND(v_tendered - v_total, 2);
--   IF v_change < 0 THEN
--     RAISE EXCEPTION 'Payment insufficient. Total: %, Tendered: %', v_total, v_tendered;
--   END IF;

--   -- 8. Update sale totals
--   UPDATE public.sales
--     SET subtotal        = v_subtotal,
--         discount_amount = COALESCE(p_discount, 0),
--         total_amount    = v_total,
--         amount_tendered = v_tendered,
--         change_due      = v_change
--     WHERE id = v_sale_id;

--   -- 9. Update session totals
--   IF p_session_id IS NOT NULL THEN
--     UPDATE public.pos_sessions
--       SET total_sales = total_sales + v_total
--       WHERE id = p_session_id;
--   END IF;

--   RETURN jsonb_build_object(
--     'sale_id',      v_sale_id,
--     'sale_number',  v_sale_number,
--     'subtotal',     v_subtotal,
--     'discount',     COALESCE(p_discount, 0),
--     'total_amount', v_total,
--     'tendered',     v_tendered,
--     'change_due',   v_change,
--     'is_duplicate', false
--   );
-- END;
-- $$;

-- 3) RPC: void_sale
CREATE OR REPLACE FUNCTION public.void_sale(
  p_sale_id     uuid,
  p_reason      text DEFAULT 'Voided by manager',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id       uuid;
  v_sale          public.sales%ROWTYPE;
  v_item          record;
  v_existing_void jsonb;
BEGIN
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'sale_id', id,
      'status', status,
      'is_duplicate', true
    ) INTO v_existing_void
    FROM public.sales 
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_void IS NOT NULL THEN
      RETURN v_existing_void;
    END IF;
  END IF;

  -- 2. Auth: manager/admin only
  SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = (SELECT auth.uid()) AND role IN ('admin','manager');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Only managers and admins can void sales';
  END IF;

  -- 3. Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status = 'voided' THEN
    RETURN jsonb_build_object('sale_id', p_sale_id, 'status', 'voided', 'is_duplicate', true);
  END IF;
  IF v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot void a sale with status: %', v_sale.status;
  END IF;

  -- 4. Restore stock
  FOR v_item IN
    SELECT item_id, qty FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.adjust_stock(
      v_sale.store_id,
      v_item.item_id,
      v_item.qty,
      'void',
      'Void: ' || v_sale.sale_number,
      v_user_id,
      'void-' || p_sale_id || '-' || v_item.item_id
    );
  END LOOP;

  -- 5. Mark sale voided
  UPDATE public.sales
    SET status      = 'voided',
        voided_by   = v_user_id,
        voided_at   = now(),
        void_reason = p_reason,
        idempotency_key = COALESCE(p_idempotency_key, 'void-' || p_sale_id)
    WHERE id = p_sale_id;

  -- 6. Adjust session totals
  IF v_sale.session_id IS NOT NULL THEN
    UPDATE public.pos_sessions
      SET total_sales = total_sales - v_sale.total_amount
      WHERE id = v_sale.session_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',     p_sale_id,
    'sale_number', v_sale.sale_number,
    'status',      'voided',
    'is_duplicate', false
  );
END;
$$;

-- 4) Update adjust_stock to handle idempotency
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_delta integer,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_qty integer;
  v_movement_id uuid;
  v_existing_movement jsonb;
BEGIN
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'movement_id', id,
      'delta', delta,
      'reason', reason,
      'is_duplicate', true
    ) INTO v_existing_movement
    FROM public.stock_movements 
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_movement IS NOT NULL THEN
      RETURN v_existing_movement;
    END IF;
  END IF;

  -- 2. Validate reason
  IF p_reason NOT IN (
    'received', 'damaged', 'lost', 'correction',
    'returned', 'transfer_in', 'transfer_out',
    'sale', 'import', 'expired', 'other', 'void'
  ) THEN
    RAISE EXCEPTION 'Invalid adjustment reason: %', p_reason;
  END IF;

  -- 3. Validate delta is not zero
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment quantity cannot be zero';
  END IF;

  -- 4. Upsert stock level
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, GREATEST(0, p_delta))
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = GREATEST(0, public.stock_levels.qty + p_delta);

  -- 5. Get the new quantity
  SELECT qty INTO v_new_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  -- 6. Write movement record
  INSERT INTO public.stock_movements (store_id, item_id, delta, reason, meta, performed_by, idempotency_key)
  VALUES (
    p_store_id,
    p_item_id,
    p_delta,
    p_reason,
    jsonb_build_object(
      'notes', COALESCE(p_notes, ''),
      'source', 'transaction_system',
      'new_qty', v_new_qty
    ),
    p_performed_by,
    p_idempotency_key
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'new_qty', v_new_qty,
    'delta', p_delta,
    'reason', p_reason,
    'is_duplicate', false
  );
END;
$$;
