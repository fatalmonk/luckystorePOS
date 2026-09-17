-- Harden the admin reporting read endpoints without changing their public
-- response shapes. SECURITY DEFINER is retained because these aggregations
-- span tables protected by RLS; each function therefore verifies the caller
-- and requested store before reading any data.

CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_store_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_total_revenue numeric := 0;
  v_transaction_count integer := 0;
  v_top_products json;
  v_daily_sales json;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND OR v_user.role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND s.tenant_id = v_user.tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(s.total_amount), 0), COUNT(*)
    INTO v_total_revenue, v_transaction_count
  FROM public.sales s
  WHERE s.store_id = p_store_id
    AND s.status = 'completed'
    AND s.created_at >= p_start_date::timestamptz
    AND s.created_at < (p_end_date::date + interval '1 day')::timestamptz;

  SELECT json_agg(t) INTO v_top_products FROM (
    SELECT i.name, SUM(si.qty) AS quantity, SUM(si.qty * si.price) AS revenue
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    JOIN public.items i ON i.id = si.item_id
    WHERE s.store_id = p_store_id
      AND s.status = 'completed'
      AND s.created_at >= p_start_date::timestamptz
      AND s.created_at < (p_end_date::date + interval '1 day')::timestamptz
    GROUP BY i.name
    ORDER BY quantity DESC
    LIMIT 10
  ) t;

  SELECT json_agg(d ORDER BY d.date) INTO v_daily_sales FROM (
    SELECT date(s.created_at) AS date, SUM(s.total_amount) AS revenue, COUNT(*) AS count
    FROM public.sales s
    WHERE s.store_id = p_store_id
      AND s.status = 'completed'
      AND s.created_at >= p_start_date::timestamptz
      AND s.created_at < (p_end_date::date + interval '1 day')::timestamptz
    GROUP BY date(s.created_at)
  ) d;

  RETURN json_build_object(
    'totalRevenue', v_total_revenue,
    'transactionCount', v_transaction_count,
    'avgTicket', CASE WHEN v_transaction_count > 0 THEN v_total_revenue / v_transaction_count ELSE 0 END,
    'topProducts', COALESCE(v_top_products, '[]'::json),
    'dailySales', COALESCE(v_daily_sales, '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inventory_value(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_total_value numeric := 0;
  v_low_stock_count integer := 0;
  v_out_of_stock integer := 0;
  v_inventory json;
  v_total_items integer := 0;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND OR v_user.role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND s.tenant_id = v_user.tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*), SUM(COALESCE(i.cost, 0) * COALESCE(sl.qty, 0)),
         COUNT(*) FILTER (WHERE COALESCE(sl.qty, 0) = 0),
         COUNT(*) FILTER (WHERE COALESCE(sl.qty, 0) > 0 AND COALESCE(sl.qty, 0) <= 5)
    INTO v_total_items, v_total_value, v_out_of_stock, v_low_stock_count
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  WHERE i.is_active = true
    AND i.tenant_id = v_user.tenant_id;

  SELECT json_agg(inv ORDER BY inv.total_value DESC) INTO v_inventory FROM (
    SELECT i.id, i.name, i.sku, COALESCE(sl.qty, 0)::int AS qty,
           COALESCE(i.cost, 0) AS cost,
           COALESCE(i.cost, 0) * COALESCE(sl.qty, 0) AS total_value
    FROM public.items i
    LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.is_active = true
      AND i.tenant_id = v_user.tenant_id
  ) inv;

  RETURN json_build_object(
    'totalValue', COALESCE(v_total_value, 0),
    'totalItems', v_total_items,
    'lowStockCount', v_low_stock_count,
    'outOfStockCount', v_out_of_stock,
    'inventory', COALESCE(v_inventory, '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profit_loss(
  p_store_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_gross_revenue numeric := 0;
  v_cogs numeric := 0;
  v_total_expenses numeric := 0;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND OR v_user.role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND s.tenant_id = v_user.tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(s.total_amount), 0) INTO v_gross_revenue
  FROM public.sales s
  WHERE s.store_id = p_store_id AND s.status = 'completed'
    AND s.created_at >= p_start_date::timestamptz
    AND s.created_at < (p_end_date::date + interval '1 day')::timestamptz;

  SELECT COALESCE(SUM(si.qty * si.cost), 0) INTO v_cogs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.store_id = p_store_id AND s.status = 'completed'
    AND s.created_at >= p_start_date::timestamptz
    AND s.created_at < (p_end_date::date + interval '1 day')::timestamptz;

  SELECT COALESCE(SUM(e.amount), 0) INTO v_total_expenses
  FROM public.expenses e
  WHERE e.store_id = p_store_id
    AND e.expense_date >= p_start_date::date
    AND e.expense_date <= p_end_date::date;

  RETURN json_build_object(
    'grossRevenue', v_gross_revenue,
    'cogs', v_cogs,
    'grossProfit', v_gross_revenue - v_cogs,
    'totalExpenses', v_total_expenses,
    'netProfit', v_gross_revenue - v_cogs - v_total_expenses
  );
END;
$$;

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
DECLARE
  v_user public.users%ROWTYPE;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id
      AND s.tenant_id = v_user.tenant_id
      AND (v_user.role IN ('admin', 'manager') OR v_user.store_id = s.id)
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.id, s.sale_number, s.total_amount, s.status::text, u.full_name, s.created_at
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  WHERE s.store_id = p_store_id
    AND (v_user.role IN ('admin', 'manager') OR s.cashier_id = v_user.id)
    AND (p_search_query IS NULL OR s.sale_number ILIKE '%' || p_search_query || '%')
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  ORDER BY s.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sale_details(p_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_sale_store_id uuid;
  v_sale_cashier_id uuid;
  v_sale_tenant_id uuid;
  v_sale_info jsonb;
  v_items jsonb;
  v_payments jsonb;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT s.store_id, s.cashier_id, st.tenant_id
    INTO v_sale_store_id, v_sale_cashier_id, v_sale_tenant_id
  FROM public.sales s
  JOIN public.stores st ON st.id = s.store_id
  WHERE s.id = p_sale_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sale', NULL, 'items', '[]'::jsonb, 'payments', '[]'::jsonb);
  END IF;

  IF v_sale_tenant_id IS DISTINCT FROM v_user.tenant_id
     OR (v_user.role NOT IN ('admin', 'manager')
         AND (v_user.store_id IS DISTINCT FROM v_sale_store_id OR v_user.id IS DISTINCT FROM v_sale_cashier_id)) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', s.id, 'sale_number', s.sale_number, 'subtotal', s.subtotal,
    'discount_amount', s.discount_amount, 'total_amount', s.total_amount,
    'amount_tendered', s.amount_tendered, 'change_due', s.change_due,
    'status', s.status, 'notes', s.notes, 'created_at', s.created_at,
    'cashier_name', u.full_name, 'voided_at', s.voided_at,
    'void_reason', s.void_reason, 'voided_by_name', v.full_name
  ) INTO v_sale_info
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  LEFT JOIN public.users v ON v.id = s.voided_by
  WHERE s.id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'item_name', i.name, 'qty', si.qty, 'unit_price', si.price,
    'line_total', si.line_total, 'sku', i.sku
  )) INTO v_items
  FROM public.sale_items si
  JOIN public.items i ON i.id = si.item_id
  WHERE si.sale_id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'method_name', pm.name, 'amount', sp.amount, 'reference', sp.reference
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

REVOKE ALL ON FUNCTION public.get_sales_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_inventory_value(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_profit_loss(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sale_details(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_sales_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_value(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_loss(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_details(uuid) TO authenticated;
