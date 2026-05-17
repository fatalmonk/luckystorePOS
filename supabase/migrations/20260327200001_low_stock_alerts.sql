-- Phase 2: Low-Stock Alerts & Dashboard Widgets
-- 1) Create stock_alert_thresholds table for per-store, per-item config
-- 2) RLS for stock_alert_thresholds
-- 3) RPC for low stock items (get_low_stock_items)
-- 4) RPC for inventory summary stats (get_inventory_summary)

-- ---------------------------------------------------------------------------
-- 1) Table: stock_alert_thresholds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_alert_thresholds (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  min_qty integer NOT NULL DEFAULT 5,
  reorder_qty integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, item_id)
);

-- Trigger to auto-update updated_at 
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stock_alert_thresholds_updated_at ON public.stock_alert_thresholds;
CREATE TRIGGER set_stock_alert_thresholds_updated_at
BEFORE UPDATE ON public.stock_alert_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS for stock_alert_thresholds
-- ---------------------------------------------------------------------------
ALTER TABLE public.stock_alert_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_alert_thresholds_read_all" ON public.stock_alert_thresholds;
CREATE POLICY "stock_alert_thresholds_read_all"
  ON public.stock_alert_thresholds FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "stock_alert_thresholds_write_staff" ON public.stock_alert_thresholds;
CREATE POLICY "stock_alert_thresholds_write_staff"
  ON public.stock_alert_thresholds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) RPC: get_low_stock_items
-- Retrieves items whose total qty across batches in a store is <= their minimum threshold
-- ---------------------------------------------------------------------------
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
    COALESCE(sl.qty, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    COALESCE(sat.reorder_qty, 20) as reorder_qty
  FROM public.items i
  LEFT JOIN public.categories c ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.active = true
    AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty, 0) ASC, i.name ASC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.get_low_stock_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_low_stock_items(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: get_inventory_summary
-- Retrieves high-level stats for the dashboard
-- ---------------------------------------------------------------------------
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
    SUM(CASE WHEN sl.qty = 0 THEN 1 ELSE 0 END),
    COALESCE(SUM(sl.qty * i.price), 0),
    COALESCE(SUM(sl.qty * i.cost), 0)
  INTO 
    v_total_skus, 
    v_out_of_stock, 
    v_total_value, 
    v_total_cost
  FROM public.items i
  JOIN public.stock_levels sl ON sl.item_id = i.id
  WHERE sl.store_id = p_store_id
    AND i.active = true;

  RETURN jsonb_build_object(
    'total_skus', COALESCE(v_total_skus, 0),
    'out_of_stock_count', COALESCE(v_out_of_stock, 0),
    'total_value', v_total_value,
    'total_cost', v_total_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inventory_summary(uuid) TO authenticated;
