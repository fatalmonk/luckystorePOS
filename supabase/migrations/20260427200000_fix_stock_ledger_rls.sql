-- =============================================================================
-- Corrective Migration: Fix stock_ledger RLS policies
-- Date: 2026-04-27
-- Purpose:
--   The original stock_ledger migration referenced `public.user_stores` in its
--   RLS policies, a table that doesn't exist in this schema. This migration
--   drops and recreates those policies using the correct `public.users` join.
-- =============================================================================

-- Drop the broken policies that reference the non-existent user_stores table
DROP POLICY IF EXISTS stock_ledger_read_authenticated ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_insert_authenticated ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_service_role_all ON public.stock_ledger;
DROP POLICY IF EXISTS stock_ledger_service_role_insert ON public.stock_ledger;

-- Recreate SELECT policy: authenticated users can read their store's ledger
CREATE POLICY stock_ledger_read_authenticated
  ON public.stock_ledger FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.store_id = stock_ledger.store_id
    )
  );

-- Recreate INSERT policy: authenticated users can insert for their store
CREATE POLICY stock_ledger_insert_authenticated
  ON public.stock_ledger FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.store_id = stock_ledger.store_id
    )
  );

-- Service role bypass — single unified policy
CREATE POLICY stock_ledger_service_role_all
  ON public.stock_ledger
  TO service_role
  USING (true)
  WITH CHECK (true);
