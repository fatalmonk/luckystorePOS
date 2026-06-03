-- Fix missing RLS policy for items management
-- The 20260530000000_final_dedupe_cleanup migration accidentally dropped items_manage_authorized without recreating it

CREATE POLICY "items_manage_authorized"
  ON public.items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
      AND u.tenant_id = items.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
      AND u.tenant_id = items.tenant_id
    )
  );
