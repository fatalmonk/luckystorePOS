-- Centralize pricing authority in complete_sale.
-- Server is now the only source for MRP comparison, discount math, and savings.

DROP FUNCTION IF EXISTS public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb
);
DROP FUNCTION IF EXISTS public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text
);

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
--   p_transaction_trace_id text DEFAULT NULL,
--   p_notes text DEFAULT NULL,
--   p_snapshot jsonb DEFAULT NULL,
--   p_fulfillment_policy text DEFAULT 'STRICT',
--   p_override_token text DEFAULT NULL,
--   p_override_reason text DEFAULT NULL
-- )
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- DECLARE
--   v_existing record;
--   v_item record;
--   v_live_item record;
--   v_sale_id uuid;
--   v_sale_number text;
--   v_status text := 'SUCCESS';
--   v_subtotal numeric(12,2) := 0;
--   v_total numeric(12,2) := 0;
--   v_tendered numeric(12,2) := 0;
--   v_change numeric(12,2) := 0;
--   v_total_savings numeric(12,2) := 0;
--   v_adjustments jsonb := '[]'::jsonb;
--   v_partial_fulfillment jsonb := '[]'::jsonb;
--   v_pricing_results jsonb := '[]'::jsonb;
--   v_conflict_reason text;
--   v_applied_price numeric(12,2);
--   v_mrp numeric(12,2);
--   v_unit_discount numeric(12,2);
--   v_line_savings numeric(12,2);
-- BEGIN
--   IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
--     RETURN jsonb_build_object(
--       'status', 'REJECTED',
--       'conflict_reason', 'client_transaction_id_required',
--       'message', 'client_transaction_id is required',
--       'transaction_trace_id', p_transaction_trace_id,
--       'pricing_results', '[]'::jsonb,
--       'total_savings', 0
--     );
--   END IF;

--   SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due
--     INTO v_existing
--   FROM public.sales
--   WHERE store_id = p_store_id
--     AND client_transaction_id = p_client_transaction_id
--   LIMIT 1;

--   IF v_existing.id IS NOT NULL THEN
--     SELECT
--       COALESCE(
--         jsonb_agg(
--           jsonb_build_object(
--             'item_id', si.item_id,
--             'qty', si.qty,
--             'mrp', COALESCE(i.mrp, i.price, si.unit_price),
--             'selling_price', si.unit_price,
--             'unit_discount', GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0),
--             'total_savings', GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0) * si.qty
--           )
--         ),
--         '[]'::jsonb
--       ),
--       COALESCE(
--         SUM(GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0) * si.qty),
--         0
--       )
--     INTO v_pricing_results, v_total_savings
--     FROM public.sale_items si
--     LEFT JOIN public.items i ON i.id = si.item_id
--     WHERE si.sale_id = v_existing.id;

--     RETURN jsonb_build_object(
--       'status', 'SUCCESS',
--       'duplicate_detected', true,
--       'transaction_trace_id', p_transaction_trace_id,
--       'sale_id', v_existing.id,
--       'sale_number', v_existing.sale_number,
--       'subtotal', COALESCE(v_existing.subtotal, 0),
--       'discount', COALESCE(v_existing.discount_amount, 0),
--       'total_amount', COALESCE(v_existing.total_amount, 0),
--       'tendered', COALESCE(v_existing.amount_tendered, 0),
--       'change_due', COALESCE(v_existing.change_due, 0),
--       'adjustments', '[]'::jsonb,
--       'partial_fulfillment', '[]'::jsonb,
--       'conflict_reason', null,
--       'pricing_results', v_pricing_results,
--       'total_savings', v_total_savings
--     );
--   END IF;

--   IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
--     RETURN jsonb_build_object(
--       'status', 'REJECTED',
--       'conflict_reason', 'empty_sale',
--       'message', 'Sale must have at least one item',
--       'transaction_trace_id', p_transaction_trace_id,
--       'pricing_results', '[]'::jsonb,
--       'total_savings', 0
--     );
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
--     SELECT
--       i.id,
--       i.name,
--       i.active,
--       i.price,
--       COALESCE(i.mrp, i.price) AS mrp,
--       COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
--     INTO v_live_item
--     FROM public.items i
--     LEFT JOIN public.stock_levels sl
--       ON sl.item_id = i.id AND sl.store_id = p_store_id
--     WHERE i.id = v_item.item_id;

--     IF v_live_item.id IS NULL OR v_live_item.active IS DISTINCT FROM true THEN
--       RETURN jsonb_build_object(
--         'status', 'CONFLICT',
--         'conflict_reason', 'deleted_or_inactive_product',
--         'message', 'One or more products are deleted/inactive',
--         'transaction_trace_id', p_transaction_trace_id,
--         'pricing_results', '[]'::jsonb,
--         'total_savings', 0
--       );
--     END IF;

