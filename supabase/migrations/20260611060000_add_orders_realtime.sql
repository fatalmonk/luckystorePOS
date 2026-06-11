-- supabase/migrations/20260611060000_add_orders_realtime.sql

-- 1. Add orders to the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$$;

-- 2. Allow authenticated users to update orders (for status transitions)
DROP POLICY IF EXISTS "Allow tenant update orders" ON public.orders;
CREATE POLICY "Allow tenant update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (tenant_id = public.get_current_user_tenant_id())
WITH CHECK (tenant_id = public.get_current_user_tenant_id());
