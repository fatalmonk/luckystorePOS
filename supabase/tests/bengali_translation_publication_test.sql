-- Local database only. Every fixture and role change is rolled back.
BEGIN;

DO $$
BEGIN
  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN ('127.0.0.1'::inet, '::1'::inet) THEN
    RAISE EXCEPTION 'Refusing translation publication tests on a non-local database';
  END IF;
END;
$$;

-- Emit TAP around the transaction-backed integration assertions so pg_prove
-- can run this file without coupling the assertions to a pgTAP version.
SELECT '1..1';
SELECT '# Legacy mismatched ownership rows: ' || (
  (SELECT count(*) FROM public.item_translations t JOIN public.items i ON i.id = t.item_id WHERE i.tenant_id IS DISTINCT FROM t.tenant_id)
  + (SELECT count(*) FROM public.category_translations t JOIN public.categories c ON c.id = t.category_id WHERE c.tenant_id IS DISTINCT FROM t.tenant_id)
);

CREATE FUNCTION pg_temp.assert_true(p_condition boolean, p_message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_condition IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_failure(p_sql text, p_sqlstate text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_sqlstate text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    IF v_sqlstate = p_sqlstate THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected SQLSTATE %, got %: %', p_sqlstate, v_sqlstate, SQLERRM;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', p_sqlstate, p_sql;
END;
$$;

DO $tests$
DECLARE
  t_a uuid := gen_random_uuid();
  t_b uuid := gen_random_uuid();
  a_user uuid := gen_random_uuid();
  b_user uuid := gen_random_uuid();
  cat_a uuid := gen_random_uuid();
  cat_b uuid := gen_random_uuid();
  item_a uuid := gen_random_uuid();
  item_b uuid := gen_random_uuid();
  row_a uuid;
  row_b uuid;
  draft_a uuid;
  entity_a uuid;
  entity_b uuid;
  kind text;
  translation_table text;
  entity_column text;
  source_name text;
  source_description text;
  snapshot_a jsonb;
  snapshot_b jsonb;
  bad_snapshot jsonb;
  n integer;
  saved_reviewer uuid;
  saved_reviewed_at timestamptz;
  saved_revision timestamptz;
  legacy_row record;
BEGIN
  PERFORM pg_temp.assert_true((
    SELECT count(*) = 4
    FROM pg_constraint fk
    JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = ANY(fk.conkey)
    WHERE fk.contype = 'f'
      AND fk.confrelid = 'public.users'::regclass
      AND fk.conrelid IN ('public.item_translations'::regclass, 'public.category_translations'::regclass)
      AND a.attname IN ('reviewed_by', 'published_by')
      AND a.atttypid = 'uuid'::regtype
  ), 'both translation tables require reviewer/publisher UUID references to public.users(id)');

  -- The additive-migration harness seeds these before installing the guard.
  -- Inspect legacy rows without weakening any trigger, constraint or RLS policy.
  FOR legacy_row IN
    SELECT DISTINCT ON (candidates.kind, candidates.id) candidates.* FROM (
      SELECT 'item'::text AS kind, t.id, u.auth_id
        FROM public.item_translations t JOIN public.items i ON i.id = t.item_id
        JOIN public.users u ON u.tenant_id = t.tenant_id AND u.role IN ('admin', 'manager')
        WHERE i.tenant_id IS DISTINCT FROM t.tenant_id
      UNION ALL
      SELECT 'category'::text AS kind, t.id, u.auth_id
        FROM public.category_translations t JOIN public.categories c ON c.id = t.category_id
        JOIN public.users u ON u.tenant_id = t.tenant_id AND u.role IN ('admin', 'manager')
        WHERE c.tenant_id IS DISTINCT FROM t.tenant_id
    ) candidates ORDER BY candidates.kind, candidates.id, candidates.auth_id
  LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', legacy_row.auth_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', legacy_row.kind || '_translations') INTO n USING legacy_row.id;
    PERFORM pg_temp.assert_true(n = 0, legacy_row.kind || ': staff cannot read a mismatched legacy entity owner');
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', legacy_row.kind || '_translations') USING legacy_row.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    PERFORM pg_temp.assert_true(n = 0, legacy_row.kind || ': staff cannot delete a mismatched legacy entity owner');
    RESET ROLE;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '{}', true);

  INSERT INTO public.tenants (id, name) VALUES (t_a, 'Translation test A'), (t_b, 'Translation test B');
  INSERT INTO public.stores (tenant_id, name, code, metadata) VALUES
    (t_a, 'Translation public store', 'translation-' || t_a, '{"is_public_storefront":true}'),
    (t_b, 'Translation private store', 'translation-' || t_b, '{"is_public_storefront":false}');
  INSERT INTO auth.users (id, email) VALUES
    (a_user, a_user || '@translation.invalid'), (b_user, b_user || '@translation.invalid');
  INSERT INTO public.users (id, auth_id, email, role, tenant_id) VALUES
    (a_user, a_user, a_user || '@translation.invalid', 'manager', t_a),
    (b_user, b_user, b_user || '@translation.invalid', 'admin', t_b);
  INSERT INTO public.categories (id, category, name, description, tenant_id, active) VALUES
    (cat_a, 'Tea ' || cat_a, 'Tea ' || cat_a, 'Tea category.', t_a, true),
    (cat_b, 'Tea ' || cat_b, 'Tea ' || cat_b, 'Private tea category.', t_b, true);
  INSERT INTO public.items (id, name, description, sku, barcode, brand, category_id, tenant_id, is_active) VALUES
    (item_a, 'Ispahani Tea 500 g', 'Tea leaves, 500 g.', 'TEA-' || item_a, 'BAR-' || item_a, 'Ispahani', cat_a, t_a, true),
    (item_b, 'Private Tea 250 ml', 'Private tea, 250 ml.', 'TEA-' || item_b, 'BAR-' || item_b, 'Private Brand', cat_b, t_b, true);

  FOREACH kind IN ARRAY ARRAY['item', 'category'] LOOP
    translation_table := kind || '_translations';
    entity_column := kind || '_id';
    entity_a := CASE WHEN kind = 'item' THEN item_a ELSE cat_a END;
    entity_b := CASE WHEN kind = 'item' THEN item_b ELSE cat_b END;
    source_name := CASE WHEN kind = 'item' THEN 'Ispahani Tea 500 g' ELSE 'Tea ' || cat_a END;
    source_description := CASE WHEN kind = 'item' THEN 'Tea leaves, 500 g.' ELSE 'Tea category.' END;
    snapshot_a := jsonb_build_object(
      'entityId', entity_a, 'sourceName', source_name, 'sourceDescription', source_description,
      'sku', CASE WHEN kind = 'item' THEN 'TEA-' || item_a END,
      'barcode', CASE WHEN kind = 'item' THEN 'BAR-' || item_a END,
      'brand', CASE WHEN kind = 'item' THEN 'Ispahani' END,
      'packageText', CASE WHEN kind = 'item' THEN '500 g' END,
      'sourceUris', jsonb_build_array('https://manufacturer.invalid/tea'),
      'observedAt', '2026-11-12T10:00:00Z'
    );
    snapshot_b := jsonb_build_object(
      'entityId', entity_b,
      'sourceName', CASE WHEN kind = 'item' THEN 'Private Tea 250 ml' ELSE 'Tea ' || cat_b END,
      'sourceDescription', CASE WHEN kind = 'item' THEN 'Private tea, 250 ml.' ELSE 'Private tea category.' END,
      'sku', CASE WHEN kind = 'item' THEN 'TEA-' || item_b END,
      'barcode', CASE WHEN kind = 'item' THEN 'BAR-' || item_b END,
      'brand', CASE WHEN kind = 'item' THEN 'Private Brand' END,
      'packageText', CASE WHEN kind = 'item' THEN '250 ml' END,
      'sourceUris', jsonb_build_array('https://manufacturer.invalid/private-tea'),
      'observedAt', '2026-11-12T10:00:00Z'
    );

    -- Private-tenant publication is valid editorially but must remain private.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', b_user, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE format('INSERT INTO public.%I (%I, tenant_id, name, evidence_snapshot) VALUES ($1, $2, $3, $4) RETURNING id', translation_table, entity_column)
      INTO row_b USING entity_b, t_b, 'ব্যক্তিগত চা', snapshot_b;
    EXECUTE format('UPDATE public.%I SET review_status = ''reviewed'', reviewed_by = $1 WHERE id = $2', translation_table) USING b_user, row_b;
    EXECUTE format('UPDATE public.%I SET review_status = ''published'', published_by = $1 WHERE id = $2', translation_table) USING b_user, row_b;
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', a_user, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', translation_table) INTO n USING row_b;
    PERFORM pg_temp.assert_true(n = 0, kind || ': tenant A cannot read tenant B');
    EXECUTE format('UPDATE public.%I SET name = ''hacked'' WHERE id = $1', translation_table) USING row_b;
    GET DIAGNOSTICS n = ROW_COUNT;
    PERFORM pg_temp.assert_true(n = 0, kind || ': tenant A cannot update tenant B');
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', translation_table) USING row_b;
    GET DIAGNOSTICS n = ROW_COUNT;
    PERFORM pg_temp.assert_true(n = 0, kind || ': tenant A cannot delete tenant B');
    PERFORM pg_temp.expect_failure(format('INSERT INTO public.%I (%I, tenant_id, name) VALUES (%L, %L, ''cross tenant'')', translation_table, entity_column, entity_b, t_b), '42501');
    PERFORM pg_temp.expect_failure(format('INSERT INTO public.%I (%I, tenant_id, name) VALUES (%L, %L, ''wrong owner'')', translation_table, entity_column, entity_b, t_a), '23514');
    PERFORM pg_temp.expect_failure(format('INSERT INTO public.%I (%I, tenant_id, name, review_status) VALUES (%L, %L, ''direct publish'', ''published'')', translation_table, entity_column, entity_a, t_a), '23514');

    EXECUTE format('INSERT INTO public.%I (%I, tenant_id, name) VALUES ($1, $2, $3) RETURNING id', translation_table, entity_column)
      INTO row_a USING entity_a, t_a, 'ইস্পাহানি চা 500 g';
    EXECUTE format('SELECT updated_at FROM public.%I WHERE id = $1', translation_table) INTO saved_revision USING row_a;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1 AND review_status = ''draft'' AND reviewed_by IS NULL AND published_by IS NULL', translation_table) INTO n USING row_a;
    PERFORM pg_temp.assert_true(n = 1, kind || ': imports default to unattributed draft');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''published'', reviewed_by = %L, reviewed_at = now(), published_by = %L, published_at = now() WHERE id = %L', translation_table, a_user, a_user, row_a), '23514');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''reviewed'', reviewed_by = %L WHERE id = %L', translation_table, a_user, row_a), '23514');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET evidence_snapshot = ''{}''::jsonb WHERE id = %L', translation_table, row_a), '23514');
    bad_snapshot := snapshot_a || '{"sourceUris":[]}'::jsonb;
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET evidence_snapshot = %L::jsonb WHERE id = %L', translation_table, bad_snapshot, row_a), '23514');
    bad_snapshot := snapshot_a || jsonb_build_object('snapshotSha256', repeat('a', 64));
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET evidence_snapshot = %L::jsonb WHERE id = %L', translation_table, bad_snapshot, row_a), '23514');

    IF kind = 'item' THEN
      bad_snapshot := snapshot_a || '{"sku":null}'::jsonb;
      EXECUTE format('UPDATE public.%I SET evidence_snapshot = $1 WHERE id = $2', translation_table) USING bad_snapshot, row_a;
      PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''reviewed'' WHERE id = %L', translation_table, row_a), '23514');
      bad_snapshot := snapshot_a || '{"packageText":null}'::jsonb;
      EXECUTE format('UPDATE public.%I SET evidence_snapshot = $1 WHERE id = $2', translation_table) USING bad_snapshot, row_a;
      PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''reviewed'' WHERE id = %L', translation_table, row_a), '23514');
      PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET details = ''{"faqs":[{"question":"size?","answer":500}]}''::jsonb WHERE id = %L', translation_table, row_a), '23514');
    END IF;

    EXECUTE format('UPDATE public.%I SET evidence_snapshot = $1 WHERE id = $2', translation_table) USING snapshot_a, row_a;
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''reviewed'', reviewed_by = %L WHERE id = %L', translation_table, b_user, row_a), '42501');
    EXECUTE format('UPDATE public.%I SET review_status = ''reviewed'', reviewed_by = $1 WHERE id = $2', translation_table) USING a_user, row_a;
    EXECUTE format('SELECT reviewed_by, reviewed_at FROM public.%I WHERE id = $1', translation_table) INTO saved_reviewer, saved_reviewed_at USING row_a;
    PERFORM pg_temp.assert_true(saved_reviewer = a_user AND saved_reviewed_at IS NOT NULL, kind || ': reviewer and timestamp are database attributed');
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1 AND updated_at > $2', translation_table) INTO n USING row_a, saved_revision;
    PERFORM pg_temp.assert_true(n = 1, kind || ': review advances revision even inside one transaction');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET name = ''changed after review'' WHERE id = %L', translation_table, row_a), '23514');

    RESET ROLE;
    SET LOCAL ROLE anon;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id IN ($1, $2)', translation_table) INTO n USING row_a, row_b;
    PERFORM pg_temp.assert_true(n = 0, kind || ': reviewed-only and private-store rows are not public');
    RESET ROLE;
    SET LOCAL ROLE authenticated;

    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET review_status = ''published'', published_by = %L WHERE id = %L', translation_table, b_user, row_a), '42501');
    EXECUTE format('SELECT updated_at FROM public.%I WHERE id = $1', translation_table) INTO saved_revision USING row_a;
    EXECUTE format('UPDATE public.%I SET review_status = ''published'', published_by = $1 WHERE id = $2', translation_table) USING a_user, row_a;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1 AND reviewed_by = $2 AND reviewed_at = $3 AND published_by = $2 AND published_at >= reviewed_at', translation_table)
      INTO n USING row_a, saved_reviewer, saved_reviewed_at;
    PERFORM pg_temp.assert_true(n = 1, kind || ': a separate publish action preserves review attribution');
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1 AND updated_at > $2', translation_table) INTO n USING row_a, saved_revision;
    PERFORM pg_temp.assert_true(n = 1, kind || ': publication advances the reviewed revision');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET name = ''changed live copy'' WHERE id = %L', translation_table, row_a), '23514');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET reviewed_by = %L WHERE id = %L', translation_table, b_user, row_a), '42501');

    RESET ROLE;
    SET LOCAL ROLE anon;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id IN ($1, $2)', translation_table) INTO n USING row_a, row_b;
    PERFORM pg_temp.assert_true(n = 1, kind || ': only eligible public-store publication is visible');
    EXECUTE format('SELECT count(*) FROM public.%I WHERE review_status <> ''published'' OR evidence_snapshot IS NULL OR reviewed_by IS NULL OR reviewed_at IS NULL OR published_by IS NULL OR published_at IS NULL', translation_table) INTO n;
    PERFORM pg_temp.assert_true(n = 0, kind || ': legacy/incomplete publications cannot leak through RLS');
    PERFORM pg_temp.expect_failure(format('UPDATE public.%I SET name = ''anonymous edit'' WHERE id = %L', translation_table, row_a), '42501');
    RESET ROLE;

    -- A changed canonical source invalidates public visibility and publication.
    IF kind = 'item' THEN
      UPDATE public.items SET name = 'Changed Tea 500 g' WHERE id = item_a;
    ELSE
      UPDATE public.categories SET name = 'Changed category' WHERE id = cat_a;
    END IF;
    SET LOCAL ROLE anon;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', translation_table) INTO n USING row_a;
    PERFORM pg_temp.assert_true(n = 0, kind || ': stale canonical evidence is not publication eligible');
    RESET ROLE;
    IF kind = 'item' THEN
      UPDATE public.items SET name = source_name WHERE id = item_a;
    ELSE
      UPDATE public.categories SET name = source_name WHERE id = cat_a;
    END IF;

    SET LOCAL ROLE authenticated;
    EXECUTE format('UPDATE public.%I SET name = ''নতুন চা'', review_status = ''draft'' WHERE id = $1', translation_table) USING row_a;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1 AND review_status = ''draft'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_by IS NULL AND published_at IS NULL', translation_table) INTO n USING row_a;
    PERFORM pg_temp.assert_true(n = 1, kind || ': editing published copy as draft clears all attribution');
    RESET ROLE;
  END LOOP;

  PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated', 'translation_private.is_publication_eligible(text,uuid,uuid,text,jsonb,uuid,timestamptz,uuid,timestamptz)', 'EXECUTE'), 'authenticated clients cannot directly invoke the privileged anonymous-RLS predicate');
  PERFORM pg_temp.assert_true(NOT has_function_privilege('anon', 'translation_private.matches_evidence(text,uuid,uuid,jsonb)', 'EXECUTE'), 'anonymous clients cannot directly invoke the private catalog lookup');
  PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated', 'translation_private.guard_workflow()', 'EXECUTE'), 'clients cannot directly invoke the workflow trigger');

  PERFORM pg_temp.assert_true(NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid IN ('public.item_translations'::regclass, 'public.category_translations'::regclass)
      AND conname LIKE '%publication_ready_check' AND convalidated
  ), 'publication checks remain NOT VALID until legacy remediation');
END;
$tests$;

SELECT 'ok 1 - item and category publication transitions, attribution, evidence and tenant RLS';
ROLLBACK;
