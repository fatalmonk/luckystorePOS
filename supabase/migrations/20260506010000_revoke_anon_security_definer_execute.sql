-- ============================================================================
-- CRITICAL SECURITY FIX: Revoke EXECUTE from anon on SECURITY DEFINER functions
-- ============================================================================
-- Issue: Anonymous users can execute SECURITY DEFINER functions via REST API
-- Impact: Unauthenticated users can perform privileged operations (sales, purchases, etc.)
-- Fix: Revoke EXECUTE permission from anon role on all affected functions (defensively)
-- ============================================================================

DO $$
DECLARE
  func_sig TEXT;
  revoke_sigs TEXT[] := ARRAY[
    'complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)',
    'complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, text, jsonb, text, text, text)',
    'create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)',
    'record_sale(text, uuid, uuid, jsonb, jsonb, text)',
    'void_sale(uuid, text)',
    'record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text)',
    'record_purchase_v2(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text)',
    'receive_purchase_order(uuid, jsonb, text)',
    'post_draft_purchase_receipt(uuid)',
    'adjust_stock(uuid, uuid, integer, text, text, uuid)',
    'set_stock(uuid, uuid, integer, text, text)',
    'deduct_stock(uuid, uuid, integer, jsonb)',
    'add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid)',
    'create_stock_transfer(uuid, uuid, text, jsonb)',
    'update_stock_transfer_status(uuid, public.stock_transfer_status, text)',
    'record_customer_payment(text, uuid, uuid, uuid, numeric, uuid, text, text)',
    'add_followup_note(uuid, uuid, uuid, text, date)',
    'mark_followup_resolved(uuid)',
    'log_customer_reminder(uuid, uuid, uuid, text)',
    'get_or_create_ar_account(uuid)',
    'close_pos_session(uuid, numeric)',
    'authenticate_staff_pin(text)',
    'issue_pos_override_token(uuid, text, jsonb, integer)',
    'record_cash_closing(text, uuid, uuid, uuid, numeric, date, text)',
    'get_expected_cash(uuid, uuid, uuid, date)',
    'post_sale_to_ledger(uuid)',
    'process_ledger_posting_batch(text, integer, uuid)',
    'process_pending_ledger_postings(uuid, integer)',
    'claim_ledger_posting_jobs(text, integer, uuid)',
    'register_ledger_worker(text)',
    'deactivate_ledger_worker(text)',
    'heartbeat_ledger_worker(text)',
    'renew_ledger_job_lease(text, uuid)',
    'reclaim_stale_ledger_locks()',
    'close_accounting_period(uuid, date, date)',
    'validate_trial_balance(uuid, date, date)',
    'replay_sale_ledger_chain(uuid)',
    'ensure_sale_ledger_accounts(uuid)',
    'ensure_expense_ledger_accounts(uuid)',
    'resolve_payment_ledger_account(uuid, uuid)',
    'enqueue_sale_for_ledger_posting(uuid, uuid, integer)',
    'enqueue_sale_for_ledger_posting_from_sales()',
    'check_ledger_batch_balance()',
    'create_reminder(uuid, uuid, text, text, date, text, uuid)',
    'update_reminder(uuid, text, text, date, text, boolean)',
    'delete_reminder(uuid)',
    'get_upcoming_reminders(uuid, boolean)',
    'log_customer_reminder(uuid, uuid, uuid, text)',
    'record_expense(uuid, date, text, text, numeric, text, text)',
    'import_historical_daily_sale(uuid, date, numeric, numeric)',
    'check_idempotency(text, uuid)',
    'log_sale_sync_conflict(uuid, text, text, jsonb, boolean)',
    'current_tenant_id()',
    'get_current_user_store_id()',
    'get_current_user_tenant_id()',
    'update_user_last_login()',
    'get_manager_dashboard_stats(uuid)',
    'get_close_risk_analytics(uuid, uuid, date, date)',
    'get_monthly_governance_scorecard(uuid, uuid, date)',
    'generate_daily_reconciliation(uuid, date)',
    'get_inventory_list(uuid)',
    'get_inventory_summary(uuid)',
    'get_stock_level_by_id(uuid, uuid)',
    'get_stock_valuation(uuid, integer)',
    'get_stock_history_simple(uuid, uuid, integer)',
    'get_stock_movements(uuid, uuid, integer, integer)',
    'get_low_stock_items(uuid)',
    'get_slow_moving_items(uuid, integer, integer)',
    'get_expiring_batches(uuid, integer)',
    'get_top_selling_items(uuid, integer, integer)',
    'get_daily_movement_trend(uuid, integer)',
    'get_receivables_aging(uuid, uuid, text)',
    'get_session_summary(uuid)',
    'get_sale_details(uuid)',
    'get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer)',
    'get_receipt_config_simple(uuid)',
    'update_receipt_config_simple(uuid, text, text, text)',
    'get_payment_methods(uuid)',
    'get_store_users(uuid)'
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
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || func_sig || ' FROM anon';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to revoke execute on public.% from anon', func_sig;
      END;
    END IF;
  END LOOP;
END $$;
