-- ============================================================================
-- MEDIUM PRIORITY SECURITY FIX: Restrict authenticated EXECUTE on admin functions
-- ============================================================================
-- Issue: All authenticated users can execute SECURITY DEFINER functions
-- Fix: Revoke EXECUTE from authenticated on sensitive admin/manager-only functions (defensively)
-- ============================================================================

DO $$
DECLARE
  func_sig TEXT;
  revoke_sigs TEXT[] := ARRAY[
    'close_accounting_period(uuid, date, date)',
    'validate_trial_balance(uuid, date, date)',
    'replay_sale_ledger_chain(uuid)',
    'register_ledger_worker(text)',
    'deactivate_ledger_worker(text)',
    'reclaim_stale_ledger_locks()',
    'issue_pos_override_token(uuid, text, jsonb, integer)',
    'void_sale(uuid, text)',
    'get_close_risk_analytics(uuid, uuid, date, date)',
    'get_monthly_governance_scorecard(uuid, uuid, date)'
  ];
  func_name TEXT;
  func_exists BOOLEAN;
BEGIN
  FOREACH func_sig IN ARRAY revoke_sigs LOOP
    func_name := split_part(func_sig, '(', 1);
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      BEGIN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || func_sig || ' FROM authenticated';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to revoke execute on public.% from authenticated', func_sig;
      END;
    END IF;
  END LOOP;
END $$;
