-- P1 Security Hardening: Consolidate and strictly tenant-isolate expenses, items, and stock_levels policies.

-- 1. expenses ---------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expenses'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.expenses', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY expenses_select_tenant_isolated ON public.expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = expenses.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])
             OR u.store_id = expenses.store_id)
    )
  );

CREATE POLICY expenses_insert_authorized ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = expenses.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text])
        AND (u.role = 'admin'::text OR u.store_id = expenses.store_id)
    )
  );

CREATE POLICY expenses_update_authorized ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = expenses.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text])
        AND (u.role = 'admin'::text OR u.store_id = expenses.store_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = expenses.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text])
        AND (u.role = 'admin'::text OR u.store_id = expenses.store_id)
    )
  );

CREATE POLICY expenses_delete_authorized ON public.expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = expenses.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text])
        AND (u.role = 'admin'::text OR u.store_id = expenses.store_id)
    )
  );

-- 2. items ------------------------------------------------------------------
DROP POLICY IF EXISTS items_manage_authorized ON public.items;

CREATE POLICY items_manage_authorized ON public.items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = items.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = items.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])
    )
  );

-- 3. stock_levels -----------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_levels'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.stock_levels', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY stock_levels_select_tenant_isolated ON public.stock_levels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = stock_levels.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
    )
  );

CREATE POLICY stock_levels_write_authorized ON public.stock_levels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = stock_levels.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.stores s ON s.id = stock_levels.store_id
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = s.tenant_id
        AND u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])
    )
  );
