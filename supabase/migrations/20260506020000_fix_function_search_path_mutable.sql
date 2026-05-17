-- ============================================================================
-- HIGH PRIORITY SECURITY FIX: Fix mutable search_path on functions
-- ============================================================================
-- Issue: Functions without explicit search_path are vulnerable to search path injection
-- Fix: Use ALTER FUNCTION to set search_path = public, pg_temp (defensively)
-- ============================================================================

DO $$
DECLARE
  func_name TEXT;
  func_names TEXT[] := ARRAY[
    'log_customer_reminder',
    'add_followup_note',
    'check_ledger_batch_balance',
    'prevent_ledger_mutation',
    'current_tenant_id',
    'get_or_create_ar_account',
    'get_receivables_aging',
    'is_ledger_worker_alive',
    'is_period_closed',
    'mark_followup_resolved',
    'prevent_sale_audit_log_mutation',
    'record_customer_payment',
    'set_updated_at_timestamp',
    'get_upcoming_reminders',
    'create_reminder',
    'check_idempotency',
    'record_sale',
    'get_expected_cash',
    'record_cash_closing',
    'update_reminder',
    'delete_reminder',
    'log_stock_ledger_on_update',
    'post_draft_purchase_receipt',
    'record_purchase_v2'
  ];
  func_exists BOOLEAN;
BEGIN
  FOREACH func_name IN ARRAY func_names LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      BEGIN
        EXECUTE 'ALTER FUNCTION public.' || quote_ident(func_name) || ' SET search_path = public, pg_temp';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to alter search path on public.%', func_name;
      END;
    END IF;
  END LOOP;
END $$;