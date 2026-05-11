-- =============================================================================
-- Sales History & Settings RPCs for Lucky Store Admin Web
-- Optimized for audit clarity and management utility.
-- =============================================================================

-- 1) RPC: get_sales_history
-- Returns a paginated list of sales with search and date filters.
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
  status public.sale_status,
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
    s.status,
    u.name as cashier_name,
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

GRANT EXECUTE ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) TO authenticated;

-- 2) RPC: get_sale_details
-- Returns items and payments for a specific sale as a JSON object.
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
  -- Basic sale info
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
    'cashier_name', u.name,
    'voided_at', s.voided_at,
    'void_reason', s.void_reason,
    'voided_by_name', v.name
  ) INTO v_sale_info
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  LEFT JOIN public.users v ON v.id = s.voided_by
  WHERE s.id = p_sale_id;

  -- Items
  SELECT jsonb_agg(jsonb_build_object(
    'item_name', i.name,
    'qty', si.qty,
    'unit_price', si.unit_price,
    'line_total', si.line_total,
    'sku', i.sku
  )) INTO v_items
  FROM public.sale_items si
  JOIN public.items i ON i.id = si.item_id
  WHERE si.sale_id = p_sale_id;

  -- Payments
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

GRANT EXECUTE ON FUNCTION public.get_sale_details(uuid) TO authenticated;

-- 3) Settings: get_payment_methods
CREATE OR REPLACE FUNCTION public.get_payment_methods(p_store_id uuid)
RETURNS SETOF public.payment_methods
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.payment_methods WHERE store_id = p_store_id ORDER BY sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_methods(uuid) TO authenticated;

-- 4) Settings: get_store_users
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
  -- Note: email is in public.users if synced, or we might need to join auth.users 
  -- but we'll stick to public.users for simplicity in this lean app.
  SELECT id, name AS full_name, role, email, NULL::timestamptz AS last_login
  FROM public.users 
  WHERE store_id = p_store_id OR role = 'admin'
  ORDER BY role ASC, name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_users(uuid) TO authenticated;

-- 5) Settings: receipt config
CREATE OR REPLACE FUNCTION public.get_receipt_config_simple(p_store_id uuid)
RETURNS public.receipt_config
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.receipt_config WHERE store_id = p_store_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_receipt_config_simple(uuid) TO authenticated;

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
  -- Auth: manager/admin only
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

GRANT EXECUTE ON FUNCTION public.update_receipt_config_simple(uuid, text, text, text) TO authenticated;
