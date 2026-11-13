BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.item_translations
  ADD COLUMN IF NOT EXISTS details jsonb,
  ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.category_translations
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS search_terms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.item_translations ALTER COLUMN review_status SET DEFAULT 'draft';
ALTER TABLE public.category_translations ALTER COLUMN review_status SET DEFAULT 'draft';

-- The workflow trigger owns updated_at so the legacy now()-based triggers
-- cannot overwrite its strictly increasing revision within one transaction.
DROP TRIGGER IF EXISTS trigger_item_translations_updated_at ON public.item_translations;
DROP TRIGGER IF EXISTS trigger_category_translations_updated_at ON public.category_translations;

-- Non-exposed helpers keep privileged catalog/user lookups out of the Data API.
CREATE SCHEMA IF NOT EXISTS translation_private;

CREATE OR REPLACE FUNCTION translation_private.is_evidence_snapshot(p_snapshot jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_key text;
  v_uri jsonb;
BEGIN
  IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
     OR NOT (p_snapshot ?& ARRAY['entityId', 'sourceName', 'sourceDescription', 'sku', 'barcode', 'brand', 'packageText', 'sourceUris', 'snapshotSha256', 'observedAt']) THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(p_snapshot->'entityId') <> 'string'
     OR (p_snapshot->>'entityId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR jsonb_typeof(p_snapshot->'sourceName') <> 'string'
     OR btrim(p_snapshot->>'sourceName') = ''
     OR jsonb_typeof(p_snapshot->'snapshotSha256') <> 'string'
     OR (p_snapshot->>'snapshotSha256') !~* '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_snapshot->'observedAt') <> 'string'
     OR (p_snapshot->>'observedAt') !~* '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
    RETURN false;
  END IF;
  FOREACH v_key IN ARRAY ARRAY['sourceDescription', 'sku', 'barcode', 'brand', 'packageText'] LOOP
    IF jsonb_typeof(p_snapshot->v_key) NOT IN ('string', 'null') THEN RETURN false; END IF;
  END LOOP;
  IF jsonb_typeof(p_snapshot->'sourceUris') <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p_snapshot->'sourceUris') = 0 THEN RETURN false; END IF;
  FOR v_uri IN SELECT value FROM jsonb_array_elements(p_snapshot->'sourceUris') LOOP
    IF jsonb_typeof(v_uri) <> 'string'
       OR (v_uri #>> '{}') !~* '^https?://[^[:space:]/]+(/[^[:space:]]*)?$' THEN RETURN false; END IF;
  END LOOP;
  PERFORM (p_snapshot->>'observedAt')::timestamptz;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION translation_private.is_product_details(p_details jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_key text;
  v_entry jsonb;
  v_fields text[];
BEGIN
  IF p_details IS NULL OR p_details = 'null'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(p_details) <> 'object' THEN RETURN false; END IF;
  IF (p_details - ARRAY['summary', 'highlights', 'specifications', 'usageDirections', 'storageInstructions', 'faqs']) <> '{}'::jsonb THEN RETURN false; END IF;
  FOREACH v_key IN ARRAY ARRAY['summary', 'usageDirections', 'storageInstructions'] LOOP
    IF p_details ? v_key AND (jsonb_typeof(p_details->v_key) <> 'string' OR btrim(p_details->>v_key) = '') THEN RETURN false; END IF;
  END LOOP;
  IF p_details ? 'highlights' THEN
    IF jsonb_typeof(p_details->'highlights') <> 'array' THEN RETURN false; END IF;
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_details->'highlights') LOOP
      IF jsonb_typeof(v_entry) <> 'string' OR btrim(v_entry #>> '{}') = '' THEN RETURN false; END IF;
    END LOOP;
  END IF;
  FOREACH v_key IN ARRAY ARRAY['specifications', 'faqs'] LOOP
    IF p_details ? v_key THEN
      IF jsonb_typeof(p_details->v_key) <> 'array' THEN RETURN false; END IF;
      v_fields := CASE WHEN v_key = 'specifications' THEN ARRAY['label', 'value'] ELSE ARRAY['question', 'answer'] END;
      FOR v_entry IN SELECT value FROM jsonb_array_elements(p_details->v_key) LOOP
        IF jsonb_typeof(v_entry) <> 'object'
           OR NOT (v_entry ?& v_fields) OR (v_entry - v_fields) <> '{}'::jsonb
           OR jsonb_typeof(v_entry->v_fields[1]) <> 'string' OR btrim(v_entry->>v_fields[1]) = ''
           OR jsonb_typeof(v_entry->v_fields[2]) <> 'string' OR btrim(v_entry->>v_fields[2]) = '' THEN RETURN false; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- Packaging currently lives in canonical names/descriptions, not a POS column.
CREATE OR REPLACE FUNCTION translation_private.package_text(p_name text, p_description text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(
    (regexp_match(p_name, '\m([0-9]+(\.[0-9]+)?[[:space:]]*(kg|gm|g|ml|l|pcs?|pieces?|grams?|litres?|liters?))\M', 'i'))[1],
    (regexp_match(p_description, '\m([0-9]+(\.[0-9]+)?[[:space:]]*(kg|gm|g|ml|l|pcs?|pieces?|grams?|litres?|liters?))\M', 'i'))[1]
  );
$$;

CREATE OR REPLACE FUNCTION translation_private.matches_evidence(
  p_kind text, p_entity_id uuid, p_tenant_id uuid, p_snapshot jsonb
)
RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  v_source record;
BEGIN
  IF NOT translation_private.is_evidence_snapshot(p_snapshot) THEN RETURN false; END IF;
  IF p_kind = 'item' THEN
    SELECT i.name, i.description, i.sku, i.barcode, i.brand
      INTO v_source FROM public.items i WHERE i.id = p_entity_id AND i.tenant_id = p_tenant_id;
    IF NOT FOUND THEN RETURN false; END IF;
    RETURN (p_snapshot->>'entityId') = p_entity_id::text
      AND (p_snapshot->>'sourceName') = v_source.name
      AND (p_snapshot->>'sourceDescription') IS NOT DISTINCT FROM v_source.description
      AND (p_snapshot->>'sku') IS NOT DISTINCT FROM v_source.sku
      AND (p_snapshot->>'barcode') IS NOT DISTINCT FROM v_source.barcode
      AND (p_snapshot->>'brand') IS NOT DISTINCT FROM v_source.brand
      AND (p_snapshot->>'packageText') IS NOT DISTINCT FROM translation_private.package_text(v_source.name, v_source.description);
  ELSIF p_kind = 'category' THEN
    SELECT c.name, c.description INTO v_source FROM public.categories c
      WHERE c.id = p_entity_id AND c.tenant_id = p_tenant_id;
    IF NOT FOUND THEN RETURN false; END IF;
    RETURN (p_snapshot->>'entityId') = p_entity_id::text
      AND (p_snapshot->>'sourceName') = v_source.name
      AND (p_snapshot->>'sourceDescription') IS NOT DISTINCT FROM v_source.description
      AND (p_snapshot->>'sku') IS NULL AND (p_snapshot->>'barcode') IS NULL
      AND (p_snapshot->>'brand') IS NULL AND (p_snapshot->>'packageText') IS NULL;
  END IF;
  RETURN false;
END;
$$;

-- NOT VALID preserves legacy rows for Task 12 remediation, but PostgreSQL
-- enforces every check on new/updated rows. Legacy copy is hidden by RLS below.
ALTER TABLE public.item_translations
  ADD CONSTRAINT item_translations_evidence_shape_check
    CHECK (evidence_snapshot IS NULL OR translation_private.is_evidence_snapshot(evidence_snapshot)) NOT VALID,
  ADD CONSTRAINT item_translations_details_shape_check
    CHECK (translation_private.is_product_details(details)) NOT VALID,
  ADD CONSTRAINT item_translations_publication_ready_check CHECK (
    (review_status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NULL AND published_at IS NULL AND translation_private.is_evidence_snapshot(evidence_snapshot))
    OR (review_status = 'published' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NOT NULL AND published_at IS NOT NULL AND published_at >= reviewed_at AND translation_private.is_evidence_snapshot(evidence_snapshot))
  ) NOT VALID;

ALTER TABLE public.category_translations
  ADD CONSTRAINT category_translations_evidence_shape_check
    CHECK (evidence_snapshot IS NULL OR translation_private.is_evidence_snapshot(evidence_snapshot)) NOT VALID,
  ADD CONSTRAINT category_translations_publication_ready_check CHECK (
    (review_status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NULL AND published_at IS NULL AND translation_private.is_evidence_snapshot(evidence_snapshot))
    OR (review_status = 'published' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NOT NULL AND published_at IS NOT NULL AND published_at >= reviewed_at AND translation_private.is_evidence_snapshot(evidence_snapshot))
  ) NOT VALID;

CREATE OR REPLACE FUNCTION translation_private.guard_workflow()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_kind text := TG_ARGV[0];
  v_entity_id uuid := (to_jsonb(NEW)->>(TG_ARGV[0] || '_id'))::uuid;
  v_owner_tenant uuid;
  v_actor uuid;
  v_content_changed boolean;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'UPDATE' AND v_now <= OLD.updated_at THEN
    v_now := OLD.updated_at + interval '1 microsecond';
  END IF;
  IF v_kind = 'item' THEN
    SELECT i.tenant_id INTO v_owner_tenant FROM public.items i WHERE i.id = v_entity_id;
  ELSE
    SELECT c.tenant_id INTO v_owner_tenant FROM public.categories c WHERE c.id = v_entity_id;
  END IF;
  IF v_owner_tenant IS NULL OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Translation must belong to its canonical catalog tenant' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := v_now;
  IF TG_OP = 'INSERT' THEN
    IF NEW.review_status <> 'draft' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL
       OR NEW.published_by IS NOT NULL OR NEW.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'New translations must be unattributed drafts' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.id, NEW.tenant_id, NEW.locale, v_entity_id) IS DISTINCT FROM
     (OLD.id, OLD.tenant_id, OLD.locale, (to_jsonb(OLD)->>(v_kind || '_id'))::uuid) THEN
    RAISE EXCEPTION 'Translation identity and tenant cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  IF NEW.review_status = 'draft' THEN
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.published_by := NULL;
    NEW.published_at := NULL;
    RETURN NEW;
  END IF;
  v_content_changed :=
    (to_jsonb(NEW) - ARRAY['review_status', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at', 'updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['review_status', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at', 'updated_at']);
  IF NEW.review_status = OLD.review_status
     AND (NEW.reviewed_by, NEW.reviewed_at, NEW.published_by, NEW.published_at) IS DISTINCT FROM
         (OLD.reviewed_by, OLD.reviewed_at, OLD.published_by, OLD.published_at) THEN
    RAISE EXCEPTION 'Review and publication attribution is managed by workflow actions' USING ERRCODE = '42501';
  END IF;
  IF v_content_changed THEN
    RAISE EXCEPTION 'Save changed copy as a draft before reviewing or publishing' USING ERRCODE = '23514';
  END IF;
  IF NEW.review_status = OLD.review_status THEN RETURN NEW; END IF;
  IF NOT ((OLD.review_status = 'draft' AND NEW.review_status = 'reviewed')
       OR (OLD.review_status = 'reviewed' AND NEW.review_status = 'published')) THEN
    RAISE EXCEPTION 'Translations require separate draft, review and publish actions' USING ERRCODE = '23514';
  END IF;
  SELECT u.id INTO v_actor FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = NEW.tenant_id AND u.role IN ('admin', 'manager');
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Review and publication require an authenticated tenant administrator or manager' USING ERRCODE = '42501';
  END IF;
  IF NOT translation_private.matches_evidence(v_kind, v_entity_id, NEW.tenant_id, NEW.evidence_snapshot) THEN
    RAISE EXCEPTION 'Complete evidence must match the canonical name, description, SKU, barcode, brand and package' USING ERRCODE = '23514';
  END IF;
  IF NEW.review_status = 'reviewed' THEN
    IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by <> v_actor THEN
      RAISE EXCEPTION 'Reviewer must be the acting public user' USING ERRCODE = '42501';
    END IF;
    NEW.reviewed_by := v_actor;
    NEW.reviewed_at := v_now;
    NEW.published_by := NULL;
    NEW.published_at := NULL;
  ELSE
    IF OLD.reviewed_by IS NULL OR OLD.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'Publication requires prior attributed review' USING ERRCODE = '23514';
    END IF;
    IF (NEW.reviewed_by, NEW.reviewed_at) IS DISTINCT FROM (OLD.reviewed_by, OLD.reviewed_at)
       OR (NEW.published_by IS NOT NULL AND NEW.published_by <> v_actor) THEN
      RAISE EXCEPTION 'Publisher must be the acting public user and preserve prior review' USING ERRCODE = '42501';
    END IF;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.published_by := v_actor;
    NEW.published_at := v_now;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_item_translation_workflow
  BEFORE INSERT OR UPDATE ON public.item_translations
  FOR EACH ROW EXECUTE FUNCTION translation_private.guard_workflow('item');
CREATE TRIGGER guard_category_translation_workflow
  BEFORE INSERT OR UPDATE ON public.category_translations
  FOR EACH ROW EXECUTE FUNCTION translation_private.guard_workflow('category');

CREATE OR REPLACE FUNCTION translation_private.is_publication_eligible(
  p_kind text, p_entity_id uuid, p_tenant_id uuid, p_status text, p_snapshot jsonb,
  p_reviewed_by uuid, p_reviewed_at timestamptz, p_published_by uuid, p_published_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_status IS DISTINCT FROM 'published' OR p_reviewed_by IS NULL OR p_reviewed_at IS NULL
     OR p_published_by IS NULL OR p_published_at IS NULL OR p_published_at < p_reviewed_at
     OR NOT translation_private.matches_evidence(p_kind, p_entity_id, p_tenant_id, p_snapshot) THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_reviewed_by AND u.tenant_id = p_tenant_id AND u.role IN ('admin', 'manager'))
     OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_published_by AND u.tenant_id = p_tenant_id AND u.role IN ('admin', 'manager'))
     OR NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.tenant_id = p_tenant_id AND s.metadata @> '{"is_public_storefront":true}'::jsonb) THEN RETURN false; END IF;
  IF p_kind = 'item' THEN
    RETURN EXISTS (SELECT 1 FROM public.items i WHERE i.id = p_entity_id AND i.tenant_id = p_tenant_id AND i.is_active = true);
  ELSIF p_kind = 'category' THEN
    RETURN EXISTS (SELECT 1 FROM public.categories c WHERE c.id = p_entity_id AND c.tenant_id = p_tenant_id AND c.active = true);
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION translation_private.is_evidence_snapshot(jsonb), translation_private.is_product_details(jsonb),
  translation_private.package_text(text, text), translation_private.matches_evidence(text, uuid, uuid, jsonb),
  translation_private.guard_workflow(), translation_private.is_publication_eligible(text, uuid, uuid, text, jsonb, uuid, timestamptz, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA translation_private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION translation_private.is_evidence_snapshot(jsonb), translation_private.is_product_details(jsonb)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION translation_private.is_publication_eligible(text, uuid, uuid, text, jsonb, uuid, timestamptz, uuid, timestamptz)
  TO anon;

ALTER TABLE public.item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS item_translations_public_published ON public.item_translations;
CREATE POLICY item_translations_public_published ON public.item_translations FOR SELECT TO anon USING (
  translation_private.is_publication_eligible('item', item_id, tenant_id, review_status, evidence_snapshot, reviewed_by, reviewed_at, published_by, published_at)
  AND translation_private.is_product_details(details)
);
DROP POLICY IF EXISTS category_translations_public_published ON public.category_translations;
CREATE POLICY category_translations_public_published ON public.category_translations FOR SELECT TO anon USING (
  translation_private.is_publication_eligible('category', category_id, tenant_id, review_status, evidence_snapshot, reviewed_by, reviewed_at, published_by, published_at)
);

-- Resolve the auth UUID through users.auth_id; persist users.id as attribution.
-- Existing staff reads remain tenant-scoped and only admins/managers can mutate.
DO $$
DECLARE
  v_kind text;
  v_table text;
  v_catalog text;
  v_operation text;
BEGIN
  FOREACH v_kind IN ARRAY ARRAY['item', 'category'] LOOP
    v_table := v_kind || '_translations';
    v_catalog := CASE WHEN v_kind = 'item' THEN 'items' ELSE 'categories' END;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_staff_select', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = %I.tenant_id)
      AND EXISTS (SELECT 1 FROM public.%I c WHERE c.id = %I.%I AND c.tenant_id = %I.tenant_id)
    )', v_table || '_staff_select', v_table, v_table, v_catalog, v_table, v_kind || '_id', v_table);
    FOREACH v_operation IN ARRAY ARRAY['insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_admin_manager_' || v_operation, v_table);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = %I.tenant_id AND u.role IN (''admin'', ''manager''))
        AND EXISTS (SELECT 1 FROM public.%I c WHERE c.id = %I.%I AND c.tenant_id = %I.tenant_id)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = %I.tenant_id AND u.role IN (''admin'', ''manager''))
        AND EXISTS (SELECT 1 FROM public.%I c WHERE c.id = %I.%I AND c.tenant_id = %I.tenant_id)
      )', v_table || '_admin_manager_mutate', v_table, v_table, v_catalog, v_table, v_kind || '_id', v_table, v_table, v_catalog, v_table, v_kind || '_id', v_table);
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS category_translations_search_terms_gin_idx
  ON public.category_translations USING gin (search_terms);
CREATE INDEX IF NOT EXISTS item_translations_published_lookup_idx
  ON public.item_translations (item_id, tenant_id) WHERE review_status = 'published';
CREATE INDEX IF NOT EXISTS category_translations_published_lookup_idx
  ON public.category_translations (category_id, tenant_id) WHERE review_status = 'published';

COMMIT;
