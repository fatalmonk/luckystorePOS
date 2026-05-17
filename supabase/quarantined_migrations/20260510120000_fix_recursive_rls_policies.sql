-- =============================================================================
-- Migration: Fix Recursive RLS Policies
-- Date: 2026-05-10
-- Issue: RLS policies have recursive subqueries referencing the same table,
--        causing infinite loops and 500 errors
-- Impact: CRITICAL - All queries to categories, items, etc. failing
-- =============================================================================

-- Fix categories SELECT policy (remove recursive reference)
DROP POLICY IF EXISTS "categories_select_tenant_isolated" ON public.categories;

CREATE POLICY "categories_select_tenant_isolated"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    -- User can see categories from their store
    store_id = public.get_current_user_store_id()
    OR
    -- Admins/managers/advisors can see categories from their tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Ensure items table has tenant_id populated
UPDATE public.items i
SET tenant_id = c.tenant_id
FROM public.categories c
WHERE i.category_id = c.id
  AND i.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

-- Fix items SELECT policy (simplified, no recursive reference)
DROP POLICY IF EXISTS "items_select_tenant_isolated" ON public.items;

CREATE POLICY "items_select_tenant_isolated"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    -- User can see items from their tenant
    tenant_id = public.get_current_user_tenant_id()
    OR
    -- Admins/managers/advisors can see items from their tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Fix items ALL policy (for write operations)
DROP POLICY IF EXISTS "items_manage_authorized" ON public.items;

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

-- Verify all other policies don't have recursive references
-- (The remaining policies should be fine as they don't reference the same table)

-- Grant execute on helper functions (ensure they're accessible)
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_store_id() TO authenticated;