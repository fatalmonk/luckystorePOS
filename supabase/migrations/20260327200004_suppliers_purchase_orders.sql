-- Phase 5: Supplier & Purchase Order Management
-- 1) suppliers table
-- 2) purchase_orders table
-- 3) purchase_order_items table
-- 4) RLS policies for all three tables
-- 5) receive_purchase_order RPC (atomically receives a PO, increments stock, writes movements)

-- ---------------------------------------------------------------------------
-- 1) suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  contact     text,
  phone       text,
  email       text,
  address     text,
  notes       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------------------------
-- 2) purchase_orders
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.po_status AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       text NOT NULL UNIQUE,
  supplier_id     uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  store_id        uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  status          public.po_status NOT NULL DEFAULT 'draft',
  order_date      date,
  expected_date   date,
  notes           text,
  created_by      uuid REFERENCES public.users(id),
  updated_by      uuid REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Auto-generate PO numbers: PO-YYYYMMDD-XXXX
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('public.po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_po_number ON public.purchase_orders;
CREATE TRIGGER auto_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();

-- ---------------------------------------------------------------------------
-- 3) purchase_order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  qty_ordered     integer NOT NULL CHECK (qty_ordered > 0),
  qty_received    integer NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost       numeric(12,2) NOT NULL DEFAULT 0,
  UNIQUE (po_id, item_id)
);

-- ---------------------------------------------------------------------------
-- 4) RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Suppliers: everyone authenticated can read; admin/manager can write
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_write" ON public.suppliers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin', 'manager')));

-- POs: everyone authenticated can read; admin/manager/stock can write
CREATE POLICY "purchase_orders_select" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_write" ON public.purchase_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin', 'manager', 'stock')));

-- PO items: follow PO policies
CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_items_write" ON public.purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin', 'manager', 'stock')));

-- ---------------------------------------------------------------------------
-- 5) RPC: receive_purchase_order
-- Marks a PO as (partially_)received, increments stock, writes movements.
-- p_received_items: [{ "po_item_id": "...", "qty_received": 5 }]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_po_id           uuid,
  p_received_items  jsonb,
  p_notes           text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_po            public.purchase_orders%ROWTYPE;
  v_user_id       uuid;
  v_poi           public.purchase_order_items%ROWTYPE;
  v_recv_item     record;
  v_all_received  boolean;
  v_any_received  boolean := false;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock PO
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF v_po.id IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot receive a % purchase order', v_po.status;
  END IF;

  -- Process each received item
  FOR v_recv_item IN
    SELECT * FROM jsonb_to_recordset(p_received_items) AS x(po_item_id uuid, qty_received integer)
  LOOP
    IF v_recv_item.qty_received <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_poi FROM public.purchase_order_items WHERE id = v_recv_item.po_item_id AND po_id = p_po_id FOR UPDATE;
    IF v_poi.id IS NULL THEN RAISE EXCEPTION 'PO item not found: %', v_recv_item.po_item_id; END IF;

    -- Guard: can't receive more than ordered (minus already received)
    IF v_recv_item.qty_received > (v_poi.qty_ordered - v_poi.qty_received) THEN
      RAISE EXCEPTION 'Receiving % units exceeds remaining qty for item %', v_recv_item.qty_received, v_poi.item_id;
    END IF;

    -- Increment stock at destination store
    PERFORM public.adjust_stock(
      v_po.store_id,
      v_poi.item_id,
      v_recv_item.qty_received,
      'received',
      COALESCE(p_notes, 'PO Receipt: ' || v_po.po_number),
      v_user_id
    );

    -- Update po_item received qty
    UPDATE public.purchase_order_items
      SET qty_received = qty_received + v_recv_item.qty_received
      WHERE id = v_poi.id;

    v_any_received := true;
  END LOOP;

  IF NOT v_any_received THEN
    RAISE EXCEPTION 'No items were received';
  END IF;

  -- Recompute PO status
  SELECT bool_and(qty_received >= qty_ordered)
  INTO v_all_received
  FROM public.purchase_order_items
  WHERE po_id = p_po_id;

  UPDATE public.purchase_orders
    SET status = CASE WHEN v_all_received THEN 'received'::public.po_status ELSE 'partially_received'::public.po_status END,
        updated_by = v_user_id
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'new_status', CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.receive_purchase_order(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text) TO authenticated;
