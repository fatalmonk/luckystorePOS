-- 1. Automated inventory restocking on order cancellation
-- 2. Archive & reconcile historical test orders to restore stock levels

-- 1. Restock trigger on order cancellation
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_restock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_item_id uuid;
  v_qty integer;
BEGIN
  -- When transitioning to cancelled from a non-cancelled state
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    IF jsonb_typeof(NEW.items) = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
        BEGIN
          v_item_id := (v_item->>'id')::uuid;
          v_qty := (v_item->>'qty')::integer;
        EXCEPTION WHEN invalid_text_representation THEN
          CONTINUE;
        END;

        IF v_item_id IS NOT NULL AND v_qty IS NOT NULL AND v_qty > 0 THEN
          UPDATE public.stock_levels
          SET qty = qty + v_qty
          WHERE item_id = v_item_id
            AND store_id = NEW.store_id;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_cancellation_restock ON public.orders;
CREATE TRIGGER trg_order_cancellation_restock
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_cancellation_restock();

-- 2. Archive existing test orders and reconcile stock levels
CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  v_order_count integer;
BEGIN
  SELECT count(*) INTO v_order_count FROM public.orders;

  IF v_order_count > 0 THEN
    CREATE TABLE IF NOT EXISTS archive.orders_backup_20261008 AS
      SELECT * FROM public.orders;

    -- Calculate total quantities deducted by non-delivered test orders and restore stock
    WITH test_order_items AS (
      SELECT
        (item->>'id')::uuid AS item_id,
        o.store_id,
        SUM((item->>'qty')::integer) AS qty_to_restore
      FROM public.orders o,
      LATERAL jsonb_array_elements(o.items) AS item
      WHERE o.status <> 'delivered'
        AND o.created_at <= now()
      GROUP BY (item->>'id')::uuid, o.store_id
    )
    UPDATE public.stock_levels sl
    SET qty = sl.qty + toi.qty_to_restore
    FROM test_order_items toi
    WHERE sl.item_id = toi.item_id
      AND sl.store_id = toi.store_id;

    -- Mark all historical test orders as cancelled
    UPDATE public.orders
    SET status = 'cancelled'
    WHERE status <> 'delivered';
  END IF;
END $$;
