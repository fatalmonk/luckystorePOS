-- Add missing DELETE policy for daily_sales table.
-- SELECT, INSERT, UPDATE policies already exist (20260518000000_dedupe_daily_sales_policies.sql).
-- Without this, supabase.from('daily_sales').delete() would fail silently or return RLS error.

CREATE POLICY "daily_sales_delete_policy"
  ON public.daily_sales
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.store_users WHERE user_id = auth.uid()
    )
  );
