-- =============================================================================
-- Offline Sync Idempotency + Conflict Queue
-- =============================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS client_transaction_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_store_client_txn
  ON public.sales (store_id, client_transaction_id)
  WHERE client_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sale_sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_transaction_id text NOT NULL,
  conflict_type text NOT NULL CHECK (
    conflict_type IN ('insufficient_stock', 'deleted_product', 'changed_price', 'duplicate_sale')
  ),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'resolved', 'ignored')
  ),
  requires_manager_review boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id),
  UNIQUE (store_id, client_transaction_id, conflict_type)
);

ALTER TABLE public.sale_sync_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ssc_select ON public.sale_sync_conflicts;
CREATE POLICY ssc_select ON public.sale_sync_conflicts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid())
      AND u.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS ssc_insert ON public.sale_sync_conflicts;
CREATE POLICY ssc_insert ON public.sale_sync_conflicts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid())
      AND u.role IN ('admin', 'manager', 'cashier')
  )
);

DROP POLICY IF EXISTS ssc_update ON public.sale_sync_conflicts;
CREATE POLICY ssc_update ON public.sale_sync_conflicts FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid())
      AND u.role IN ('admin', 'manager')
  )
);

CREATE OR REPLACE FUNCTION public.log_sale_sync_conflict(
  p_store_id uuid,
  p_client_transaction_id text,
  p_conflict_type text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_requires_manager_review boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.sale_sync_conflicts (
    store_id,
    client_transaction_id,
    conflict_type,
    details,
    requires_manager_review
  )
  VALUES (
    p_store_id,
    p_client_transaction_id,
    p_conflict_type,
    COALESCE(p_details, '{}'::jsonb),
    p_requires_manager_review
  )
  ON CONFLICT (store_id, client_transaction_id, conflict_type)
  DO UPDATE SET
    details = EXCLUDED.details,
    requires_manager_review = EXCLUDED.requires_manager_review,
    status = CASE
      WHEN public.sale_sync_conflicts.status = 'resolved' THEN 'resolved'
      ELSE 'pending_review'
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.log_sale_sync_conflict(uuid, text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_sale_sync_conflict(uuid, text, text, jsonb, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text);

-- canonical definition in 20260426213841_domain_rpcs_trust_engine.sql
DROP FUNCTION IF EXISTS public.complete_sale();
-- (previous definition commented out to avoid migration conflicts)
-- CREATE OR REPLACE FUNCTION public.complete_sale(
--   p_store_id uuid,
--   p_cashier_id uuid,
--   p_session_id uuid DEFAULT NULL,
--   p_items jsonb DEFAULT '[]',
--   p_payments jsonb DEFAULT '[]',
--   p_discount numeric DEFAULT 0,
--   p_client_transaction_id text DEFAULT NULL,
--   p_notes text DEFAULT NULL
-- )
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- DECLARE
--   v_user_id uuid;
--   v_sale_id uuid;
--   v_sale_number text;
--   v_subtotal numeric(12,2) := 0;
--   v_total numeric(12,2);
--   v_tendered numeric(12,2) := 0;
--   v_change numeric(12,2);
--   v_item record;
--   v_payment record;
--   v_item_rec record;
--   v_existing_sale record;
-- BEGIN
--   SELECT id INTO v_user_id
--   FROM public.users
--   WHERE auth_id = (SELECT auth.uid());
--   IF v_user_id IS NULL THEN
--     RAISE EXCEPTION 'Not authenticated';
--   END IF;

--   IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
--     RAISE EXCEPTION 'client_transaction_id is required';
--   END IF;

--   SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due
--     INTO v_existing_sale
--   FROM public.sales
--   WHERE store_id = p_store_id
--     AND client_transaction_id = p_client_transaction_id
--   LIMIT 1;

--   IF v_existing_sale.id IS NOT NULL THEN
--     PERFORM public.log_sale_sync_conflict(
--       p_store_id,
--       p_client_transaction_id,
--       'duplicate_sale',
--       jsonb_build_object('sale_id', v_existing_sale.id, 'sale_number', v_existing_sale.sale_number),
--       false
--     );
--     RETURN jsonb_build_object(
--       'sync_status', 'synced',
--       'duplicate_detected', true,
--       'sale_id', v_existing_sale.id,
--       'sale_number', v_existing_sale.sale_number,
--       'subtotal', COALESCE(v_existing_sale.subtotal, 0),
--       'discount', COALESCE(v_existing_sale.discount_amount, 0),
--       'total_amount', COALESCE(v_existing_sale.total_amount, 0),
--       'tendered', COALESCE(v_existing_sale.amount_tendered, 0),
--       'change_due', COALESCE(v_existing_sale.change_due, 0)
--     );
--   END IF;

--   IF jsonb_array_length(p_items) = 0 THEN
--     RAISE EXCEPTION 'Sale must have at least one item';
--   END IF;

--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_items) AS x(
--       item_id uuid,
--       qty integer,
--       unit_price numeric,
--       cost numeric,
--       discount numeric
--     )
--   LOOP
--     SELECT i.id, i.name, i.price, i.cost, i.active, COALESCE(sl.qty, 0) AS qty_on_hand
--       INTO v_item_rec
--     FROM public.items i
--     LEFT JOIN public.stock_levels sl
--       ON sl.item_id = i.id AND sl.store_id = p_store_id
--     WHERE i.id = v_item.item_id;

--     IF v_item_rec.id IS NULL OR v_item_rec.active IS DISTINCT FROM true THEN
--       PERFORM public.log_sale_sync_conflict(
--         p_store_id,
--         p_client_transaction_id,
--         'deleted_product',
--         jsonb_build_object('item_id', v_item.item_id, 'qty', v_item.qty),
--         true
--       );
--       RETURN jsonb_build_object(
--         'sync_status', 'conflict',
--         'conflict_type', 'deleted_product',
--         'manager_review_required', true,
--         'auto_resolved', false,
--         'message', 'One or more products were deleted or inactive'
--       );
--     END IF;

--     IF v_item.qty <= 0 THEN
--       RAISE EXCEPTION 'Qty must be > 0 for item %', v_item_rec.name;
--     END IF;

--     IF v_item_rec.qty_on_hand < v_item.qty THEN
--       PERFORM public.log_sale_sync_conflict(
--         p_store_id,
--         p_client_transaction_id,
--         'insufficient_stock',
--         jsonb_build_object(
--           'item_id', v_item.item_id,
--           'item_name', v_item_rec.name,
--           'required_qty', v_item.qty,
--           'available_qty', v_item_rec.qty_on_hand
--         ),
--         true
--       );
--       RETURN jsonb_build_object(
--         'sync_status', 'conflict',
--         'conflict_type', 'insufficient_stock',
--         'manager_review_required', true,
--         'auto_resolved', false,
--         'message', format('Insufficient stock for %s', v_item_rec.name)
--       );
--     END IF;

--     IF ROUND(COALESCE(v_item.unit_price, 0), 2) <> ROUND(COALESCE(v_item_rec.price, 0), 2) THEN
--       IF v_item_rec.price > v_item.unit_price THEN
--         PERFORM public.log_sale_sync_conflict(
--           p_store_id,
--           p_client_transaction_id,
--           'changed_price',
--           jsonb_build_object(
--             'item_id', v_item.item_id,
--             'item_name', v_item_rec.name,
--             'queued_price', v_item.unit_price,
--             'current_price', v_item_rec.price,
--             'requires_manager_review', true
--           ),
--           true
--         );
--         RETURN jsonb_build_object(
--           'sync_status', 'conflict',
--           'conflict_type', 'changed_price',
--           'manager_review_required', true,
--           'auto_resolved', false,
--           'message', format('Price increased for %s. Manager review required.', v_item_rec.name)
--         );
--       END IF;
--     END IF;
--   END LOOP;

--   INSERT INTO public.sales (
--     store_id, cashier_id, session_id, status, notes, client_transaction_id
--   )
--   VALUES (
--     p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id
--   )
--   RETURNING id, sale_number INTO v_sale_id, v_sale_number;

--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_items) AS x(
--       item_id uuid,
--       qty integer,
--       unit_price numeric,
--       cost numeric,
--       discount numeric
--     )
--   LOOP
--     SELECT i.name, i.price, i.cost INTO v_item_rec
--     FROM public.items i
--     WHERE i.id = v_item.item_id;

