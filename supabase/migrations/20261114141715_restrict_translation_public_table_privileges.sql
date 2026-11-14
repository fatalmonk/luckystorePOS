-- PR #634: remove broad anonymous and unsafe interactive table privileges.
-- Guest access to published presentation fields stays column-scoped and RLS-gated.
-- PostgreSQL TRUNCATE is not subject to row-level security.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.item_translations, public.category_translations
  FROM PUBLIC, anon;

-- Staff retain normal SELECT/INSERT/UPDATE/DELETE, protected by tenant RLS.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.item_translations, public.category_translations
  FROM authenticated;

DO $guard$
DECLARE
  v_table text;
  v_permission text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['item_translations', 'category_translations'] LOOP
    FOREACH v_permission IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] LOOP
      IF has_table_privilege('anon', format('public.%I', v_table), v_permission) THEN
        RAISE EXCEPTION 'Anonymous role retains % on %', v_permission, v_table;
      END IF;
    END LOOP;
    FOREACH v_permission IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] LOOP
      IF has_table_privilege('authenticated', format('public.%I', v_table), v_permission) THEN
        RAISE EXCEPTION 'Authenticated role retains % on %', v_permission, v_table;
      END IF;
    END LOOP;
    IF NOT has_column_privilege('anon', format('public.%I', v_table), 'name', 'SELECT')
       OR has_column_privilege('anon', format('public.%I', v_table), 'evidence_snapshot', 'SELECT')
       OR NOT has_table_privilege('authenticated', format('public.%I', v_table), 'INSERT')
       OR NOT has_table_privilege('authenticated', format('public.%I', v_table), 'UPDATE')
       OR NOT has_table_privilege('authenticated', format('public.%I', v_table), 'DELETE') THEN
      RAISE EXCEPTION 'Required translation permissions changed unexpectedly on %', v_table;
    END IF;
  END LOOP;
END;
$guard$;

COMMIT;
