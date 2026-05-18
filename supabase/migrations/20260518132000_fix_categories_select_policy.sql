-- Migration: Fix categories SELECT policy to allow all authenticated users
-- Issue: categories_select_tenant_isolated policy restricts access by tenant,
--         but categories need to be readable by all users in the store
-- Fix: Restore permissive SELECT policy for categories

-- Drop restrictive policies if they exist
DROP POLICY IF EXISTS "categories_select_tenant_isolated" ON public.categories;
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;

-- Create permissive SELECT policy (matches original behavior)
-- Categories are reference data that should be readable by all authenticated users
CREATE POLICY "categories_select_authenticated"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Categories SELECT policy restored to allow all authenticated users';
END $$;