--     IF v_live_item.qty_on_hand < COALESCE(v_item.qty, 0) THEN
--       RETURN jsonb_build_object(
--         'status', 'CONFLICT',
--         'conflict_reason', 'insufficient_stock',
--         'message', format('Insufficient stock for %s', v_live_item.name),
--         'transaction_trace_id', p_transaction_trace_id,
--         'pricing_results', '[]'::jsonb,
--         'total_savings', 0
--       );
--     END IF;

--     IF ROUND(COALESCE(v_item.unit_price, 0), 2) < ROUND(COALESCE(v_live_item.price, 0), 2)
--        AND COALESCE(upper(p_fulfillment_policy), 'STRICT') = 'STRICT'
--        AND p_override_token IS NULL THEN
--       RETURN jsonb_build_object(
--         'status', 'CONFLICT',
--         'conflict_reason', 'price_increase_requires_manager',
--         'message', format('Price increased for %s', v_live_item.name),
--         'transaction_trace_id', p_transaction_trace_id,
--         'pricing_results', '[]'::jsonb,
--         'total_savings', 0
--       );
--     END IF;
--   END LOOP;

--   INSERT INTO public.sales (
--     store_id, cashier_id, session_id, status, notes, client_transaction_id
--   ) VALUES (
--     p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id
--   ) RETURNING id, sale_number INTO v_sale_id, v_sale_number;

--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_items) AS x(
--       item_id uuid,
--       qty integer,
--       unit_price numeric,
--       cost numeric,
--       discount numeric
--     )
--   LOOP
--     SELECT
--       i.price,
--       COALESCE(i.mrp, i.price) AS mrp
--     INTO v_live_item
--     FROM public.items i
--     WHERE i.id = v_item.item_id;

--     v_applied_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_live_item.price, 0));
--     v_mrp := COALESCE(v_live_item.mrp, v_applied_price);
--     v_unit_discount := GREATEST(v_mrp - v_applied_price, 0);
--     v_line_savings := ROUND(v_unit_discount * COALESCE(v_item.qty, 0), 2);

--     IF ROUND(COALESCE(v_item.unit_price, 0), 2) > ROUND(COALESCE(v_live_item.price, 0), 2) THEN
--       v_status := 'ADJUSTED';
--       v_adjustments := v_adjustments || jsonb_build_object(
--         'item_id', v_item.item_id,
--         'type', 'price_down_auto_adjust',
--         'snapshot_price', v_item.unit_price,
--         'applied_price', v_applied_price
--       );
--     END IF;

--     INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, cost, discount, line_total)
--     VALUES (
--       v_sale_id,
--       v_item.item_id,
--       v_item.qty,
--       v_applied_price,
--       COALESCE(v_item.cost, 0),
--       COALESCE(v_item.discount, 0),
--       ROUND((v_applied_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2)
--     );

--     v_subtotal := v_subtotal + ROUND((v_applied_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
--     v_total_savings := v_total_savings + v_line_savings;
--     v_pricing_results := v_pricing_results || jsonb_build_object(
--       'item_id', v_item.item_id,
--       'qty', v_item.qty,
--       'mrp', ROUND(v_mrp, 2),
--       'selling_price', ROUND(v_applied_price, 2),
--       'unit_discount', ROUND(v_unit_discount, 2),
--       'total_savings', ROUND(v_line_savings, 2)
--     );
--   END LOOP;

--   v_total := GREATEST(ROUND(v_subtotal - COALESCE(p_discount, 0), 2), 0);

--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_payments) AS x(
--       payment_method_id uuid,
--       amount numeric,
--       reference text
--     )
--   LOOP
--     v_tendered := v_tendered + COALESCE(v_item.amount, 0);
--     INSERT INTO public.sale_payments(sale_id, payment_method_id, amount, reference)
--     VALUES (v_sale_id, v_item.payment_method_id, v_item.amount, v_item.reference);
--   END LOOP;

--   v_change := GREATEST(ROUND(v_tendered - v_total, 2), 0);

--   UPDATE public.sales
--   SET subtotal = v_subtotal,
--       discount_amount = COALESCE(p_discount, 0),
--       total_amount = v_total,
--       amount_tendered = v_tendered,
--       change_due = v_change
--   WHERE id = v_sale_id;

--   RETURN jsonb_build_object(
--     'status', v_status,
--     'transaction_trace_id', p_transaction_trace_id,
--     'sale_id', v_sale_id,
--     'sale_number', v_sale_number,
--     'subtotal', v_subtotal,
--     'discount', COALESCE(p_discount, 0),
--     'total_amount', v_total,
--     'tendered', v_tendered,
--     'change_due', v_change,
--     'adjustments', v_adjustments,
--     'partial_fulfillment', v_partial_fulfillment,
--     'conflict_reason', v_conflict_reason,
--     'pricing_results', v_pricing_results,
--     'total_savings', ROUND(v_total_savings, 2)
--   );
-- END;
-- $$;

REVOKE ALL ON FUNCTION public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, text, jsonb, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, text, jsonb, text, text, text
) TO authenticated;
