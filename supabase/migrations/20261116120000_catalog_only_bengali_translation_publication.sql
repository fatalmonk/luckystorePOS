BEGIN;
SET LOCAL lock_timeout = '5s';

-- The bootstrap schema defines category descriptions, but deployed databases
-- may predate that column; make the canonical field available before hashing.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.item_translations
  ADD COLUMN IF NOT EXISTS source_version text;
ALTER TABLE public.category_translations
  ADD COLUMN IF NOT EXISTS source_version text;

ALTER TABLE public.item_translations DROP CONSTRAINT IF EXISTS item_translations_publication_ready_check;
ALTER TABLE public.category_translations DROP CONSTRAINT IF EXISTS category_translations_publication_ready_check;
ALTER TABLE public.item_translations
  ADD CONSTRAINT item_translations_publication_ready_check CHECK (
    (review_status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'published' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND published_by IS NOT NULL AND published_at IS NOT NULL AND published_at >= reviewed_at)
  ) NOT VALID;
ALTER TABLE public.category_translations
  ADD CONSTRAINT category_translations_publication_ready_check CHECK (
    (review_status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NULL AND published_at IS NULL)
    OR (review_status = 'published' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND published_by IS NOT NULL AND published_at IS NOT NULL AND published_at >= reviewed_at)
  ) NOT VALID;

