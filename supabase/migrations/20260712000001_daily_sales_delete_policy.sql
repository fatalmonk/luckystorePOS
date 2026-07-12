-- Add missing DELETE policy for daily_sales table.
-- SELECT, INSERT, UPDATE policies already exist (20260518000000_dedupe_daily_sales_policies.sql).

DROP POLICY IF EXISTS "Managers can delete daily_sales" ON public.daily_sales;
CREATE POLICY "Managers can delete daily_sales"
  ON public.daily_sales
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (SELECT store_id FROM public.users WHERE auth_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager'))
  );
