-- Keep translation records attached to catalog records in the same tenant.
-- This closes cross-tenant reference and publication paths left by the initial
-- Bengali translation migration.

DROP POLICY IF EXISTS "item_translations_public_published" ON public.item_translations;
DROP POLICY IF EXISTS "category_translations_public_published" ON public.category_translations;
DROP POLICY IF EXISTS "item_translations_admin_manager_insert" ON public.item_translations;
DROP POLICY IF EXISTS "category_translations_admin_manager_insert" ON public.category_translations;
DROP POLICY IF EXISTS "item_translations_admin_manager_update" ON public.item_translations;
DROP POLICY IF EXISTS "category_translations_admin_manager_update" ON public.category_translations;
DROP POLICY IF EXISTS "item_translations_admin_manager_delete" ON public.item_translations;
DROP POLICY IF EXISTS "category_translations_admin_manager_delete" ON public.category_translations;

CREATE POLICY "item_translations_public_published"
  ON public.item_translations FOR SELECT TO anon
  USING (
    review_status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
        AND i.is_active = true
    )
  );

CREATE POLICY "category_translations_public_published"
  ON public.category_translations FOR SELECT TO anon
  USING (
    review_status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_translations.category_id
        AND c.tenant_id = category_translations.tenant_id
        AND c.active = true
    )
  );

CREATE POLICY "item_translations_admin_manager_insert"
  ON public.item_translations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
    )
  );

CREATE POLICY "category_translations_admin_manager_insert"
  ON public.category_translations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = category_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_translations.category_id
        AND c.tenant_id = category_translations.tenant_id
    )
  );

CREATE POLICY "item_translations_admin_manager_update"
  ON public.item_translations FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
    )
  );

CREATE POLICY "category_translations_admin_manager_update"
  ON public.category_translations FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = category_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_translations.category_id
        AND c.tenant_id = category_translations.tenant_id
    )
  );

CREATE POLICY "item_translations_admin_manager_delete"
  ON public.item_translations FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
    )
  );

CREATE POLICY "category_translations_admin_manager_delete"
  ON public.category_translations FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT public.get_current_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = category_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_translations.category_id
        AND c.tenant_id = category_translations.tenant_id
    )
  );
