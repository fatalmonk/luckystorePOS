-- rls_stocks.sql
-- Row Level Security policies for the stock_levels table.
-- Enforces strict read/write permissions based on user roles.

-- Enable RLS on the table (if not already enabled)
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to read stock levels only for stores in their tenant.
DROP POLICY IF EXISTS "stock_levels_read" ON public.stock_levels;
CREATE POLICY "stock_levels_read"
  ON public.stock_levels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = stock_levels.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
    )
  );

-- Policy: allow staff roles (admin, manager, stock) to insert, update, delete.
DROP POLICY IF EXISTS "stock_levels_write" ON public.stock_levels;
CREATE POLICY "stock_levels_write"
  ON public.stock_levels
  FOR ALL
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

-- Grant execute rights on the new RPC to service_role (handled in its own file).
-- Note: No further changes needed here.
