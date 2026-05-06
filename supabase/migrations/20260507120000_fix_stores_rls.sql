-- Fix RLS policy for stores after the table has been created
-- This migration drops any stale policy and (re)creates it with the correct USING clause.
-- Adjust the USING clause as needed for your security model.
DROP POLICY IF EXISTS "stores_insert_authenticated" ON public.stores;

-- Example policy – replace `true` with the appropriate condition.
CREATE POLICY "stores_insert_authenticated"
  ON public.stores
  FOR INSERT
  TO authenticated
  USING (true);
