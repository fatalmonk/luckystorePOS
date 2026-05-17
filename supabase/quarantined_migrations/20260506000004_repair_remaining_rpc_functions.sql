-- Repair remaining missing RPC functions
-- Adapts definitions to match actual remote schema

-- =============================================================================
-- Prerequisites: Add missing tables and columns
-- =============================================================================

-- users: add last_login_at
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON public.users (last_login_at DESC);

-- stock_movements: add missing columns
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS quantity_change integer;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS weighted_average_cost numeric(15,4);
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_id uuid;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill: quantity_change from delta where null
UPDATE public.stock_movements SET quantity_change = delta WHERE quantity_change IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON public.stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements (reference_type, reference_id);

-- purchase_receipts: create if not exists
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL REFERENCES public.stores(id),
    supplier_id uuid REFERENCES public.parties(id),
    invoice_number text,
    invoice_total numeric(15,4) DEFAULT 0,
    amount_paid numeric(15,4) DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
    notes text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_tenant ON public.purchase_receipts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_store ON public.purchase_receipts (store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_supplier ON public.purchase_receipts (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_status ON public.purchase_receipts (status);

-- purchase_receipt_items: create if not exists
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id),
    quantity numeric(15,4) NOT NULL,
    unit_cost numeric(15,4) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt ON public.purchase_receipt_items (receipt_id);

-- stock_ledger: create if not exists
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    previous_quantity integer NOT NULL DEFAULT 0,
    new_quantity integer NOT NULL DEFAULT 0,
    quantity_change integer NOT NULL CHECK (quantity_change != 0),
    transaction_type text NOT NULL,
    reason text NOT NULL,
    movement_id uuid UNIQUE,
    performed_by uuid REFERENCES public.users(id),
    reference_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_store_id ON public.stock_ledger (store_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_id ON public.stock_ledger (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_store_product_date ON public.stock_ledger (store_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_transaction_type ON public.stock_ledger (transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_movement_id ON public.stock_ledger (movement_id) WHERE movement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON public.stock_ledger (created_at DESC);

ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_ledger_read_authenticated" ON public.stock_ledger;
CREATE POLICY "stock_ledger_read_authenticated"
  ON public.stock_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.tenant_id IN (SELECT tenant_id FROM public.stores WHERE id = stock_ledger.store_id)));

DROP POLICY IF EXISTS "stock_ledger_insert_authenticated" ON public.stock_ledger;
CREATE POLICY "stock_ledger_insert_authenticated"
  ON public.stock_ledger FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'manager') AND u.tenant_id IN (SELECT tenant_id FROM public.stores WHERE id = stock_ledger.store_id)));

-- =============================================================================
-- 1) Helper: get_current_user_tenant_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;

-- =============================================================================
-- 2) Helper: get_current_user_store_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT store_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_store_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_store_id() TO authenticated;

-- =============================================================================
-- 3) Settings: get_payment_methods
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_payment_methods(p_store_id uuid)
RETURNS SETOF public.payment_methods
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.payment_methods WHERE store_id = p_store_id ORDER BY sort_order ASC;
$$;

REVOKE ALL ON FUNCTION public.get_payment_methods(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_methods(uuid) TO authenticated;

-- =============================================================================
-- 4) Settings: get_receipt_config_simple
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_receipt_config_simple(p_store_id uuid)
RETURNS public.receipt_config
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.receipt_config WHERE store_id = p_store_id;
$$;

REVOKE ALL ON FUNCTION public.get_receipt_config_simple(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_receipt_config_simple(uuid) TO authenticated;

-- =============================================================================
-- 5) Settings: update_receipt_config_simple
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_receipt_config_simple(
  p_store_id uuid,
  p_store_name text,
  p_header_text text,
  p_footer_text text
)
RETURNS public.receipt_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.receipt_config (store_id, store_name, header_text, footer_text)
  VALUES (p_store_id, p_store_name, p_header_text, p_footer_text)
  ON CONFLICT (store_id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    header_text = EXCLUDED.header_text,
    footer_text = EXCLUDED.footer_text;

  RETURN (SELECT * FROM public.receipt_config WHERE store_id = p_store_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_receipt_config_simple(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_receipt_config_simple(uuid, text, text, text) TO authenticated;

-- =============================================================================
-- 6) Settings: get_store_users
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_store_users(p_store_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  email text,
  last_login timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT id, full_name, role, email, last_login_at
  FROM public.users
  WHERE store_id = p_store_id OR role = 'admin'
  ORDER BY role ASC, full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_store_users(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_users(uuid) TO authenticated;

-- =============================================================================
-- 7) Sales: get_sales_history
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_sales_history(
  p_store_id uuid,
  p_search_query text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  sale_number text,
  total_amount numeric,
  status text,
  cashier_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sale_number,
    s.total_amount,
    s.status::text,
    u.full_name as cashier_name,
    s.created_at
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  WHERE s.store_id = p_store_id
    AND (p_search_query IS NULL OR s.sale_number ILIKE '%' || p_search_query || '%')
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) TO authenticated;

-- =============================================================================
-- 8) Sales: get_sale_details
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_sale_details(p_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_sale_info jsonb;
  v_items jsonb;
  v_payments jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'sale_number', s.sale_number,
    'subtotal', s.subtotal,
    'discount_amount', s.discount_amount,
    'total_amount', s.total_amount,
    'amount_tendered', s.amount_tendered,
    'change_due', s.change_due,
    'status', s.status,
    'notes', s.notes,
    'created_at', s.created_at,
    'cashier_name', u.full_name,
    'voided_at', s.voided_at,
    'void_reason', s.void_reason,
    'voided_by_name', v.full_name
  ) INTO v_sale_info
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  LEFT JOIN public.users v ON v.id = s.voided_by
  WHERE s.id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'item_name', i.name,
    'qty', si.qty,
    'unit_price', si.price,
    'line_total', si.line_total,
    'sku', i.sku
  )) INTO v_items
  FROM public.sale_items si
  JOIN public.items i ON i.id = si.item_id
  WHERE si.sale_id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'method_name', pm.name,
    'amount', sp.amount,
    'reference', sp.reference
  )) INTO v_payments
  FROM public.sale_payments sp
  JOIN public.payment_methods pm ON pm.id = sp.payment_method_id
  WHERE sp.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'sale', v_sale_info,
    'items', COALESCE(v_items, '[]'::jsonb),
    'payments', COALESCE(v_payments, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sale_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sale_details(uuid) TO authenticated;

-- =============================================================================
-- 9) Stock: get_stock_level_by_id (adapted for composite PK)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_stock_level_by_id(p_store_id uuid, p_item_id uuid)
RETURNS TABLE (
  store_id uuid,
  item_id uuid,
  quantity integer,
  recent_movements jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    sl.store_id,
    sl.item_id,
    sl.qty,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'delta', sm.delta,
        'reason', sm.reason,
        'created_at', sm.created_at
      ))
      FROM (
        SELECT * FROM public.stock_movements
        WHERE store_id = sl.store_id AND item_id = sl.item_id
        ORDER BY created_at DESC
        LIMIT 10
      ) sm
    ) AS recent_movements
  FROM public.stock_levels sl
  WHERE sl.store_id = p_store_id AND sl.item_id = p_item_id;
$$;

REVOKE ALL ON FUNCTION public.get_stock_level_by_id(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stock_level_by_id(uuid, uuid) TO authenticated;

-- =============================================================================
-- 10) Trigger: log_stock_ledger_on_update
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_stock_ledger_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    INSERT INTO public.stock_ledger (
      store_id, product_id, previous_quantity, new_quantity,
      quantity_change, transaction_type, reason, movement_id, metadata
    ) VALUES (
      NEW.store_id, NEW.item_id, OLD.qty, NEW.qty,
      NEW.qty - OLD.qty, 'system_adjustment',
      'Stock level adjusted via system',
      gen_random_uuid(),
      jsonb_build_object('update_type', CASE
        WHEN NEW.qty > OLD.qty THEN 'restock' ELSE 'removal'
      END)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_stock_ledger ON public.stock_levels;
CREATE TRIGGER trg_log_stock_ledger
  AFTER UPDATE ON public.stock_levels
  FOR EACH ROW
  WHEN (NEW.qty IS DISTINCT FROM OLD.qty)
  EXECUTE FUNCTION public.log_stock_ledger_on_update();

-- =============================================================================
-- 11) Trigger: update_user_last_login
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_user_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE auth_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_login ON auth.users;
CREATE TRIGGER trg_update_last_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_login();

-- =============================================================================
-- 12) RPC: record_purchase_v2
-- =============================================================================
DROP FUNCTION IF EXISTS public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT);

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
  v_current_qty         NUMERIC(15, 4);
  v_current_avg_cost    NUMERIC(15, 4);
  v_new_avg_cost        NUMERIC(15, 4);
  v_inventory_account_id UUID;
  v_user_id             UUID := auth.uid();
  v_supplier_type       TEXT;
  v_payable_amount      NUMERIC(15, 4);
BEGIN
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

    SELECT COALESCE(SUM(quantity_change), 0) INTO v_current_qty
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id;

    SELECT weighted_average_cost INTO v_current_avg_cost
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;

    v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

    IF (v_current_qty + v_item.quantity) > 0 THEN
      v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost)
                      / (v_current_qty + v_item.quantity);
    ELSE
      v_new_avg_cost := v_item.unit_cost;
    END IF;

    INSERT INTO public.stock_movements (
      tenant_id, store_id, item_id, quantity_change,
      weighted_average_cost, reference_type, reference_id, created_by
    ) VALUES (
      p_tenant_id, p_store_id, v_item.item_id, v_item.quantity,
      v_new_avg_cost, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id
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

REVOKE ALL ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 13) RPC: post_draft_purchase_receipt
-- =============================================================================
CREATE OR REPLACE FUNCTION public.post_draft_purchase_receipt(
  p_receipt_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_receipt   RECORD;
  v_items     JSONB;
  v_result    JSONB;
BEGIN
  SELECT * INTO v_receipt
  FROM public.purchase_receipts
  WHERE id = p_receipt_id
  FOR UPDATE;

  IF v_receipt.id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  IF v_receipt.status <> 'draft' THEN
    RAISE EXCEPTION 'Receipt is already % (not draft)', v_receipt.status;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'item_id', pri.item_id,
      'quantity', pri.quantity,
      'unit_cost', pri.unit_cost
    )
  ) INTO v_items
  FROM public.purchase_receipt_items pri
  WHERE pri.receipt_id = p_receipt_id;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'No items found for this receipt';
  END IF;

  SELECT public.record_purchase_v2(
    'post_draft_' || p_receipt_id::TEXT || '_' || NOW()::TEXT,
    v_receipt.tenant_id,
    v_receipt.store_id,
    v_receipt.supplier_id,
    v_receipt.invoice_number,
    v_receipt.invoice_total,
    v_items,
    v_receipt.amount_paid,
    NULL,
    NULL,
    'posted',
    v_receipt.notes
  ) INTO v_result;

  UPDATE public.purchase_receipts
  SET status = 'posted',
      updated_at = NOW()
  WHERE id = p_receipt_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.post_draft_purchase_receipt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_draft_purchase_receipt(UUID) TO authenticated;