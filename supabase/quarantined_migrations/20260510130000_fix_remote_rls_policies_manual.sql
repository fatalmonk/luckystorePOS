-- =============================================================================
-- URGENT FIX: Apply directly to remote database via Supabase Dashboard
-- Date: 2026-05-10
-- Issues:
--   1. auth.role() function doesn't exist (causes 400 errors)
--   2. Items table missing tenant_id column
--   3. Categories table has recursive RLS policies (causes 500 errors)
--   4. RLS policies don't enforce tenant isolation
-- =============================================================================

-- ============================================================================
-- STEP 1: Add missing tenant_id column to items table
-- ============================================================================
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Populate tenant_id from categories
UPDATE public.items i
SET tenant_id = c.tenant_id
FROM public.categories c
WHERE i.category_id = c.id
  AND i.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON public.items(tenant_id);

-- ============================================================================
-- STEP 2: Fix categories RLS (remove recursive reference, fix auth check)
-- ============================================================================

-- Drop broken policies
DROP POLICY IF EXISTS "categories_select_tenant_isolated" ON public.categories;
DROP POLICY IF EXISTS "Allow read to authenticated" ON public.categories;

-- Create correct policies
CREATE POLICY "categories_select_tenant_isolated"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

CREATE POLICY "categories_manage_authorized"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- ============================================================================
-- STEP 3: Fix items RLS (remove auth.role(), use proper auth check)
-- ============================================================================

-- Drop broken policies
DROP POLICY IF EXISTS "Admins manage items" ON public.items;
DROP POLICY IF EXISTS "Allow read to authenticated" ON public.items;
DROP POLICY IF EXISTS "items_select_tenant_isolated" ON public.items;
DROP POLICY IF EXISTS "items_manage_authorized" ON public.items;

-- Create correct policies
CREATE POLICY "items_select_tenant_isolated"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

CREATE POLICY "items_manage_authorized"
  ON public.items
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- ============================================================================
-- STEP 4: Fix other tables with auth.role() issues
-- ============================================================================

-- Check for any other policies using auth.role()
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%'
  LOOP
    RAISE NOTICE 'Found policy using auth.role(): %.%', pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- Fix stock_transfer_items if needed
DROP POLICY IF EXISTS "stock_transfer_items_read_authenticated" ON public.stock_transfer_items;
DROP POLICY IF EXISTS "stock_transfer_items_write_staff" ON public.stock_transfer_items;

CREATE POLICY "stock_transfer_items_select_tenant"
  ON public.stock_transfer_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_transfers st
      WHERE st.id = stock_transfer_items.transfer_id
        AND st.store_id = public.get_current_user_store_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager')
    )
  );

-- Fix purchase_order_items if needed
DROP POLICY IF EXISTS "po_items_select" ON public.purchase_order_items;
DROP POLICY IF EXISTS "po_items_write" ON public.purchase_order_items;

CREATE POLICY "purchase_order_items_select_tenant"
  ON public.purchase_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND po.store_id = public.get_current_user_store_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- STEP 5: Ensure helper functions exist and are accessible
-- ============================================================================

-- Verify get_current_user_tenant_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_current_user_tenant_id'
  ) THEN
    RAISE EXCEPTION 'Function get_current_user_tenant_id not found!';
  END IF;
END $$;

-- Verify get_current_user_store_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_current_user_store_id'
  ) THEN
    RAISE EXCEPTION 'Function get_current_user_store_id not found!';
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_store_id() TO authenticated;

-- ============================================================================
-- STEP 6: Verify RLS is enabled on all tables
-- =============================================================================

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN 
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'items', 'categories', 'stores', 'users', 'sales', 'sale_items',
        'expenses', 'stock_levels', 'stock_movements', 'parties',
        'purchase_orders', 'purchase_order_items', 'stock_transfers', 'stock_transfer_items'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
      RAISE NOTICE 'Enabled RLS on %', tbl.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'RLS already enabled on %', tbl.table_name;
    END;
  END LOOP;
END $$;