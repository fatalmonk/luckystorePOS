-- Migration: Deduplicate parties RLS policies
-- Issue: Multiple migrations created overlapping policies
-- Fix: Drop all parties policies, recreate only the correct ones

-- Drop ALL existing parties policies
DROP POLICY IF EXISTS "parties_select_tenant" ON public.parties;
DROP POLICY IF EXISTS "parties_select_tenant_isolated" ON public.parties;
DROP POLICY IF EXISTS "parties_service_all" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_select" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_insert" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_update" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_delete" ON public.parties;

-- Enable RLS (idempotent)
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Recreate only the correct policies (from 20260517170305_fix_parties_rls.sql)
-- Service role: full access (for Vercel admin dashboard)
CREATE POLICY "parties_service_all" ON public.parties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: select only their tenant
CREATE POLICY "parties_authenticated_select" ON public.parties
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_current_user_tenant_id());

-- Authenticated users: insert only their tenant
CREATE POLICY "parties_authenticated_insert" ON public.parties
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_current_user_tenant_id());

-- Authenticated users: update only their tenant
CREATE POLICY "parties_authenticated_update" ON public.parties
  FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_current_user_tenant_id())
  WITH CHECK (tenant_id = public.get_current_user_tenant_id());

-- Authenticated users: delete only their tenant
CREATE POLICY "parties_authenticated_delete" ON public.parties
  FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_current_user_tenant_id());
