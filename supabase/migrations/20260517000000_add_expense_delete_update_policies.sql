-- Add missing DELETE and UPDATE policies for expenses table
-- Fixes: "Cannot coerce the result to a single JSON object" error on delete

-- Delete policy: Only admin/manager can delete expenses from their tenant
CREATE POLICY IF NOT EXISTS "expenses_delete" ON public.expenses 
  FOR DELETE 
  TO authenticated 
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1 
      FROM public.users u 
      WHERE u.auth_id = auth.uid() 
        AND u.role IN ('admin', 'manager')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Update policy: Only admin/manager can update expenses from their tenant
CREATE POLICY IF NOT EXISTS "expenses_update" ON public.expenses 
  FOR UPDATE 
  TO authenticated 
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1 
      FROM public.users u 
      WHERE u.auth_id = auth.uid() 
        AND u.role IN ('admin', 'manager')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1 
      FROM public.users u 
      WHERE u.auth_id = auth.uid() 
        AND u.role IN ('admin', 'manager')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );
