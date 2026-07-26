-- Keep privileged ledger posting behind trusted backend workers.
--
-- These SECURITY DEFINER functions mutate accounting and worker state without
-- end-user identity, role, tenant, or store authorization. Repository callers,
-- live database callers, cron jobs, and recent API logs show no requirement for
-- direct anon/authenticated execution. Internal function-to-function calls run
-- as the function owner; service_role remains the external worker entry point.

DO $migration$
DECLARE
  v_signature text;
  v_signatures constant text[] := ARRAY[
    'public.post_sale_to_ledger(uuid)',
    'public.process_ledger_posting_batch(text,integer,uuid)',
    'public.process_pending_ledger_postings(uuid,integer)',
    'public.claim_ledger_posting_jobs(text,integer,uuid)',
    'public.register_ledger_worker(text)',
    'public.heartbeat_ledger_worker(text)',
    'public.renew_ledger_job_lease(text,uuid)',
    'public.reclaim_stale_ledger_locks()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures
  LOOP
    IF to_regprocedure(v_signature) IS NULL THEN
      RAISE EXCEPTION 'Required ledger worker function is missing: %', v_signature;
    END IF;
  END LOOP;
END;
$migration$;

REVOKE ALL ON FUNCTION public.post_sale_to_ledger(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_ledger_posting_batch(text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_pending_ledger_postings(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ledger_posting_jobs(text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_ledger_worker(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_ledger_worker(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_ledger_job_lease(text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reclaim_stale_ledger_locks()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.post_sale_to_ledger(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.process_ledger_posting_batch(text, integer, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.process_pending_ledger_postings(uuid, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ledger_posting_jobs(text, integer, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.register_ledger_worker(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_ledger_worker(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_ledger_job_lease(text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reclaim_stale_ledger_locks()
  TO service_role;

DO $migration$
DECLARE
  v_signature text;
  v_function regprocedure;
  v_signatures constant text[] := ARRAY[
    'public.post_sale_to_ledger(uuid)',
    'public.process_ledger_posting_batch(text,integer,uuid)',
    'public.process_pending_ledger_postings(uuid,integer)',
    'public.claim_ledger_posting_jobs(text,integer,uuid)',
    'public.register_ledger_worker(text)',
    'public.heartbeat_ledger_worker(text)',
    'public.renew_ledger_job_lease(text,uuid)',
    'public.reclaim_stale_ledger_locks()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures
  LOOP
    v_function := to_regprocedure(v_signature);

    IF has_function_privilege('anon', v_function, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Public execution remains on %', v_signature;
    END IF;

    IF NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role execution is missing on %', v_signature;
    END IF;
  END LOOP;
END;
$migration$;
