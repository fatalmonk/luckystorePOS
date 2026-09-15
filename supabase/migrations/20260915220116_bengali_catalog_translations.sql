-- Bengali catalog translations for Phase 4B PR 3.
-- Translation rows are tenant-scoped and become public only after editorial review.

CREATE TABLE IF NOT EXISTS public.item_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'bn',
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  search_terms text[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'reviewed', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_translations_locale_bn CHECK (locale = 'bn'),
  CONSTRAINT item_translations_item_locale_unique UNIQUE (item_id, locale)
);

CREATE TABLE IF NOT EXISTS public.category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'bn',
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  seo_title text,
  seo_description text,
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'reviewed', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_translations_locale_bn CHECK (locale = 'bn'),
  CONSTRAINT category_translations_category_locale_unique UNIQUE (category_id, locale)
);

CREATE INDEX IF NOT EXISTS item_translations_tenant_status_idx
  ON public.item_translations (tenant_id, review_status);
CREATE INDEX IF NOT EXISTS category_translations_tenant_status_idx
  ON public.category_translations (tenant_id, review_status);
CREATE INDEX IF NOT EXISTS item_translations_search_terms_gin_idx
  ON public.item_translations USING gin (search_terms);

ALTER TABLE public.item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.item_translations, public.category_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.item_translations, public.category_translations TO authenticated;

-- Public storefront visibility is limited to reviewed, published copy and active items.
CREATE POLICY "item_translations_public_published"
  ON public.item_translations FOR SELECT TO anon
  USING (
    review_status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.is_active = true
    )
  );

CREATE POLICY "category_translations_public_published"
  ON public.category_translations FOR SELECT TO anon
  USING (review_status = 'published');

-- Staff can read and manage only translations belonging to their tenant.
CREATE POLICY "item_translations_staff_select"
  ON public.item_translations FOR SELECT TO authenticated
  USING (tenant_id = (SELECT public.get_current_user_tenant_id()));

CREATE POLICY "category_translations_staff_select"
  ON public.category_translations FOR SELECT TO authenticated
  USING (tenant_id = (SELECT public.get_current_user_tenant_id()));

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
  WITH CHECK (tenant_id = (SELECT public.get_current_user_tenant_id()));

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
  WITH CHECK (tenant_id = (SELECT public.get_current_user_tenant_id()));

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
  );
