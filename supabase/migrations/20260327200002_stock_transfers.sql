-- Phase 3: Inter-Store Stock Transfers
-- 1) Create ENUM and tables (stock_transfers, stock_transfer_items)
-- 2) RLS policies
-- 3) RPC to create transfer
-- 4) RPC to update status (handles atomic stock movements)

-- ---------------------------------------------------------------------------
-- 1) Tables and ENUM
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS public.stock_transfer_status CASCADE;
CREATE TYPE public.stock_transfer_status AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  to_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  status public.stock_transfer_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES public.users(id),
  updated_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diff_stores CHECK (from_store_id != to_store_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  qty integer NOT NULL CHECK (qty > 0),
  UNIQUE (transfer_id, item_id)
);

-- Trigger to auto-update updated_at for transfers
DROP TRIGGER IF EXISTS set_stock_transfers_updated_at ON public.stock_transfers;
CREATE TRIGGER set_stock_transfers_updated_at
BEFORE UPDATE ON public.stock_transfers
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_transfers_read_authenticated"
  ON public.stock_transfers FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_transfer_items_read_authenticated"
  ON public.stock_transfer_items FOR SELECT TO authenticated USING (true);

-- We only allow staff to insert/update, using a helper check 
CREATE POLICY "stock_transfers_write_staff"
  ON public.stock_transfers FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin', 'manager', 'stock'))
  );

CREATE POLICY "stock_transfer_items_write_staff"
  ON public.stock_transfer_items FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin', 'manager', 'stock'))
  );

-- ---------------------------------------------------------------------------
-- 3) RPC: create_stock_transfer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_notes text,
  p_items jsonb -- [{ "item_id": "...", "qty": 5 }]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer_id uuid;
  v_user_id uuid;
  v_item record;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Source and destination stores must be different';
  END IF;

  -- Create transfer record
  INSERT INTO public.stock_transfers (from_store_id, to_store_id, notes, created_by, updated_by)
  VALUES (p_from_store_id, p_to_store_id, p_notes, v_user_id, v_user_id)
  RETURNING id INTO v_transfer_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id uuid, qty integer) 
  LOOP
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Transfer quantity must be > 0 (item %)', v_item.item_id;
    END IF;

    INSERT INTO public.stock_transfer_items (transfer_id, item_id, qty)
    VALUES (v_transfer_id, v_item.item_id, v_item.qty);
  END LOOP;

  RETURN v_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_transfer(uuid, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(uuid, uuid, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: update_stock_transfer_status
-- Handles atomic stock movement by leveraging the Phase 1 adjust_stock function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_stock_transfer_status(
  p_transfer_id uuid,
  p_new_status public.stock_transfer_status,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer public.stock_transfers%ROWTYPE;
  v_user_id uuid;
  v_item record;
  v_from_store_name text;
  v_to_store_name text;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock row
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF v_transfer.id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  -- Validate state transition
  IF v_transfer.status = 'completed' OR v_transfer.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update a completed or cancelled transfer';
  END IF;

  IF v_transfer.status = 'pending' AND p_new_status = 'completed' THEN
    RAISE EXCEPTION 'Transfer must be in_transit before being completed';
  END IF;

  IF v_transfer.status = p_new_status THEN
    RETURN true; -- No-op
  END IF;

  -- Get store names for logs
  SELECT name INTO v_from_store_name FROM public.stores WHERE id = v_transfer.from_store_id;
  SELECT name INTO v_to_store_name FROM public.stores WHERE id = v_transfer.to_store_id;

  -- TRANSITION: pending -> in_transit
  IF v_transfer.status = 'pending' AND p_new_status = 'in_transit' THEN
    -- Decrement stock from source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        -v_item.qty, 
        'transfer_out', 
        COALESCE(p_notes, 'Transfer to ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> completed
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'completed' THEN
    -- Increment stock at destination
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.to_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'transfer_in', 
        COALESCE(p_notes, 'Transfer from ' || v_from_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> cancelled
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'cancelled' THEN
    -- Rollback stock to source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'correction', 
        'Cancelled transfer recovery from ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')', 
        v_user_id
      );
    END LOOP;
  END IF;

  -- Save status update
  UPDATE public.stock_transfers 
  SET 
    status = p_new_status, 
    updated_by = v_user_id,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END
  WHERE id = p_transfer_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_stock_transfer_status(uuid, public.stock_transfer_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stock_transfer_status(uuid, public.stock_transfer_status, text) TO authenticated;
