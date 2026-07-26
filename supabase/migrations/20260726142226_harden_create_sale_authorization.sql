-- Harden the canonical sale transaction boundary.
--
-- Compatibility:
--   mobile items:  {item_id, qty, unit_price, cost, discount}
--   admin items:   {item_id, quantity, unit_price}
--   mobile payment:{payment_method_id, amount, reference}
--   admin payment: {account_id, amount, party_id}
--
-- The admin field named account_id currently contains a payment_methods.id.
-- Both caller shapes are normalized here, but all authoritative values and
-- authorization decisions come from the database.

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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_existing record;
  v_user record;
  v_store_tenant_id uuid;
  v_session record;
  v_item jsonb;
  v_payment jsonb;
  v_live record;
  v_payment_method record;
  v_override_row record;
  v_sale_id uuid;
  v_sale_number text;
  v_item_id uuid;
  v_payment_method_id uuid;
  v_qty integer;
  v_requested_price numeric(12,2);
  v_line_discount numeric(12,2);
  v_payment_amount numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tendered numeric(12,2) := 0;
  v_change numeric(12,2) := 0;
  v_status text := 'SUCCESS';
  v_override_required boolean := false;
  v_is_service_role boolean := false;
  v_override_user_id uuid;
  v_adjustments jsonb := '[]'::jsonb;
  v_partial jsonb := '[]'::jsonb;
  v_stock_delta jsonb := '[]'::jsonb;