CREATE OR REPLACE FUNCTION translation_private.numeric_tokens(p_text text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(array_agg(translate(match[1], '০১২৩৪৫৬৭৮৯', '0123456789') ORDER BY translate(match[1], '০১২৩৪৫৬৭৮৯', '0123456789')), '{}'::text[])
  FROM regexp_matches(coalesce(p_text, ''), '([0-9০-৯]+(?:[.,][0-9০-৯]+)?)', 'g') AS match;
$$;

CREATE OR REPLACE FUNCTION translation_private.quantity_tokens(p_text text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(array_agg(
    translate(lower(match[1]), '০১২৩৪৫৬৭৮৯', '0123456789') || ':' ||
      CASE lower(match[2])
        WHEN 'grams' THEN 'g' WHEN 'gram' THEN 'g' WHEN 'gm' THEN 'g'
        WHEN 'liters' THEN 'l' WHEN 'liter' THEN 'l' WHEN 'litres' THEN 'l' WHEN 'litre' THEN 'l' WHEN 'ltr' THEN 'l'
        WHEN 'pieces' THEN 'pcs' WHEN 'piece' THEN 'pcs' WHEN 'pc' THEN 'pcs'
        WHEN 'কেজি' THEN 'kg' WHEN 'গ্রাম' THEN 'g' WHEN 'মিলি' THEN 'ml' WHEN 'লিটার' THEN 'l'
        WHEN 'পিস' THEN 'pcs' WHEN 'প্যাক' THEN 'pack'
        ELSE lower(match[2])
      END ORDER BY translate(lower(match[1]), '০১২৩৪৫৬৭৮৯', '0123456789'), lower(match[2])
  ), '{}'::text[])
  FROM regexp_matches(coalesce(p_text, ''), '([0-9০-৯]+(?:[.,][0-9০-৯]+)?)\s*(kg|grams?|gm|mg|g|ml|liters?|litres?|ltr|l|lb|oz|pieces?|pcs?|pack|ct|কেজি|গ্রাম|মিলি|লিটার|পিস|প্যাক)(?![[:alpha:]])', 'gi') AS match;
$$;

CREATE OR REPLACE FUNCTION translation_private.current_source_version(p_kind text, p_entity_id uuid, p_tenant_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_canonical text;
BEGIN
  IF p_kind = 'item' THEN
    SELECT concat_ws(chr(31), i.id::text, coalesce(i.name, ''), coalesce(i.description, ''), coalesce(i.sku, ''), coalesce(i.barcode, ''), coalesce(i.brand, ''))
      INTO v_canonical FROM public.items i WHERE i.id = p_entity_id AND i.tenant_id = p_tenant_id;
  ELSIF p_kind = 'category' THEN
    SELECT concat_ws(chr(31), c.id::text, coalesce(c.name, ''), coalesce(c.description, ''), '', '', '')
      INTO v_canonical FROM public.categories c WHERE c.id = p_entity_id AND c.tenant_id = p_tenant_id;
  ELSE
    RETURN NULL;
  END IF;
  IF v_canonical IS NULL THEN RETURN NULL; END IF;
  RETURN encode(extensions.digest(convert_to(v_canonical, 'UTF8'), 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION translation_private.valid_catalog_translation(
  p_kind text, p_entity_id uuid, p_tenant_id uuid, p_name text, p_description text,
  p_search_terms text[], p_source_version text
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_source record;
  v_text text := coalesce(p_name, '') || ' ' || coalesce(p_description, '') || ' ' || array_to_string(coalesce(p_search_terms, '{}'::text[]), ' ');
  v_variant text;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' OR p_name !~ '[অ-ঔক-হড়-ঢ়য়]' THEN RETURN false; END IF;
  IF p_kind = 'item' THEN
    SELECT i.name, i.description, i.brand INTO v_source FROM public.items i WHERE i.id = p_entity_id AND i.tenant_id = p_tenant_id;
  ELSE
    SELECT c.name, c.description, NULL::text AS brand INTO v_source FROM public.categories c WHERE c.id = p_entity_id AND c.tenant_id = p_tenant_id;
  END IF;
  IF NOT FOUND OR p_source_version IS DISTINCT FROM translation_private.current_source_version(p_kind, p_entity_id, p_tenant_id) THEN RETURN false; END IF;
  IF coalesce(btrim(v_source.description), '') = '' THEN
    IF nullif(btrim(p_description), '') IS NOT NULL THEN RETURN false; END IF;
  ELSIF p_description IS NULL OR btrim(p_description) = '' OR p_description !~ '[অ-ঔক-হড়-ঢ়য়]' THEN
    RETURN false;
  END IF;
  IF translation_private.numeric_tokens(v_source.name) IS DISTINCT FROM translation_private.numeric_tokens(p_name)
     OR translation_private.quantity_tokens(v_source.name) IS DISTINCT FROM translation_private.quantity_tokens(p_name) THEN RETURN false; END IF;
  IF coalesce(btrim(v_source.description), '') <> '' AND (
    translation_private.numeric_tokens(v_source.description) IS DISTINCT FROM translation_private.numeric_tokens(p_description)
    OR translation_private.quantity_tokens(v_source.description) IS DISTINCT FROM translation_private.quantity_tokens(p_description)
  ) THEN RETURN false; END IF;
  IF v_source.brand IS NOT NULL AND position(lower(v_source.brand) IN lower(v_text)) = 0 THEN RETURN false; END IF;
  FOREACH v_variant IN ARRAY ARRAY['Original', '2X', 'Best of'] LOOP
    IF position(lower(v_variant) IN lower(v_source.name)) > 0 AND position(lower(v_variant) IN lower(p_name)) = 0 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION translation_private.guard_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_kind text := TG_ARGV[0];
  v_entity_id uuid := (to_jsonb(NEW)->>(TG_ARGV[0] || '_id'))::uuid;
  v_owner_tenant uuid;
  v_source_version text;
  v_actor uuid;
  v_content_changed boolean;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'UPDATE' AND v_now <= OLD.updated_at THEN v_now := OLD.updated_at + interval '1 microsecond'; END IF;
  IF v_kind = 'item' THEN SELECT i.tenant_id INTO v_owner_tenant FROM public.items i WHERE i.id = v_entity_id;
  ELSE SELECT c.tenant_id INTO v_owner_tenant FROM public.categories c WHERE c.id = v_entity_id; END IF;
  IF v_owner_tenant IS NULL OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Translation must belong to its canonical catalog tenant' USING ERRCODE = '23514';
  END IF;
  v_source_version := translation_private.current_source_version(v_kind, v_entity_id, NEW.tenant_id);
  IF v_source_version IS NULL THEN RAISE EXCEPTION 'Canonical catalog source is unavailable' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.source_version IS NOT NULL
     AND OLD.source_version IS DISTINCT FROM v_source_version
     AND (NEW.name, NEW.description, NEW.search_terms) IS NOT DISTINCT FROM (OLD.name, OLD.description, OLD.search_terms) THEN
    RAISE EXCEPTION 'Existing translation is stale; regenerate or correct it before saving' USING ERRCODE = '40001';
  END IF;
  IF NEW.source_version IS NOT NULL AND NEW.source_version IS DISTINCT FROM v_source_version THEN
    RAISE EXCEPTION 'Translation source version is stale' USING ERRCODE = '40001';
  END IF;
  NEW.updated_at := v_now;
  NEW.source_version := v_source_version;
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
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.published_by := NULL; NEW.published_at := NULL;
    RETURN NEW;
  END IF;
  v_content_changed :=
    (to_jsonb(NEW) - ARRAY['review_status', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at', 'updated_at', 'source_version']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['review_status', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at', 'updated_at', 'source_version']);
  IF NEW.review_status = OLD.review_status
     AND (NEW.reviewed_by, NEW.reviewed_at, NEW.published_by, NEW.published_at) IS DISTINCT FROM
         (OLD.reviewed_by, OLD.reviewed_at, OLD.published_by, OLD.published_at) THEN
    RAISE EXCEPTION 'Review and publication attribution is managed by workflow actions' USING ERRCODE = '42501';
  END IF;
  IF v_content_changed THEN RAISE EXCEPTION 'Save changed copy as a draft before publishing' USING ERRCODE = '23514'; END IF;
  IF NEW.review_status = OLD.review_status THEN RETURN NEW; END IF;
  IF NOT ((OLD.review_status = 'draft' AND NEW.review_status IN ('reviewed', 'published'))
       OR (OLD.review_status = 'reviewed' AND NEW.review_status = 'published')) THEN
    RAISE EXCEPTION 'Only ready drafts can be published' USING ERRCODE = '23514';
  END IF;
  IF v_kind = 'item' AND NEW.details IS NOT NULL AND NEW.details NOT IN ('null'::jsonb, '{}'::jsonb) THEN
    RAISE EXCEPTION 'Localized product details are outside the catalog translation workflow' USING ERRCODE = '23514';
  END IF;
  SELECT u.id INTO v_actor FROM public.users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.tenant_id = NEW.tenant_id AND u.role IN ('admin', 'manager');
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Publishing requires an authenticated tenant administrator or manager' USING ERRCODE = '42501'; END IF;
  IF NOT translation_private.valid_catalog_translation(v_kind, v_entity_id, NEW.tenant_id, NEW.name, NEW.description, NEW.search_terms, v_source_version) THEN
    RAISE EXCEPTION 'Translation failed canonical catalog validation' USING ERRCODE = '23514';
  END IF;
  IF NEW.review_status = 'reviewed' THEN
    IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by <> v_actor THEN RAISE EXCEPTION 'Reviewer must be the acting user' USING ERRCODE = '42501'; END IF;
    NEW.reviewed_by := v_actor; NEW.reviewed_at := v_now; NEW.published_by := NULL; NEW.published_at := NULL;
  ELSE
    IF OLD.review_status = 'reviewed' THEN
      IF OLD.reviewed_by IS NULL OR OLD.reviewed_at IS NULL THEN RAISE EXCEPTION 'Reviewed translation attribution is missing' USING ERRCODE = '23514'; END IF;
      NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    ELSE
      NEW.reviewed_by := v_actor; NEW.reviewed_at := v_now;
    END IF;
    IF NEW.published_by IS NOT NULL AND NEW.published_by <> v_actor THEN RAISE EXCEPTION 'Publisher must be the acting user' USING ERRCODE = '42501'; END IF;
    NEW.published_by := v_actor; NEW.published_at := v_now;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION translation_private.is_publication_eligible(
  p_kind text, p_entity_id uuid, p_tenant_id uuid, p_status text, p_snapshot jsonb,
  p_reviewed_by uuid, p_reviewed_at timestamptz, p_published_by uuid, p_published_at timestamptz
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_translation record;
  v_current_source_version text;
BEGIN
  IF p_status IS DISTINCT FROM 'published' OR p_reviewed_by IS NULL OR p_reviewed_at IS NULL
     OR p_published_by IS NULL OR p_published_at IS NULL OR p_published_at < p_reviewed_at
     OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_reviewed_by AND u.tenant_id = p_tenant_id AND u.role IN ('admin', 'manager'))
     OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_published_by AND u.tenant_id = p_tenant_id AND u.role IN ('admin', 'manager'))
     OR NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.tenant_id = p_tenant_id AND s.metadata @> '{"is_public_storefront":true}'::jsonb) THEN RETURN false; END IF;
  IF p_kind = 'item' THEN
    SELECT t.name, t.description, t.search_terms, t.source_version, t.details INTO v_translation
      FROM public.item_translations t JOIN public.items i ON i.id = t.item_id AND i.tenant_id = t.tenant_id
      WHERE t.item_id = p_entity_id AND t.tenant_id = p_tenant_id AND t.review_status = 'published' AND i.is_active;
  ELSE
    SELECT t.name, t.description, t.search_terms, t.source_version, NULL::jsonb AS details INTO v_translation
      FROM public.category_translations t JOIN public.categories c ON c.id = t.category_id AND c.tenant_id = t.tenant_id
      WHERE t.category_id = p_entity_id AND t.tenant_id = p_tenant_id AND t.review_status = 'published' AND c.active;
  END IF;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_translation.source_version IS NULL THEN
    v_current_source_version := translation_private.current_source_version(p_kind, p_entity_id, p_tenant_id);
    RETURN translation_private.valid_catalog_translation(p_kind, p_entity_id, p_tenant_id,
      v_translation.name, v_translation.description, v_translation.search_terms, v_current_source_version)
      AND (p_kind <> 'item' OR (translation_private.is_product_details(v_translation.details)
        AND (v_translation.details IS NULL OR v_translation.details IN ('null'::jsonb, '{}'::jsonb))));
  END IF;
  RETURN translation_private.valid_catalog_translation(p_kind, p_entity_id, p_tenant_id,
    v_translation.name, v_translation.description, v_translation.search_terms, v_translation.source_version)
    AND (p_kind <> 'item' OR (translation_private.is_product_details(v_translation.details)
      AND (v_translation.details IS NULL OR v_translation.details IN ('null'::jsonb, '{}'::jsonb))));
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_bengali_translations(p_kind text, p_translation_ids uuid[])
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_count integer;
  v_distinct_count integer;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('item', 'category') OR coalesce(array_length(p_translation_ids, 1), 0) < 1
     OR array_length(p_translation_ids, 1) > 500 THEN RAISE EXCEPTION 'Invalid translation batch' USING ERRCODE = '22023'; END IF;
  SELECT count(DISTINCT id) INTO v_distinct_count FROM unnest(p_translation_ids) id;
  IF v_distinct_count <> array_length(p_translation_ids, 1) THEN RAISE EXCEPTION 'Translation batch contains duplicate IDs' USING ERRCODE = '22023'; END IF;
  IF p_kind = 'item' THEN
    UPDATE public.item_translations SET review_status = 'published'
      WHERE id = ANY(p_translation_ids) AND review_status IN ('draft', 'reviewed');
  ELSE
    UPDATE public.category_translations SET review_status = 'published'
      WHERE id = ANY(p_translation_ids) AND review_status IN ('draft', 'reviewed');
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> array_length(p_translation_ids, 1) THEN RAISE EXCEPTION 'One or more translations changed or are unavailable' USING ERRCODE = '40001'; END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION translation_private.numeric_tokens(text), translation_private.quantity_tokens(text),
  translation_private.current_source_version(text, uuid, uuid),
  translation_private.valid_catalog_translation(text, uuid, uuid, text, text, text[], text),
  translation_private.guard_workflow(),
  translation_private.is_publication_eligible(text, uuid, uuid, text, jsonb, uuid, timestamptz, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION translation_private.is_publication_eligible(text, uuid, uuid, text, jsonb, uuid, timestamptz, uuid, timestamptz) TO anon;
REVOKE ALL ON FUNCTION public.publish_bengali_translations(text, uuid[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.publish_bengali_translations(text, uuid[]) TO authenticated;

COMMIT;
