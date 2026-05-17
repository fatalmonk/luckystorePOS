-- =============================================================================
-- Migration: Fix Quantity Column References in RPCs
-- Date: 2026-05-12
-- Issue: Many RPCs still reference 'qty' which was renamed to 'qty_on_hand'
-- =============================================================================

-- 1) get_low_stock_items
CREATE OR REPLACE FUNCTION public.get_low_stock_items(p_store_id uuid)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  sku text,
  image_url text,
  category_name text,
  current_qty bigint,
  min_qty integer,
  reorder_qty integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT 
    i.id as item_id,
    i.name as item_name,
    i.sku as sku,
    i.image_url as image_url,
    c.name as category_name,
    COALESCE(sl.qty_on_hand, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    COALESCE(sat.reorder_qty, 20) as reorder_qty
  FROM public.items i
  LEFT JOIN public.categories c ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
    AND COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty_on_hand, 0) ASC, i.name ASC
  LIMIT 50;
$$;

-- 2) get_inventory_summary
CREATE OR REPLACE FUNCTION public.get_inventory_summary(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_total_skus bigint;
  v_out_of_stock bigint;
  v_total_value numeric;
  v_total_cost numeric;
BEGIN
  SELECT 
    COUNT(DISTINCT i.id),
    SUM(CASE WHEN sl.qty_on_hand = 0 THEN 1 ELSE 0 END),
    COALESCE(SUM(sl.qty_on_hand * i.price), 0),
    COALESCE(SUM(sl.qty_on_hand * i.cost), 0)
  INTO 
    v_total_skus, 
    v_out_of_stock, 
    v_total_value, 
    v_total_cost
  FROM public.items i
  JOIN public.stock_levels sl ON sl.item_id = i.id
  WHERE sl.store_id = p_store_id
    AND i.is_active = true;

  RETURN jsonb_build_object(
    'total_skus', COALESCE(v_total_skus, 0),
    'out_of_stock_count', COALESCE(v_out_of_stock, 0),
    'total_value', v_total_value,
    'total_cost', v_total_cost
  );
END;
$$;

-- 3) lookup_item_by_scan
CREATE OR REPLACE FUNCTION public.lookup_item_by_scan(
  p_scan_value  text,
  p_store_id    uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'id',           i.id,
    'sku',          i.sku,
    'short_code',   i.short_code,
    'barcode',      i.barcode,
    'name',         i.name,
    'brand',        i.brand,
    'mrp',          COALESCE(i.mrp, i.price),
    'price',        i.price,
    'cost',         i.cost,
    'group_tag',    i.group_tag,
    'image_url',    i.image_url,
    'qty_on_hand',  COALESCE(sl.qty_on_hand, 0),
    'category',     c.name
  )
  FROM public.items i
  LEFT JOIN public.stock_levels sl
         ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.categories c
         ON c.id = i.category_id
  WHERE i.is_active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;

-- 4) search_items_pos
CREATE OR REPLACE FUNCTION public.search_items_pos(
  p_store_id    uuid,
  p_query       text        DEFAULT '',
  p_category_id uuid        DEFAULT NULL,
  p_limit       integer     DEFAULT 50,
  p_offset      integer     DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_agg(row_to_json(r))
  FROM (
    SELECT
      i.id,
      i.sku,
      i.barcode,
      i.short_code,
      i.name,
      i.brand,
      COALESCE(i.mrp, i.price) AS mrp,
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.name AS category,
      c.id AS category_id,
      COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
    FROM public.items i
    LEFT JOIN public.stock_levels sl
           ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.categories c
           ON c.id = i.category_id
    WHERE i.is_active = true
      AND (
        p_query = '' OR
        i.name        ILIKE '%' || p_query || '%' OR
        i.brand       ILIKE '%' || p_query || '%' OR
        i.sku         ILIKE '%' || p_query || '%' OR
        i.short_code  ILIKE '%' || p_query || '%' OR
        i.barcode     ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    ORDER BY i.name ASC
    LIMIT p_limit OFFSET p_offset
  ) r;
$$;

-- 5) get_inventory_list
DROP FUNCTION IF EXISTS public.get_inventory_list(uuid) CASCADE;
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
    COALESCE(sl.qty_on_hand, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    CASE 
      WHEN COALESCE(sl.qty_on_hand, 0) = 0 THEN 'OUT'
      WHEN COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'
      ELSE 'OK'
    END as reorder_status,
    COALESCE(sl.updated_at, i.updated_at) as last_updated
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(sl.qty_on_hand, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$$;

-- 6) set_stock
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
  -- IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Get current qty
  SELECT COALESCE(qty_on_hand, 0) INTO v_current_qty
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

-- Re-grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.get_low_stock_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid, text, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_stock(uuid, uuid, integer, text, text) TO authenticated;
