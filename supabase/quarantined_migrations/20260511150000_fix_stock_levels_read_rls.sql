-- =============================================================================
-- Migration: Fix stock_levels_read RLS — Add Tenant/Store Isolation
-- Date: 2026-05-11
-- Issue: CRITICAL — stock_levels_read policy used USING (true), allowing any
--         authenticated user to read ALL stock levels across ALL stores/tenants.
-- Fix: Scope reads by user's assigned store (cashiers) or tenant
--       (admins/managers/advisors via stores.tenant_id join).
-- =============================================================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "stock_levels_read" ON public.stock_levels
-- Create tenant/store-scoped read policy
CREATE POLICY "stock_levels_read"
  ON public.stock_levels
  FOR SELECT
  TO authenticated
  USING (
    -- Cashier: only see stock for their assigned store
    store_id = public.get_current_user_store_id()
    OR
    -- Admin/manager/advisor: see stock for all stores in their tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = (
          SELECT s.tenant_id
          FROM public.stores s
          WHERE s.id = stock_levels.store_id
        )
    )
  )
