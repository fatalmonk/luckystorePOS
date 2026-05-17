-- =============================================================================
-- Migration: Fix Recursive RLS on Users Table
-- Date: 2026-05-12
-- Issue: users_select_tenant_admin policy causes infinite recursion
-- =============================================================================

-- 1) Create a security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin_in_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('admin', 'manager', 'advisor')
      AND tenant_id = p_tenant_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_in_tenant(uuid) TO authenticated;

-- 2) Drop and recreate the problematic policy
DROP POLICY IF EXISTS "users_select_tenant_admin" ON public.users;

CREATE POLICY "users_select_tenant_admin"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (public.is_admin_in_tenant(tenant_id));

-- 3) Ensure other policies are optimized
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());
