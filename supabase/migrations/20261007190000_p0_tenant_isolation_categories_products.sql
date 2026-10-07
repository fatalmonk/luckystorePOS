-- P0 follow-up: tenant isolation for categories and products.
-- PostgreSQL ORs permissive policies, so any `USING (true)` policy defeats tenant policies.

SET LOCAL lock_timeout = '5s';

-- categories ---------------------------------------------------------------
DROP POLICY IF EXISTS categories_select_authenticated ON public.categories;
DROP POLICY IF EXISTS categories_select_anon ON public.categories;

-- Enable RLS on categories
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

-- Anonymous reads on categories must be scoped to active rows within the default storefront tenant
CREATE POLICY categories_select_anon ON public.categories
  FOR SELECT TO anon
  USING (
    active = true
    AND (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid OR tenant_id IS NULL)
  );

-- Legacy rows with NULL tenant_id stay visible/editable only inside their own store.
DROP POLICY IF EXISTS categories_select_tenant_isolated ON public.categories;
CREATE POLICY categories_select_tenant_isolated ON public.categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND (u.tenant_id = categories.tenant_id
             OR (categories.tenant_id IS NULL AND u.store_id = categories.store_id))
    )
  );

-- Admin role in one tenant must not authorize writes in another.
DROP POLICY IF EXISTS categories_insert_admin ON public.categories;
CREATE POLICY categories_insert_admin ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'
        AND (u.tenant_id = categories.tenant_id
             OR (categories.tenant_id IS NULL AND u.store_id = categories.store_id))
    )
  );

DROP POLICY IF EXISTS categories_update_admin ON public.categories;
CREATE POLICY categories_update_admin ON public.categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'
        AND (u.tenant_id = categories.tenant_id
             OR (categories.tenant_id IS NULL AND u.store_id = categories.store_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'
        AND (u.tenant_id = categories.tenant_id
             OR (categories.tenant_id IS NULL AND u.store_id = categories.store_id))
    )
  );

DROP POLICY IF EXISTS categories_delete_admin ON public.categories;
CREATE POLICY categories_delete_admin ON public.categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'
        AND (u.tenant_id = categories.tenant_id
             OR (categories.tenant_id IS NULL AND u.store_id = categories.store_id))
    )
  );

-- products -----------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.products') IS NULL THEN RETURN; END IF;

  EXECUTE 'ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY';

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT'
      AND btrim(qual, '() ') = 'true'
      AND (roles && ARRAY['anon', 'authenticated', 'public']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.products', pol.policyname);
  END LOOP;

  EXECUTE 'DROP POLICY IF EXISTS products_select_anon_active ON public.products';
  EXECUTE 'CREATE POLICY products_select_anon_active ON public.products
           FOR SELECT TO anon USING (is_active = true AND (tenant_id = ''00000000-0000-0000-0000-000000000001''::uuid OR tenant_id IS NULL))';

  EXECUTE 'DROP POLICY IF EXISTS products_select_tenant ON public.products';
  EXECUTE 'CREATE POLICY products_select_tenant ON public.products
           FOR SELECT TO authenticated USING (
             EXISTS (SELECT 1 FROM public.users u
                     WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = products.tenant_id))';

  -- Internal commercial columns are never needed by anonymous callers.
  EXECUTE 'REVOKE SELECT (cost, stock_qty, reorder_point) ON public.products FROM anon';
END $$;