--     DECLARE
--       v_effective_price numeric(12,2);
--       v_line_total numeric(12,2);
--     BEGIN
--       -- Safe auto-resolution rule:
--       -- If current price decreased, use the lower server-side price automatically.
--       v_effective_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_item_rec.price, 0));
--       v_line_total := ROUND((v_effective_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
--       v_subtotal := v_subtotal + v_line_total;

--       INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, cost, discount, line_total)
--       VALUES (
--         v_sale_id,
--         v_item.item_id,
--         v_item.qty,
--         v_effective_price,
--         COALESCE(v_item.cost, v_item_rec.cost, 0),
--         COALESCE(v_item.discount, 0),
--         v_line_total
--       );
--     END;

--     PERFORM public.adjust_stock(
--       p_store_id,
--       v_item.item_id,
--       -v_item.qty,
--       'sale',
--       'Sale: ' || v_sale_number,
--       v_user_id
--     );
--   END LOOP;

--   v_total := ROUND(v_subtotal - COALESCE(p_discount, 0), 2);
--   IF v_total < 0 THEN
--     v_total := 0;
--   END IF;

--   FOR v_payment IN
--     SELECT * FROM jsonb_to_recordset(p_payments) AS x(
--       payment_method_id uuid,
--       amount numeric,
--       reference text
--     )
--   LOOP
--     v_tendered := v_tendered + v_payment.amount;
--     INSERT INTO public.sale_payments (sale_id, payment_method_id, amount, reference)
--     VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
--   END LOOP;

--   v_change := ROUND(v_tendered - v_total, 2);
--   IF v_change < 0 THEN
--     RAISE EXCEPTION 'Payment insufficient. Total: %, Tendered: %', v_total, v_tendered;
--   END IF;

--   UPDATE public.sales
--   SET subtotal = v_subtotal,
--       discount_amount = COALESCE(p_discount, 0),
--       total_amount = v_total,
--       amount_tendered = v_tendered,
--       change_due = v_change
--   WHERE id = v_sale_id;

--   IF p_session_id IS NOT NULL THEN
--     UPDATE public.pos_sessions
--     SET total_sales = total_sales + v_total
--     WHERE id = p_session_id;
--   END IF;

--   RETURN jsonb_build_object(
--     'sync_status', 'synced',
--     'duplicate_detected', false,
--     'sale_id', v_sale_id,
--     'sale_number', v_sale_number,
--     'subtotal', v_subtotal,
--     'discount', COALESCE(p_discount, 0),
--     'total_amount', v_total,
--     'tendered', v_tendered,
--     'change_due', v_change
--   );
-- END;
-- $$;

DO $$
BEGIN
  IF to_regprocedure('public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text) TO authenticated;
  END IF;
END $$;
