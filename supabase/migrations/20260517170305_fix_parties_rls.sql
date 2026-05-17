-- Enable RLS
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "parties_service_all" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_select" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_insert" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_update" ON public.parties;
DROP POLICY IF EXISTS "parties_authenticated_delete" ON public.parties;

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
