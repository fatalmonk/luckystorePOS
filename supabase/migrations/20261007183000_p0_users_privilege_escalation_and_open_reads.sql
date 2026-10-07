-- P0 security: close self-service privilege escalation on public.users and remove
-- unrestricted authenticated reads of wishlist (customer phone numbers) and ledger_workers.
--
-- Verified in repo: no client (admin_web, mobile_app, storefront) writes public.users with a
-- user JWT; the only writer is the service-role webhook. wishlist is accessed only through a
-- service-role API route. ledger_workers has no client caller.
-- Deferred to a follow-up migration (needs live-state verification + app change):
--   products/categories true-policies, anon search_items_pos/search_products
--   (storefront checkout currently calls search_items_pos as anon).

-- 1) users: no JWT-role writes. Staff role/tenant/store/pin changes go through service role
--    or a separately authorized admin RPC.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND cmd IN ('UPDATE', 'INSERT', 'ALL')
      AND (roles && ARRAY['authenticated', 'anon', 'public']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.users', pol.policyname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated, PUBLIC;
REVOKE UPDATE (role, tenant_id, store_id, pos_pin, pos_pin_hash, auth_id, email)
  ON public.users FROM anon, authenticated;

-- 2) Unrestricted authenticated SELECT policies (qual = true) on sensitive tables.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('wishlist', 'ledger_workers')
      AND cmd = 'SELECT'
      AND btrim(qual, '() ') = 'true'
      AND (roles && ARRAY['authenticated', 'anon', 'public']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Fail closed: no remaining open SELECT on these tables, and users not client-writable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('wishlist', 'ledger_workers')
      AND cmd = 'SELECT' AND btrim(qual, '() ') = 'true'
      AND (roles && ARRAY['authenticated', 'anon', 'public']::name[])
  ) THEN
    RAISE EXCEPTION 'Open SELECT policy remains on wishlist/ledger_workers';
  END IF;
  IF has_table_privilege('authenticated', 'public.users', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.users', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated still has write privilege on public.users';
  END IF;
END $$;
