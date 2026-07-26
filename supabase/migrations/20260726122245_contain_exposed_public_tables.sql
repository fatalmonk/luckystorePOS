-- Forward containment for three application tables exposed through the Data API
-- with RLS disabled and broad anon/authenticated grants.
--
-- cart_sessions intentionally remains inaccessible to client roles until
-- ownership is bound to a signed server-authorized identity.

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.parties FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.promos FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.cart_sessions FROM anon, authenticated;

-- Authenticated POS/admin clients use parties directly. Existing tenant-scoped
-- policies remain the authorization boundary once RLS is enabled.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.parties
  TO authenticated;

-- Remove the older overlapping SELECT policy. The remaining
-- parties_authenticated_select policy uses the canonical tenant helper.
DROP POLICY IF EXISTS parties_select_tenant ON public.parties;

-- Storefront promotion access is read-only and limited to currently active
-- promotions. Management remains service-role/server-side.
DROP POLICY IF EXISTS promos_public_read_active ON public.promos;
CREATE POLICY promos_public_read_active
  ON public.promos
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active IS TRUE
    AND (starts_at IS NULL OR starts_at <= now())
    AND ends_at > now()
  );

GRANT SELECT
  ON TABLE public.promos
  TO anon, authenticated;
