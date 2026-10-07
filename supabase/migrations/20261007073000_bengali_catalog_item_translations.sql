-- Migration: 20261007073000_bengali_catalog_item_translations.sql
-- Description: Establishes tenant-isolated item_translations schema with workflow gates and search vector support.

CREATE TABLE IF NOT EXISTS public.item_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'bn',
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  origin text,
  search_terms text[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'reviewed', 'published')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_translations_locale_bn CHECK (locale = 'bn'),
  CONSTRAINT item_translations_item_locale_unique UNIQUE (item_id, locale)
);

ALTER TABLE public.item_translations ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.item_translations ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Indexes for tenant querying, storefront status filtering, and GIN token search
CREATE INDEX IF NOT EXISTS item_translations_tenant_status_idx
  ON public.item_translations (tenant_id, review_status);

CREATE INDEX IF NOT EXISTS item_translations_item_id_idx
  ON public.item_translations (item_id);

CREATE INDEX IF NOT EXISTS item_translations_search_terms_gin_idx
  ON public.item_translations USING gin (search_terms);

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_item_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_item_translations_updated_at ON public.item_translations;
CREATE TRIGGER trigger_item_translations_updated_at
  BEFORE UPDATE ON public.item_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_item_translations_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.item_translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.item_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.item_translations TO authenticated;

-- Helper function to verify active store items across tenant boundary without exposing items RLS directly
CREATE OR REPLACE FUNCTION public.is_active_store_item(p_item_id uuid, p_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.items i
    WHERE i.id = p_item_id
      AND i.tenant_id = p_tenant_id
      AND i.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_active_store_item(uuid, uuid) TO anon, authenticated;

-- Public read access: ONLY published translations for active store items
DROP POLICY IF EXISTS "item_translations_public_published" ON public.item_translations;
CREATE POLICY "item_translations_public_published"
  ON public.item_translations FOR SELECT TO anon
  USING (
    review_status = 'published'
    AND public.is_active_store_item(item_id, tenant_id)
  );

-- Staff read access: All items within tenant
DROP POLICY IF EXISTS "item_translations_staff_select" ON public.item_translations;
CREATE POLICY "item_translations_staff_select"
  ON public.item_translations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = item_translations.tenant_id
    )
  );

-- Admin & Manager mutate access
DROP POLICY IF EXISTS "item_translations_admin_manager_insert" ON public.item_translations;
CREATE POLICY "item_translations_admin_manager_insert"
  ON public.item_translations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
    )
  );

DROP POLICY IF EXISTS "item_translations_admin_manager_update" ON public.item_translations;
CREATE POLICY "item_translations_admin_manager_update"
  ON public.item_translations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_translations.item_id
        AND i.tenant_id = item_translations.tenant_id
    )
  );

DROP POLICY IF EXISTS "item_translations_admin_manager_delete" ON public.item_translations;
CREATE POLICY "item_translations_admin_manager_delete"
  ON public.item_translations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tenant_id = item_translations.tenant_id
        AND u.role IN ('admin', 'manager')
    )
  );