BEGIN
  -- Authentication and staff authorization.
  v_is_service_role := COALESCE((SELECT auth.jwt()->>'role'), '') = 'service_role';

  IF v_is_service_role THEN
    -- Trusted Edge Functions use the service role after independently verifying
    -- the user JWT. Preserve that path, but still load a real staff profile.
    SELECT u.id, u.role, u.tenant_id, u.store_id
      INTO v_user
    FROM public.users u
    WHERE u.id = p_cashier_id
    LIMIT 1;
  ELSE
    SELECT u.id, u.role, u.tenant_id, u.store_id
      INTO v_user
    FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid())
    LIMIT 1;
  END IF;

  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'not_authenticated',
      'message', 'Not authenticated'
    );
  END IF;

  IF v_user.role NOT IN ('admin', 'manager', 'cashier') THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'role_not_authorized',
      'message', 'Role is not authorized to create sales'
    );
  END IF;

  IF p_cashier_id IS DISTINCT FROM v_user.id THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'cashier_mismatch',
      'message', 'Cashier must match the authenticated user'
    );
  END IF;

  SELECT s.tenant_id
    INTO v_store_tenant_id
  FROM public.stores s
  WHERE s.id = p_store_id;

  IF v_store_tenant_id IS NULL
     OR v_user.tenant_id IS NULL
     OR v_store_tenant_id IS DISTINCT FROM v_user.tenant_id
     OR (v_user.role = 'cashier' AND v_user.store_id IS DISTINCT FROM p_store_id)
  THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'store_not_authorized',
      'message', 'Store is outside the authenticated user scope'
    );
  END IF;

  IF p_session_id IS NOT NULL THEN
    SELECT ps.store_id, ps.cashier_id, ps.status::text AS status
      INTO v_session
    FROM public.pos_sessions ps
    WHERE ps.id = p_session_id;

    IF v_session.store_id IS DISTINCT FROM p_store_id
       OR v_session.cashier_id IS DISTINCT FROM v_user.id
       OR v_session.status IS DISTINCT FROM 'open'
    THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'session_not_authorized',
        'message', 'Session must be open and belong to this cashier and store'
      );
    END IF;
  END IF;

  -- Request-shape and idempotency validation.
  IF p_client_transaction_id IS NULL
     OR btrim(p_client_transaction_id) = ''
     OR length(p_client_transaction_id) > 100
  THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'client_transaction_id_invalid',
      'message', 'client_transaction_id is required and must be at most 100 characters'
    );
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 100
  THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'items_invalid',
      'message', 'Sale must contain between 1 and 100 items'
    );
  END IF;

  IF jsonb_typeof(p_payments) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payments) = 0
     OR jsonb_array_length(p_payments) > 10
  THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'payments_invalid',
      'message', 'Sale must contain between 1 and 10 payments'
    );
  END IF;

  IF COALESCE(p_discount, 0) < 0 THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'discount_invalid',
      'message', 'Sale discount cannot be negative'
    );
  END IF;

  -- Serialize equal idempotency keys before checking/inserting. The existing
  -- unique index remains the final guard; this lock makes concurrent replays
  -- return the canonical sale instead of surfacing a unique violation.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_store_id::text || ':' || p_client_transaction_id, 0)
  );

  SELECT s.id, s.sale_number, s.subtotal, s.discount_amount,
         s.total_amount, s.amount_tendered, s.change_due,
         s.ledger_batch_id, s.cashier_id
    INTO v_existing
  FROM public.sales s
  WHERE s.store_id = p_store_id
    AND s.client_transaction_id = p_client_transaction_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.cashier_id IS DISTINCT FROM v_user.id THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'idempotency_scope_mismatch',
        'message', 'client_transaction_id is already used by another cashier'
      );
    END IF;

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

  -- Reject duplicate item identifiers. Without aggregation, duplicates could
  -- pass independent stock checks against the same pre-sale quantity.
  IF (
    SELECT count(*)
    FROM jsonb_array_elements(p_items) AS e(value)
  ) IS DISTINCT FROM (
    SELECT count(DISTINCT (e.value->>'item_id')::uuid)
    FROM jsonb_array_elements(p_items) AS e(value)
  ) THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'duplicate_items',
      'message', 'Each item may appear only once'
    );
  END IF;

  -- Validate and lock stock rows in deterministic order. Locks remain held
  -- through the later mutations, closing the check-then-decrement race.
  FOR v_item IN
    SELECT e.value
    FROM jsonb_array_elements(p_items) AS e(value)
    ORDER BY (e.value->>'item_id')::uuid
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR NULLIF(v_item->>'item_id', '') IS NULL
       OR COALESCE(NULLIF(v_item->>'qty', ''), NULLIF(v_item->>'quantity', '')) IS NULL
       OR NULLIF(v_item->>'unit_price', '') IS NULL
    THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'item_shape_invalid',
        'message', 'Each item requires item_id, qty or quantity, and unit_price'
      );
    END IF;

    v_item_id := (v_item->>'item_id')::uuid;
    v_qty := COALESCE((v_item->>'qty')::integer, (v_item->>'quantity')::integer);
    v_requested_price := (v_item->>'unit_price')::numeric;
    v_line_discount := COALESCE((v_item->>'discount')::numeric, 0);

    IF v_qty <= 0
       OR v_requested_price < 0
       OR v_line_discount < 0
    THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'item_values_invalid',
        'message', 'Quantity must be positive and prices/discounts cannot be negative'
      );
    END IF;

    SELECT i.id, i.name, i.price, i.cost, i.is_active,
           COALESCE(sl.qty, 0) AS stock_qty
      INTO v_live
    FROM public.items i
    JOIN public.stock_levels sl
      ON sl.item_id = i.id
     AND sl.store_id = p_store_id
    WHERE i.id = v_item_id
      AND i.tenant_id = v_user.tenant_id
    FOR UPDATE OF sl;

    IF v_live.id IS NULL OR v_live.is_active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'item_not_authorized',
        'message', 'Item is unavailable for this store and tenant'
      );
    END IF;

    IF v_live.price IS NULL
       OR v_live.price < 0
       OR v_line_discount > v_live.price
    THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'authoritative_price_invalid',
        'message', 'Authoritative item price or discount is invalid'
      );
    END IF;

    IF round(v_requested_price, 2) < round(v_live.price, 2) THEN
      v_override_required := true;
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item_id,
        'type', 'price_increase',
        'snapshot_price', v_requested_price,
        'server_price', v_live.price
      );
    ELSIF round(v_requested_price, 2) > round(v_live.price, 2) THEN
      v_status := 'ADJUSTED';
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item_id,
        'type', 'price_decrease_auto_adjust',
        'snapshot_price', v_requested_price,
        'applied_price', v_live.price
      );
    END IF;

    IF v_line_discount > 0 THEN
      v_override_required := true;
    END IF;

    IF v_live.stock_qty < v_qty THEN
      IF upper(COALESCE(p_fulfillment_policy, 'STRICT')) = 'PARTIAL_ALLOWED' THEN
        v_partial := v_partial || jsonb_build_object(
          'item_id', v_item_id,
          'requested_qty', v_qty,
          'fulfilled_qty', greatest(v_live.stock_qty, 0),
          'backordered_qty', greatest(v_qty - v_live.stock_qty, 0),
          'remaining_stock', 0
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

    v_line_total := round((v_live.price - v_line_discount) * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;
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

  IF COALESCE(p_discount, 0) > v_subtotal THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'discount_exceeds_subtotal',
      'message', 'Sale discount cannot exceed the authoritative subtotal'
    );
  END IF;

  IF COALESCE(p_discount, 0) > 0 THEN
    v_override_required := true;
  END IF;

  v_total := round(v_subtotal - COALESCE(p_discount, 0), 2);

  IF v_total < 0 OR v_total > 1000000 THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'total_out_of_range',
      'message', 'Authoritative sale total is out of range'
    );
  END IF;

  -- Validate every payment before creating any transaction rows or moving
  -- stock. account_id is accepted as the admin caller's legacy alias.
  FOR v_payment IN
    SELECT e.value
    FROM jsonb_array_elements(p_payments) AS e(value)
  LOOP
    IF jsonb_typeof(v_payment) IS DISTINCT FROM 'object'
       OR COALESCE(
            NULLIF(v_payment->>'payment_method_id', ''),
            NULLIF(v_payment->>'account_id', '')
          ) IS NULL
       OR NULLIF(v_payment->>'amount', '') IS NULL
    THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'payment_shape_invalid',
        'message', 'Each payment requires a payment method and amount'
      );
    END IF;

    v_payment_method_id := COALESCE(
      (v_payment->>'payment_method_id')::uuid,
      (v_payment->>'account_id')::uuid
    );
    v_payment_amount := (v_payment->>'amount')::numeric;

    IF v_payment_amount <= 0 THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'payment_amount_invalid',
        'message', 'Payment amounts must be positive'
      );
    END IF;

    SELECT pm.id
      INTO v_payment_method
    FROM public.payment_methods pm
    WHERE pm.id = v_payment_method_id
      AND pm.store_id = p_store_id
      AND pm.is_active = true;

    IF v_payment_method.id IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'payment_method_not_authorized',
        'message', 'Payment method is inactive or belongs to another store'
      );
    END IF;

    v_tendered := v_tendered + v_payment_amount;
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

  -- Manager authorization is required for any below-server price or discount.
  IF v_override_required THEN
    IF p_override_token IS NULL OR btrim(p_override_token) = '' THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'override_token_required',
        'message', 'Manager override token required for discounts or price overrides',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    SELECT t.*, issuer.id AS issuer_user_id
      INTO v_override_row
    FROM public.pos_override_tokens t
    JOIN public.users issuer
      ON issuer.id = t.issued_by
     AND issuer.role IN ('admin', 'manager')
     AND issuer.tenant_id = v_user.tenant_id
    WHERE t.store_id = p_store_id
      AND t.token_hash = encode(digest(p_override_token, 'sha256'), 'hex')
      AND t.used_at IS NULL
      AND t.expires_at > now()
    LIMIT 1
    FOR UPDATE OF t;

    IF v_override_row.id IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'invalid_override_token',
        'message', 'Invalid or expired manager override token',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    v_override_user_id := v_override_row.issuer_user_id;

    UPDATE public.pos_override_tokens
    SET used_at = now(),
        used_by = v_user.id
    WHERE id = v_override_row.id;
  END IF;

  -- All validation has completed. Mutations below are atomic.
  INSERT INTO public.sales (
    store_id, cashier_id, session_id, status, notes, client_transaction_id,
    accounting_posting_status
  ) VALUES (
    p_store_id, v_user.id, p_session_id, 'completed', p_notes,
    p_client_transaction_id, 'PENDING_POSTING'
  )
  RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT e.value
    FROM jsonb_array_elements(p_items) AS e(value)
    ORDER BY (e.value->>'item_id')::uuid
  LOOP
    v_item_id := (v_item->>'item_id')::uuid;
    v_qty := COALESCE((v_item->>'qty')::integer, (v_item->>'quantity')::integer);
    v_line_discount := COALESCE((v_item->>'discount')::numeric, 0);

    SELECT i.price, i.cost
      INTO v_live
    FROM public.items i
    WHERE i.id = v_item_id
      AND i.tenant_id = v_user.tenant_id;

    v_line_total := round((v_live.price - v_line_discount) * v_qty, 2);

    INSERT INTO public.sale_items (
      sale_id, item_id, qty, price, cost, line_total
    ) VALUES (
      v_sale_id,
      v_item_id,
      v_qty,
      v_live.price - v_line_discount,
      COALESCE(v_live.cost, 0),
      v_line_total
    );

    PERFORM public.adjust_stock(
      p_store_id,
      v_item_id,
      -v_qty,
      'sale',
      'Sale: ' || v_sale_number,
      v_user.id
    );

    v_stock_delta := v_stock_delta || jsonb_build_object(
      'item_id', v_item_id,
      'delta_qty', -v_qty
    );
  END LOOP;

  FOR v_payment IN
    SELECT e.value
    FROM jsonb_array_elements(p_payments) AS e(value)
  LOOP
    v_payment_method_id := COALESCE(
      (v_payment->>'payment_method_id')::uuid,
      (v_payment->>'account_id')::uuid
    );
    v_payment_amount := (v_payment->>'amount')::numeric;

    INSERT INTO public.sale_payments(
      sale_id, payment_method_id, amount, reference
    ) VALUES (
      v_sale_id,
      v_payment_method_id,
      v_payment_amount,
      NULLIF(v_payment->>'reference', '')
    );
  END LOOP;

  v_change := greatest(round(v_tendered - v_total, 2), 0);

  UPDATE public.sales
  SET subtotal = v_subtotal,
      fulfilled_subtotal = v_subtotal,
      backordered_subtotal = 0,
      discount_amount = COALESCE(p_discount, 0),
      total_amount = v_total,
      amount_tendered = v_tendered,
      change_due = v_change
  WHERE id = v_sale_id;

  INSERT INTO public.sale_audit_log (
    sale_id, client_transaction_id, store_id, operator_user_id, status,
    before_state, after_state, override_used, override_user_id,
    override_reason, stock_delta
  ) VALUES (
    v_sale_id,
    p_client_transaction_id,
    p_store_id,
    v_user.id,
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
    v_override_user_id,
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

REVOKE ALL ON FUNCTION public.create_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric,
  text, text, jsonb, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric,
  text, text, jsonb, text, text, text
) TO authenticated, service_role;

-- Keep the canonical compatibility wrapper on the same hardened boundary.
CREATE OR REPLACE FUNCTION public.complete_sale(
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
BEGIN
  RETURN public.create_sale(
    p_store_id,
    p_cashier_id,
    p_session_id,
    p_items,
    p_payments,
    p_discount,
    p_client_transaction_id,
    p_notes,
    p_snapshot,
    p_fulfillment_policy,
    p_override_token,
    p_override_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric,
  text, text, jsonb, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_sale(
  uuid, uuid, uuid, jsonb, jsonb, numeric,
  text, text, jsonb, text, text, text
) TO authenticated, service_role;
