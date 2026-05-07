-- stock_levels: realtime replication + trusted RPCs + RLS aligned with staff roles
--
-- 1) If stock_levels was never added to supabase_realtime, postgres_changes subscriptions
--    on this table will never fire (see docs/02-setup/02-SUPABASE-SCHEMA.md).
-- 2) Stock RPCs run as SECURITY INVOKER by default; with RLS on stock_levels, callers that
--    are not bypassing RLS can fail. Edge functions use service_role (bypasses RLS), but
--    SECURITY DEFINER + explicit GRANT documents intent and avoids subtle env differences.
-- 3) Allow role "stock" to manage rows from the dashboard (clear store / adjustments), same
--    family as sale_items/stock_movements staff policies.

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stock_levels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_levels;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read stock levels" ON public.stock_levels;
CREATE POLICY "Authenticated users can read stock levels"
  ON public.stock_levels
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins managers can manage stock levels" ON public.stock_levels;
CREATE POLICY "Staff roles can manage stock levels"
  ON public.stock_levels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

-- ---------------------------------------------------------------------------
-- Trusted stock RPCs (bypass RLS inside function; not exposed to anon)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.stock_levels
  SET qty = qty - p_quantity
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND qty >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stock_level(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, p_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = public.stock_levels.qty + p_quantity;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_apply_stock_delta(
  p_store_id uuid,
  p_item_id uuid,
  p_delta integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be > 0';
  END IF;

  WITH upserted AS (
    INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (p_store_id, p_item_id, p_delta)
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET qty = public.stock_levels.qty + EXCLUDED.qty
    RETURNING (xmax = 0) AS inserted
  )
  SELECT inserted INTO v_inserted FROM upserted;

  RETURN COALESCE(v_inserted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_stock(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.decrement_stock(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.upsert_stock_level(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_stock_level(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_stock_level(uuid, uuid, integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.import_apply_stock_delta(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_apply_stock_delta(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.import_apply_stock_delta(uuid, uuid, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_stock_level(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.import_apply_stock_delta(uuid, uuid, integer) TO service_role;
