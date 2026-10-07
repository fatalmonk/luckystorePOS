-- P0 security: users privilege escalation + unrestricted authenticated reads.
--
-- Design: tenant admins (users.role = 'admin') may create/edit/delete staff rows in THEIR tenant
-- from inside the app. Everyone else may only edit non-authorization columns of their own row.
-- Auth-account creation itself happens in the create-staff-user edge function (service role).
-- Deferred (needs live verification + app change): products/categories true-policies,
-- anon search_items_pos/search_products (storefront checkout uses search_items_pos as anon).

-- Helper: avoids RLS recursion on users. SECURITY DEFINER, fixed search_path, no anon access.
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid())
      AND u.role = 'admin'
      AND u.tenant_id = p_tenant_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_tenant_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated, service_role;

-- Remove every existing client write policy on users (incl. self-insert / self-update).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (roles && ARRAY['authenticated', 'anon', 'public']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.users', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.users FROM anon, PUBLIC;

DROP POLICY IF EXISTS users_admin_select_tenant ON public.users;
CREATE POLICY users_admin_select_tenant ON public.users
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY users_admin_insert_tenant ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY users_update_self_or_tenant_admin ON public.users
  FOR UPDATE TO authenticated
  USING (auth_id = (SELECT auth.uid()) OR public.is_tenant_admin(tenant_id))
  WITH CHECK (auth_id = (SELECT auth.uid()) OR public.is_tenant_admin(tenant_id));

CREATE POLICY users_admin_delete_tenant ON public.users
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id) AND auth_id IS DISTINCT FROM (SELECT auth.uid()));

-- Non-admins (and admins of another tenant) cannot touch authorization columns,
-- even on their own row. Service role / postgres bypass.
CREATE OR REPLACE FUNCTION public.guard_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (NEW.role, NEW.tenant_id, NEW.store_id, NEW.pos_pin, NEW.pos_pin_hash, NEW.auth_id, NEW.email)
     IS DISTINCT FROM
     (OLD.role, OLD.tenant_id, OLD.store_id, OLD.pos_pin, OLD.pos_pin_hash, OLD.auth_id, OLD.email)
     AND NOT (public.is_tenant_admin(OLD.tenant_id) AND public.is_tenant_admin(NEW.tenant_id))
  THEN
    RAISE EXCEPTION 'Not authorized to change role, tenant, store, PIN, or identity fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_users_privileged_columns ON public.users;
CREATE TRIGGER trg_guard_users_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_privileged_columns();

-- wishlist (customer phones) and ledger_workers: drop open authenticated/anon SELECT policies.
-- Verified: wishlist accessed via service-role API route only; ledger_workers has no client caller.
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
  IF has_table_privilege('anon', 'public.users', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'anon still has privileges on public.users';
  END IF;
END $$;
