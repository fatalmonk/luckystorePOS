BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.translation_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  translation_kind text NOT NULL CHECK (translation_kind IN ('item', 'category')),
  translation_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  from_status text CHECK (from_status IS NULL OR from_status IN ('draft', 'reviewed', 'published')),
  to_status text NOT NULL CHECK (to_status IN ('draft', 'reviewed', 'published')),
  action text NOT NULL CHECK (action IN ('save_draft', 'mark_reviewed', 'publish')),
  actor_id uuid REFERENCES public.users(id),
  content_fingerprint text NOT NULL,
  evidence_source_uris jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_source_uris) = 'array'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS translation_review_audit_entity_idx
  ON public.translation_review_audit (tenant_id, translation_kind, entity_id, created_at DESC);

ALTER TABLE public.translation_review_audit ENABLE ROW LEVEL SECURITY;
-- Block direct audit-row writes, including via bypassrls service credentials.
-- The SECURITY DEFINER translation triggers remain the only intended writers.
REVOKE ALL ON public.translation_review_audit FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.translation_review_audit TO authenticated;

DROP POLICY IF EXISTS translation_review_audit_staff_select ON public.translation_review_audit;
CREATE POLICY translation_review_audit_staff_select
  ON public.translation_review_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = translation_review_audit.tenant_id
        AND u.role IN ('admin', 'manager')
    )
  );

CREATE OR REPLACE FUNCTION translation_private.prevent_translation_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Translation review audit records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS prevent_translation_review_audit_update ON public.translation_review_audit;
CREATE TRIGGER prevent_translation_review_audit_update
  BEFORE UPDATE OR DELETE ON public.translation_review_audit
  FOR EACH ROW EXECUTE FUNCTION translation_private.prevent_translation_audit_mutation();

CREATE OR REPLACE FUNCTION translation_private.record_translation_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_entity_id uuid := (to_jsonb(NEW)->>(TG_ARGV[0] || '_id'))::uuid;
  v_actor uuid;
  v_action text;
  v_from text;
  v_to text := NEW.review_status;
  v_fingerprint text;
  v_content jsonb;
BEGIN
  SELECT u.id INTO v_actor
    FROM public.users u
   WHERE u.auth_id = (SELECT auth.uid())
     AND u.tenant_id = NEW.tenant_id
     AND u.role IN ('admin', 'manager');

  v_content := to_jsonb(NEW) - ARRAY['updated_at', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at'];
  v_fingerprint := md5(v_content::text);

  IF TG_OP = 'INSERT' THEN
    v_action := 'save_draft';
    v_from := NULL;
  ELSE
    v_from := OLD.review_status;
    IF v_from = v_to AND v_content IS NOT DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['updated_at', 'reviewed_by', 'reviewed_at', 'published_by', 'published_at']) THEN
      RETURN NEW;
    END IF;
    v_action := CASE
      WHEN v_to = 'reviewed' THEN 'mark_reviewed'
      WHEN v_to = 'published' THEN 'publish'
      ELSE 'save_draft'
    END;
  END IF;

  INSERT INTO public.translation_review_audit (
    tenant_id, translation_kind, translation_id, entity_id, from_status, to_status,
    action, actor_id, content_fingerprint, evidence_source_uris
  ) VALUES (
    NEW.tenant_id, TG_ARGV[0], NEW.id, v_entity_id, v_from, v_to,
    v_action, v_actor, v_fingerprint,
    CASE WHEN jsonb_typeof(NEW.evidence_snapshot->'sourceUris') = 'array'
      THEN NEW.evidence_snapshot->'sourceUris' ELSE '[]'::jsonb END
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION translation_private.prevent_translation_audit_mutation(), translation_private.record_translation_audit()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS record_item_translation_audit ON public.item_translations;
CREATE TRIGGER record_item_translation_audit
  AFTER INSERT OR UPDATE ON public.item_translations
  FOR EACH ROW EXECUTE FUNCTION translation_private.record_translation_audit('item');

DROP TRIGGER IF EXISTS record_category_translation_audit ON public.category_translations;
CREATE TRIGGER record_category_translation_audit
  AFTER INSERT OR UPDATE ON public.category_translations
  FOR EACH ROW EXECUTE FUNCTION translation_private.record_translation_audit('category');

COMMIT;
