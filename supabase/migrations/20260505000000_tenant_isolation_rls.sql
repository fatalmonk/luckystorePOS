-- =============================================================================
-- Migration: Tenant Isolation for RLS Policies
-- Issue: stores and categories SELECT policies allowed any authenticated user
--        to read all records across all tenants
-- =============================================================================

-- =============================================================================
-- 1) Helper function: Get current user's tenant_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- =============================================================================
-- 2) Helper function: Get current user's store_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT store_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- =============================================================================
-- 3) Fix stores SELECT policy - restrict to user's tenant
-- =============================================================================

DO $$
BEGIN
  -- Only apply if stores table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stores'
  ) THEN
    DROP POLICY IF EXISTS "stores_select_authenticated" ON public.stores;
    DROP POLICY IF EXISTS "stores_select_tenant_isolated" ON public.stores;
    
    CREATE POLICY "stores_select_tenant_isolated"
      ON public.stores
      FOR SELECT
      TO authenticated
      USING (
        tenant_id = public.get_current_user_tenant_id()
        OR
        -- Admin/manager can see stores they have access to
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor')
            AND u.tenant_id = tenant_id
        )
      );
  ELSE
    RAISE NOTICE 'Table stores does not exist, skipping policy creation';
  END IF;
END $$;

-- =============================================================================
-- 4) Fix categories SELECT policy - restrict to user's store/tenant
-- =============================================================================
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_select_tenant_isolated" ON public.categories;

-- Check if categories has store_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'store_id'
  ) THEN
    -- Categories are per-store
    CREATE POLICY "categories_select_tenant_isolated"
      ON public.categories
      FOR SELECT
      TO authenticated
      USING (
        store_id = public.get_current_user_store_id()
        OR
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor')
            AND u.store_id = store_id
        )
      );
  ELSE
    -- Categories are global per-tenant
    CREATE POLICY "categories_select_tenant_isolated"
      ON public.categories
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND (
              -- Match by tenant if categories has tenant_id
              (EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'categories' AND column_name = 'tenant_id'
              ) AND tenant_id = u.tenant_id)
              OR
              -- Otherwise allow admin/manager roles
              u.role IN ('admin', 'manager', 'advisor')
            )
        )
      );
  END IF;
END $$;

-- =============================================================================
-- 5) Additional security: Ensure stores INSERT/UPDATE/DELETE check tenant
-- =============================================================================
DROP POLICY IF EXISTS "stores_insert_admin_manager" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_tenant_scoped" ON public.stores;

CREATE POLICY "stores_insert_tenant_scoped"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be admin/manager in the same tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = tenant_id
    )
  );

DROP POLICY IF EXISTS "stores_update_admin_manager" ON public.stores;
DROP POLICY IF EXISTS "stores_update_tenant_scoped" ON public.stores;

CREATE POLICY "stores_update_tenant_scoped"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = tenant_id
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = tenant_id
    )
  );

DROP POLICY IF EXISTS "stores_delete_admin_manager" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_tenant_scoped" ON public.stores;

CREATE POLICY "stores_delete_tenant_scoped"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = tenant_id
    )
  );

-- =============================================================================
-- 6) Additional security: Ensure categories INSERT/UPDATE/DELETE check store/tenant
-- =============================================================================
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_tenant_scoped" ON public.categories;

CREATE POLICY "categories_insert_tenant_scoped"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND (
          -- If categories has store_id, must match user's store
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'store_id')
           OR store_id = u.store_id)
          AND
          -- If categories has tenant_id, must match user's tenant
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'tenant_id')
           OR tenant_id = u.tenant_id)
        )
    )
  );

DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_update_tenant_scoped" ON public.categories;

CREATE POLICY "categories_update_tenant_scoped"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND (
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'store_id')
           OR store_id = u.store_id)
          AND
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'tenant_id')
           OR tenant_id = u.tenant_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND (
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'store_id')
           OR store_id = u.store_id)
          AND
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'tenant_id')
           OR tenant_id = u.tenant_id)
        )
    )
  );

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_tenant_scoped" ON public.categories;

CREATE POLICY "categories_delete_tenant_scoped"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND (
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'store_id')
           OR store_id = u.store_id)
          AND
          (NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'categories' AND column_name = 'tenant_id')
           OR tenant_id = u.tenant_id)
        )
    )
  );

-- =============================================================================
-- 7) Grant execute permissions on helper functions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_store_id() TO authenticated;
