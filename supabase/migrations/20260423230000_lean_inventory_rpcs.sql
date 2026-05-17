-- =============================================================================
-- Lean Inventory RPCs for Lucky Store Admin Web
-- Optimized for Shopkeeper clarity and speed.
-- =============================================================================

-- 1) RPC: get_inventory_list
-- Returns a clean list of products with their current stock and reorder status.
CREATE OR REPLACE FUNCTION public.get_inventory_list(p_store_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  current_qty integer,
  min_qty integer,
  reorder_status text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.sku,
    COALESCE(sl.qty, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    CASE 
      WHEN COALESCE(sl.qty, 0) = 0 THEN 'OUT'
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'
      ELSE 'OK'
    END as reorder_status,
    COALESCE(sl.updated_at, i.updated_at) as last_updated
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(sl.qty, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_list(uuid) TO authenticated;

-- 2) Grant execute on adjust_stock to authenticated
-- This was service_role only in previous migrations.
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, integer, text, text, uuid) TO authenticated;

-- 3) RPC: set_stock
-- Calculates delta and adjusts stock to a specific value.
CREATE OR REPLACE FUNCTION public.set_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_new_qty integer,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_qty integer;
  v_delta integer;
  v_user_id uuid;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Get current qty
  SELECT COALESCE(qty, 0) INTO v_current_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  v_delta := p_new_qty - v_current_qty;

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('status', 'no_change', 'qty', v_current_qty);
  END IF;

  RETURN public.adjust_stock(
    p_store_id,
    p_item_id,
    v_delta,
    p_reason,
    p_notes,
    v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_stock(uuid, uuid, integer, text, text) TO authenticated;

-- 4) RPC: get_stock_history_simple
-- Chronological log for a specific product
CREATE OR REPLACE FUNCTION public.get_stock_history_simple(
  p_store_id uuid,
  p_item_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  item_name text,
  delta integer,
  reason text,
  notes text,
  performer_name text,
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
    sm.id,
    i.name as item_name,
    sm.delta,
    sm.reason,
    COALESCE(sm.meta->>'notes', '') as notes,
    u.full_name as performer_name,
    sm.created_at
  FROM public.stock_movements sm
  JOIN public.items i ON i.id = sm.item_id
  LEFT JOIN public.users u ON u.id = sm.performed_by
  WHERE sm.store_id = p_store_id
    AND (p_item_id IS NULL OR sm.item_id = p_item_id)
  ORDER BY sm.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_history_simple(uuid, uuid, integer) TO authenticated;
