-- Ledger posting engine + period close system.
-- Refactors financial posting to deterministic, idempotent functions.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS accounting_posting_status text NOT NULL DEFAULT 'PENDING_POSTING'
    CHECK (accounting_posting_status IN ('PENDING_POSTING', 'POSTED', 'FAILED_POSTING')),
  ADD COLUMN IF NOT EXISTS accounting_posting_error text,
  ADD COLUMN IF NOT EXISTS accounting_posted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, period_start, period_end),
  CHECK (period_end > period_start)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ap_select ON public.accounting_periods;
CREATE POLICY ap_select ON public.accounting_periods
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_sale_batch_unique
ON public.ledger_batches(source_type, source_id)
WHERE source_type = 'sale' AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_period_closed(
  p_store_id uuid,
  p_posted_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.store_id = p_store_id
      AND ap.status = 'CLOSED'
      AND p_posted_at::date >= ap.period_start
      AND p_posted_at::date < ap.period_end
  );
$$;

CREATE OR REPLACE FUNCTION public.create_sale(
  p_store_id uuid,
  p_cashier_id uuid,
  p_session_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_discount numeric DEFAULT 0,
  p_client_transaction_id text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_snapshot jsonb DEFAULT NULL,
  p_fulfillment_policy text DEFAULT 'STRICT',
  p_override_token text DEFAULT NULL,
  p_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing record;
  v_item record;
  v_live record;
  v_payment record;
  v_sale_id uuid;
  v_sale_number text;
  v_subtotal numeric(12,2) := 0;
  v_fulfilled_subtotal numeric(12,2) := 0;
  v_backordered_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tendered numeric(12,2) := 0;
  v_change numeric(12,2) := 0;
  v_status text := 'SUCCESS';
  v_adjustments jsonb := '[]'::jsonb;
  v_partial jsonb := '[]'::jsonb;
  v_user_id uuid;
  v_user_role text;
  v_override_row record;
  v_override_required boolean := false;
  v_stock_delta jsonb := '[]'::jsonb;
  v_fulfilled_qty integer;
  v_backordered_qty integer;
  v_line_price numeric(12,2);
  v_line_total numeric(12,2);
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Not authenticated');
  END IF;

  IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'client_transaction_id_required',
      'message', 'client_transaction_id is required',
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due, ledger_batch_id
    INTO v_existing
  FROM public.sales
  WHERE store_id = p_store_id
    AND client_transaction_id = p_client_transaction_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'sale_id', v_existing.id,
      'sale_number', v_existing.sale_number,
      'subtotal', COALESCE(v_existing.subtotal, 0),
      'discount', COALESCE(v_existing.discount_amount, 0),
      'total_amount', COALESCE(v_existing.total_amount, 0),
      'tendered', COALESCE(v_existing.amount_tendered, 0),
      'change_due', COALESCE(v_existing.change_due, 0),
      'ledger_batch_id', v_existing.ledger_batch_id,
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT i.id, i.name, i.active, i.price, COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
      INTO v_live
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.id = v_item.item_id;

    IF v_live.id IS NULL OR v_live.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'deleted_or_inactive_product',
        'message', 'Product deleted/inactive',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    IF ROUND(COALESCE(v_item.unit_price, 0), 2) < ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_override_required := true;
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_increase',
        'snapshot_price', v_item.unit_price,
        'server_price', v_live.price
      );
    ELSIF ROUND(COALESCE(v_item.unit_price, 0), 2) > ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_status := 'ADJUSTED';
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_decrease_auto_adjust',
        'snapshot_price', v_item.unit_price,
        'applied_price', v_live.price
      );
    END IF;

    IF COALESCE(v_live.qty_on_hand, 0) < COALESCE(v_item.qty, 0) THEN
      IF UPPER(COALESCE(p_fulfillment_policy, 'STRICT')) = 'PARTIAL_ALLOWED' THEN
        v_fulfilled_qty := GREATEST(COALESCE(v_live.qty_on_hand, 0), 0);
        v_backordered_qty := GREATEST(COALESCE(v_item.qty, 0) - v_fulfilled_qty, 0);
        v_partial := v_partial || jsonb_build_object(
          'item_id', v_item.item_id,
          'requested_qty', v_item.qty,
          'fulfilled_qty', v_fulfilled_qty,
          'backordered_qty', v_backordered_qty,
          'remaining_stock', GREATEST(COALESCE(v_live.qty_on_hand, 0) - v_fulfilled_qty, 0)
        );
      ELSE
        RETURN jsonb_build_object(
          'status', 'REJECTED',
          'conflict_reason', 'insufficient_stock_strict_policy',
          'message', format('Insufficient stock for %s', v_live.name),
          'adjustments', v_adjustments,
          'partial_fulfillment', v_partial
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_partial) > 0 THEN
    RETURN jsonb_build_object(
      'status', 'PARTIAL_FULFILLMENT',
      'conflict_reason', 'partial_fulfillment_required',
      'message', 'Server computed partial fulfillment proposal',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  IF v_override_required THEN
    IF p_override_token IS NULL OR btrim(p_override_token) = '' THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'override_token_required',
        'message', 'Manager override token required for price increase',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    SELECT *
      INTO v_override_row
    FROM public.pos_override_tokens t
    WHERE t.store_id = p_store_id
      AND t.token_hash = encode(digest(p_override_token, 'sha256'), 'hex')
      AND t.used_at IS NULL
      AND t.expires_at > now()
    LIMIT 1;

    IF v_override_row.id IS NULL OR v_user_role NOT IN ('admin', 'manager') THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'invalid_override_token',
        'message', 'Invalid or expired override token',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    UPDATE public.pos_override_tokens
    SET used_at = now(),
        used_by = v_user_id
    WHERE id = v_override_row.id;
  END IF;

  INSERT INTO public.sales (
    store_id, cashier_id, session_id, status, notes, client_transaction_id,
    accounting_posting_status
  ) VALUES (
    p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id,
    'PENDING_POSTING'
  ) RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT i.price INTO v_live
    FROM public.items i
    WHERE i.id = v_item.item_id;

    v_line_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_live.price, 0));
    v_line_total := ROUND((v_line_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_fulfilled_subtotal := v_fulfilled_subtotal + v_line_total;

    INSERT INTO public.sale_items (
      sale_id, item_id, qty, unit_price, cost, discount, line_total
    ) VALUES (
      v_sale_id,
      v_item.item_id,
      v_item.qty,
      v_line_price,
      COALESCE(v_item.cost, 0),
      COALESCE(v_item.discount, 0),
      v_line_total
    );

    PERFORM public.adjust_stock(
      p_store_id,
      v_item.item_id,
      -v_item.qty,
      'sale',
      'Sale: ' || v_sale_number,
      v_user_id
    );

    v_stock_delta := v_stock_delta || jsonb_build_object(
      'item_id', v_item.item_id,
      'delta_qty', -v_item.qty
    );
  END LOOP;

  v_total := GREATEST(ROUND(v_subtotal - COALESCE(p_discount, 0), 2), 0);

  FOR v_payment IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_payments, '[]'::jsonb)) AS x(
      payment_method_id uuid,
      amount numeric,
      reference text
    )
  LOOP
    v_tendered := v_tendered + COALESCE(v_payment.amount, 0);
    INSERT INTO public.sale_payments(sale_id, payment_method_id, amount, reference)
    VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
  END LOOP;

  IF v_tendered < v_total THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'payment_insufficient',
      'message', 'Payment insufficient',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  v_change := GREATEST(ROUND(v_tendered - v_total, 2), 0);
  UPDATE public.sales
  SET subtotal = v_subtotal,
      fulfilled_subtotal = v_fulfilled_subtotal,
      backordered_subtotal = v_backordered_subtotal,
      discount_amount = COALESCE(p_discount, 0),
      total_amount = v_total,
      amount_tendered = v_tendered,
      change_due = v_change
  WHERE id = v_sale_id;

  INSERT INTO public.sale_audit_log (
    sale_id,
    client_transaction_id,
    store_id,
    operator_user_id,
    status,
    before_state,
    after_state,
    override_used,
    override_user_id,
    override_reason,
    stock_delta
  ) VALUES (
    v_sale_id,
    p_client_transaction_id,
    p_store_id,
    v_user_id,
    v_status,
    jsonb_build_object('snapshot', COALESCE(p_snapshot, '{}'::jsonb)),
    jsonb_build_object(
      'sale_id', v_sale_id,
      'subtotal', v_subtotal,
      'discount', COALESCE(p_discount, 0),
      'total_amount', v_total,
      'tendered', v_tendered,
      'change_due', v_change,
      'accounting_posting_status', 'PENDING_POSTING'
    ),
    v_override_required,
    CASE WHEN v_override_required THEN v_user_id ELSE NULL END,
    p_override_reason,
    v_stock_delta
  );

  RETURN jsonb_build_object(
    'status', v_status,
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'total_amount', v_total,
    'tendered', v_tendered,
    'change_due', v_change,
    'accounting_posting_status', 'PENDING_POSTING',
    'adjustments', v_adjustments,
    'partial_fulfillment', v_partial,
    'conflict_reason', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.post_sale_to_ledger(
  p_sale_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale record;
  v_item record;
  v_payment record;
  v_batch_id uuid;
  v_revenue_account uuid;
  v_inventory_account uuid;
  v_cogs_account uuid;
  v_discount_account uuid;
  v_payment_account uuid;
  v_discount_absorption numeric(12,2) := 0;
  v_cogs_total numeric(12,2) := 0;
  v_gross_revenue numeric(12,2) := 0;
BEGIN
  SELECT * INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id
  FOR UPDATE;

  IF v_sale.id IS NULL THEN
    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Sale not found');
  END IF;

  IF v_sale.accounting_posting_status = 'POSTED' AND v_sale.ledger_batch_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_sale.ledger_batch_id
    );
  END IF;

  IF public.is_period_closed(v_sale.store_id, COALESCE(v_sale.created_at, now())) THEN
    UPDATE public.sales
    SET accounting_posting_status = 'FAILED_POSTING',
        accounting_posting_error = 'period_closed'
    WHERE id = v_sale.id;
    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Accounting period is closed');
  END IF;

  PERFORM public.ensure_sale_ledger_accounts(v_sale.store_id);

  SELECT id INTO v_batch_id
  FROM public.ledger_batches
  WHERE source_type = 'sale'
    AND source_id = v_sale.id
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    INSERT INTO public.ledger_batches (
      store_id, source_type, source_id, source_ref, status, override_used, risk_flag, risk_note, created_by
    )
    VALUES (
      v_sale.store_id,
      'sale',
      v_sale.id,
      v_sale.client_transaction_id,
      'POSTED',
      false,
      false,
      NULL,
      v_sale.cashier_id
    )
    RETURNING id INTO v_batch_id;
  END IF;

  DELETE FROM public.ledger_entries WHERE batch_id = v_batch_id;

  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '4000_SALES_REVENUE';
  SELECT id INTO v_inventory_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '1200_INVENTORY';
  SELECT id INTO v_cogs_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5000_COGS';
  SELECT id INTO v_discount_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5100_DISCOUNT_ABSORPTION';

  FOR v_item IN
    SELECT si.*, i.mrp
    FROM public.sale_items si
    JOIN public.items i ON i.id = si.item_id
    WHERE si.sale_id = v_sale.id
  LOOP
    v_discount_absorption := v_discount_absorption + GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty;
    v_cogs_total := v_cogs_total + (v_item.cost * v_item.qty);
    v_gross_revenue := v_gross_revenue + v_item.line_total + (GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty);
  END LOOP;

  FOR v_payment IN
    SELECT * FROM public.sale_payments WHERE sale_id = v_sale.id
  LOOP
    v_payment_account := public.resolve_payment_ledger_account(v_sale.store_id, v_payment.payment_method_id);
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id,
      v_payment_account,
      v_sale.id,
      'payment',
      ROUND(v_payment.amount, 2),
      0,
      jsonb_build_object('payment_method_id', v_payment.payment_method_id, 'reference', v_payment.reference)
    );
  END LOOP;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_revenue_account, v_sale.id, 'gross_revenue', 0, ROUND(v_gross_revenue, 2),
    jsonb_build_object('recognized_from_fulfilled_qty_only', true)
  );

  IF ROUND(v_discount_absorption, 2) > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id, v_discount_account, v_sale.id, 'discount_absorption', ROUND(v_discount_absorption, 2), 0,
      jsonb_build_object('basis', 'mrp_minus_selling_price')
    );
  END IF;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_cogs_account, v_sale.id, 'cogs', ROUND(v_cogs_total, 2), 0,
    jsonb_build_object('source', 'sale_items.cost')
  );

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_inventory_account, v_sale.id, 'inventory_reduction', 0, ROUND(v_cogs_total, 2),
    jsonb_build_object('source', 'sale_items.cost')
  );

  UPDATE public.sales
  SET ledger_batch_id = v_batch_id,
      accounting_posting_status = 'POSTED',
      accounting_posted_at = now(),
      accounting_posting_error = NULL
  WHERE id = v_sale.id;

  RETURN jsonb_build_object(
    'status', 'POSTED',
    'sale_id', v_sale.id,
    'ledger_batch_id', v_batch_id
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.sales
  SET accounting_posting_status = 'FAILED_POSTING',
      accounting_posting_error = SQLERRM
  WHERE id = p_sale_id;
  RETURN jsonb_build_object(
    'status', 'FAILED_POSTING',
    'sale_id', p_sale_id,
    'message', SQLERRM
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pending_ledger_postings(
  p_store_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale record;
  v_result jsonb;
  v_processed integer := 0;
  v_failed integer := 0;
BEGIN
  FOR v_sale IN
    SELECT s.id
    FROM public.sales s
    WHERE s.accounting_posting_status = 'PENDING_POSTING'
      AND (p_store_id IS NULL OR s.store_id = p_store_id)
    ORDER BY s.created_at
    LIMIT GREATEST(1, p_limit)
  LOOP
    v_result := public.post_sale_to_ledger(v_sale.id);
    v_processed := v_processed + 1;
    IF (v_result->>'status') = 'FAILED_POSTING' THEN
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'failed', v_failed
  );
END;
$$;

-- canonical definition in 20260426213841_domain_rpcs_trust_engine.sql
DROP FUNCTION IF EXISTS public.complete_sale();
-- (previous definition commented out to avoid migration conflicts)
-- CREATE OR REPLACE FUNCTION public.complete_sale(
--   p_store_id uuid,
--   p_cashier_id uuid,
--   p_session_id uuid DEFAULT NULL,
--   p_items jsonb DEFAULT '[]'::jsonb,
--   p_payments jsonb DEFAULT '[]'::jsonb,
--   p_discount numeric DEFAULT 0,
--   p_client_transaction_id text DEFAULT NULL,
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
-- BEGIN
--   -- Backward-compatible wrapper: execution only, posting is async/deterministic via post_sale_to_ledger.
--   RETURN public.create_sale(
--     p_store_id,
--     p_cashier_id,
--     p_session_id,
--     p_items,
--     p_payments,
--     p_discount,
--     p_client_transaction_id,
--     p_notes,
--     p_snapshot,
--     p_fulfillment_policy,
--     p_override_token,
--     p_override_reason
--   );
-- END;
-- $$;

CREATE OR REPLACE FUNCTION public.validate_trial_balance(
  p_store_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_debits numeric(14,2) := 0;
  v_credits numeric(14,2) := 0;
BEGIN
  SELECT COALESCE(SUM(le.debit), 0), COALESCE(SUM(le.credit), 0)
  INTO v_debits, v_credits
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at::date >= p_period_start
    AND lb.posted_at::date < p_period_end
    AND lb.status = 'POSTED';

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_debits', ROUND(v_debits, 2),
    'total_credits', ROUND(v_credits, 2),
    'is_balanced', ROUND(v_debits, 2) = ROUND(v_credits, 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_accounting_period(
  p_store_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user record;
  v_tb jsonb;
BEGIN
  SELECT id, role INTO v_user
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user.id IS NULL OR v_user.role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Manager/Admin required');
  END IF;

  v_tb := public.validate_trial_balance(p_store_id, p_period_start, p_period_end);
  IF COALESCE((v_tb->>'is_balanced')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Trial balance mismatch; cannot close period',
      'trial_balance', v_tb
    );
  END IF;

  INSERT INTO public.accounting_periods(
    store_id, period_start, period_end, status, closed_at, closed_by
  )
  VALUES (
    p_store_id, p_period_start, p_period_end, 'CLOSED', now(), v_user.id
  )
  ON CONFLICT (store_id, period_start, period_end)
  DO UPDATE SET
    status = 'CLOSED',
    closed_at = EXCLUDED.closed_at,
    closed_by = EXCLUDED.closed_by;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'trial_balance', v_tb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_sale_ledger_chain(
  p_sale_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale jsonb;
  v_items jsonb;
  v_payments jsonb;
  v_audit jsonb;
  v_batch jsonb;
  v_entries jsonb;
BEGIN
  SELECT to_jsonb(s.*) INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id;

  IF v_sale IS NULL THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND', 'message', 'Sale not found');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(si.*) ORDER BY si.id), '[]'::jsonb) INTO v_items
  FROM public.sale_items si
  WHERE si.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sp.*) ORDER BY sp.id), '[]'::jsonb) INTO v_payments
  FROM public.sale_payments sp
  WHERE sp.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sa.*) ORDER BY sa.created_at), '[]'::jsonb) INTO v_audit
  FROM public.sale_audit_log sa
  WHERE sa.sale_id = p_sale_id;

  SELECT to_jsonb(lb.*) INTO v_batch
  FROM public.ledger_batches lb
  WHERE lb.source_type = 'sale'
    AND lb.source_id = p_sale_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(le.*) ORDER BY le.id), '[]'::jsonb) INTO v_entries
  FROM public.ledger_entries le
  WHERE le.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'sale', v_sale,
    'sale_items', v_items,
    'sale_payments', v_payments,
    'sale_audit_log', v_audit,
    'ledger_batch', v_batch,
    'ledger_entries', v_entries
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.post_sale_to_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_sale_to_ledger(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.process_pending_ledger_postings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_pending_ledger_postings(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_trial_balance(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_trial_balance(uuid, date, date) TO authenticated;

REVOKE ALL ON FUNCTION public.close_accounting_period(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(uuid, date, date) TO authenticated;

REVOKE ALL ON FUNCTION public.replay_sale_ledger_chain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replay_sale_ledger_chain(uuid) TO authenticated;
