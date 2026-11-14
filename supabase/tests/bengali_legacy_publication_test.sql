-- Synthetic, rollback-only local qualification for owner-attested September cohort.
-- Never execute on a remote Supabase project.
BEGIN;
DO $local$ BEGIN
  IF inet_server_addr() IS NOT NULL THEN
    RAISE EXCEPTION 'This regression is strictly local socket-only';
  END IF;
END $local$;
CREATE FUNCTION pg_temp.check_true(value boolean, message text)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', message; END IF; END $fn$;

INSERT INTO public.tenants(id,name)
VALUES('c0110000-0000-4000-8000-000000000001','Legacy test tenant');
INSERT INTO public.stores(id,tenant_id,name,code,metadata)
VALUES('c0110000-0000-4000-8000-000000000002','c0110000-0000-4000-8000-000000000001',
       'Public testing store','legacy-fixture-public','{"is_public_storefront":true}'::jsonb);
INSERT INTO public.items(id,name,description,sku,barcode,brand,tenant_id,is_active)
VALUES('c0110000-0000-4000-8000-000000000003','Synthetic Tea 70g','Synthetic tea pack',
       'TEST-LEGACY-70','TEST-70','Synthetic','c0110000-0000-4000-8000-000000000001',true);

-- Simulate a pre-hardening row. Restore all guards immediately afterwards.
ALTER TABLE public.item_translations DISABLE TRIGGER guard_item_translation_workflow;
ALTER TABLE public.item_translations DROP CONSTRAINT item_translations_publication_ready_check;
INSERT INTO public.item_translations
(id,item_id,tenant_id,locale,name,description,review_status,created_at,updated_at)
VALUES('c0110000-0000-4000-8000-000000000004','c0110000-0000-4000-8000-000000000003',
       'c0110000-0000-4000-8000-000000000001','bn','সিন্থেটিক চা 70g',
       'টেস্টের জন্য চায়ের বিবরণ', 'published',
       '2026-09-15 22:15:37.904317+00'::timestamptz,
       '2026-09-15 22:45:42.080468+00'::timestamptz);
ALTER TABLE public.item_translations ADD CONSTRAINT item_translations_publication_ready_check CHECK (
  (review_status='draft' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL)
  OR (review_status='reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NULL AND published_at IS NULL AND translation_private.is_evidence_snapshot(evidence_snapshot))
  OR (review_status='published' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_by IS NOT NULL AND published_at IS NOT NULL AND published_at >= reviewed_at AND translation_private.is_evidence_snapshot(evidence_snapshot))
) NOT VALID;
ALTER TABLE public.item_translations ENABLE TRIGGER guard_item_translation_workflow;

SELECT pg_temp.check_true(NOT has_table_privilege('anon','translation_private.legacy_item_approvals','SELECT'),'legacy manifest must remain private');

-- This fixture is not one of the frozen production identifiers. Privileged
-- test-only insertion verifies generic eligibility, never edits the release manifest.
INSERT INTO translation_private.legacy_item_approvals(translation_id,item_id,tenant_id,fingerprint)
SELECT t.id,t.item_id,t.tenant_id,
  encode(sha256(convert_to(jsonb_build_array(
    t.id,t.item_id,t.tenant_id,t.locale,t.name,t.description,t.search_terms,
    t.review_status,t.created_at AT TIME ZONE 'UTC',t.updated_at AT TIME ZONE 'UTC',
    t.origin,t.last_verified_at,t.details,i.name,i.description,i.sku,i.barcode,i.brand
  )::text,'UTF8')),'hex')
FROM public.item_translations t JOIN public.items i ON i.id=t.item_id
WHERE t.id='c0110000-0000-4000-8000-000000000004'::uuid;

-- Anonymous row visibility is RLS-controlled and must match mobile RPC.
SET LOCAL ROLE anon;
SELECT pg_temp.check_true(
  (SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004'::uuid)=1,
  'original published synthetic translation must be visible');
SELECT pg_temp.check_true(
  (SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004'::uuid AND review_status='published')=1,
  'original status remains published');
RESET ROLE;

SELECT pg_temp.check_true(
  (SELECT translation_private.is_legacy_item_publication_eligible(
    'c0110000-0000-4000-8000-000000000004','c0110000-0000-4000-8000-000000000003','c0110000-0000-4000-8000-000000000001'))=true,
  'exact legacy fingerprint qualifies');

-- Identity or source drift revokes publication, even though legacy status stays published.
SAVEPOINT identity_drift;
UPDATE public.items SET description='Source changed after approval'
 WHERE id='c0110000-0000-4000-8000-000000000003';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true((SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004')=0,
  'source drift must revoke anonymous publication');
RESET ROLE;
ROLLBACK TO SAVEPOINT identity_drift;

SAVEPOINT item_inactive;
UPDATE public.items SET is_active=false WHERE id='c0110000-0000-4000-8000-000000000003';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true((SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004')=0,
  'inactive item must be invisible');
RESET ROLE;
ROLLBACK TO SAVEPOINT item_inactive;

SAVEPOINT translation_draft;
UPDATE public.item_translations SET review_status='draft'
 WHERE id='c0110000-0000-4000-8000-000000000004';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true((SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004')=0,
  'withdrawn historical translation cannot stay public');
RESET ROLE;
ROLLBACK TO SAVEPOINT translation_draft;

-- Test tenant mismatch and nonpublic storefront.
SELECT pg_temp.check_true(NOT translation_private.is_legacy_item_publication_eligible(
 'c0110000-0000-4000-8000-000000000004',
 'c0110000-0000-4000-8000-000000000003',
 'c0110000-0000-4000-8000-000000000099'), 'cross-tenant probe must fail');
SAVEPOINT private_store;
UPDATE public.stores SET metadata='{"is_public_storefront":false}'::jsonb
 WHERE id='c0110000-0000-4000-8000-000000000002';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true((SELECT count(*) FROM public.item_translations WHERE id='c0110000-0000-4000-8000-000000000004')=0,
 'tenant with no public store cannot publish legacy copy');
RESET ROLE;
ROLLBACK TO SAVEPOINT private_store;

ROLLBACK;
SELECT 'Legacy Bengali publication synthetic regression passed' AS result;
