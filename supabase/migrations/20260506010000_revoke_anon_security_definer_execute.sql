-- ============================================================================
-- CRITICAL SECURITY FIX: Revoke EXECUTE from anon on SECURITY DEFINER functions
-- ============================================================================
-- Issue: Anonymous users can execute SECURITY DEFINER functions via REST API
-- Impact: Unauthenticated users can perform privileged operations (sales, purchases, etc.)
-- Fix: Revoke EXECUTE permission from anon role on all affected functions
--
-- Uses a DO block with per-function exception handling so missing functions
-- (e.g. dropped by earlier migrations) don't block the migration.
-- ============================================================================

DO $$
DECLARE
  sig text;
  sigs text[] := ARRAY[
    -- Batch 1: Core business functions (highest risk)
    'public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)',
    'public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, text, jsonb, text, text, text)',
    'public.create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text)',
    'public.record_sale(text, uuid, uuid, jsonb, jsonb, text)',
    'public.void_sale(uuid, text)',

    -- Batch 2: Purchase/receiving functions
    'public.record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text)',
    'public.record_purchase_v2(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text)',
    'public.receive_purchase_order(uuid, jsonb, text)',
    'public.post_draft_purchase_receipt(uuid)',

    -- Batch 3: Stock/Inventory functions
    'public.adjust_stock(uuid, uuid, integer, text, text, uuid)',
    'public.set_stock(uuid, uuid, integer, text, text)',
    'public.deduct_stock(uuid, uuid, integer, jsonb)',
    'public.add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid)',
    'public.create_stock_transfer(uuid, uuid, text, jsonb)',
    'public.update_stock_transfer_status(uuid, public.stock_transfer_status, text)',

    -- Batch 4: Customer/Payment functions
    'public.record_customer_payment(text, uuid, uuid, uuid, numeric, uuid, text, text)',
    'public.add_followup_note(uuid, uuid, uuid, text, date)',
    'public.mark_followup_resolved(uuid)',
    'public.log_customer_reminder(uuid, uuid, uuid, text)',
    'public.get_or_create_ar_account(uuid)',

    -- Batch 5: POS/Cash functions
    'public.close_pos_session(uuid, numeric)',
    'public.authenticate_staff_pin(text)',
    'public.issue_pos_override_token(uuid, text, jsonb, integer)',
    'public.record_cash_closing(text, uuid, uuid, uuid, numeric, date, text)',
    'public.get_expected_cash(uuid, uuid, uuid, date)',

    -- Batch 6: Ledger/Accounting functions
    'public.post_sale_to_ledger(uuid)',
    'public.process_ledger_posting_batch(text, integer, uuid)',
    'public.process_pending_ledger_postings(uuid, integer)',
    'public.claim_ledger_posting_jobs(text, integer, uuid)',
    'public.register_ledger_worker(text)',
    'public.deactivate_ledger_worker(text)',
    'public.heartbeat_ledger_worker(text)',
    'public.renew_ledger_job_lease(text, uuid)',
    'public.reclaim_stale_ledger_locks()',
    'public.close_accounting_period(uuid, date, date)',
    'public.validate_trial_balance(uuid, date, date)',
    'public.replay_sale_ledger_chain(uuid)',
    'public.ensure_sale_ledger_accounts(uuid)',
    'public.ensure_expense_ledger_accounts(uuid)',
    'public.resolve_payment_ledger_account(uuid, uuid)',
    'public.enqueue_sale_for_ledger_posting(uuid, uuid, integer)',
    'public.enqueue_sale_for_ledger_posting_from_sales()',
    'public.check_ledger_batch_balance()',

    -- Batch 7: Reminder/Notification functions
    'public.create_reminder(uuid, uuid, text, text, date, text, uuid)',
    'public.update_reminder(uuid, text, text, date, text, boolean)',
    'public.delete_reminder(uuid)',
    'public.get_upcoming_reminders(uuid, boolean)',
    'public.log_customer_reminder(uuid, uuid, uuid, text)',

    -- Batch 8: Expense/Historical import
    'public.record_expense(uuid, date, text, text, numeric, text, text)',
    'public.import_historical_daily_sale(uuid, date, numeric, numeric)',

    -- Batch 9: Idempotency/Sync functions
    'public.check_idempotency(text, uuid)',
    'public.log_sale_sync_conflict(uuid, text, text, jsonb, boolean)',

    -- Batch 10: User/Tenant functions
    'public.current_tenant_id()',
    'public.get_current_user_store_id()',
    'public.get_current_user_tenant_id()',
    'public.update_user_last_login()',

    -- Batch 11: Lookup/Query functions (intentionally kept public — review needed)
    -- 'public.lookup_item_by_scan(text, uuid)',
    -- 'public.get_pos_categories(uuid)',
    -- 'public.search_items_pos(uuid, text, uuid, integer, integer)',

    -- Batch 12: Reporting/Analytics functions
    'public.get_manager_dashboard_stats(uuid)',
    'public.get_close_risk_analytics(uuid, uuid, date, date)',
    'public.get_monthly_governance_scorecard(uuid, uuid, date)',
    'public.generate_daily_reconciliation(uuid, date)',

    -- Batch 13: Inventory query functions
    'public.get_inventory_list(uuid)',
    'public.get_inventory_summary(uuid)',
    'public.get_stock_level_by_id(uuid, uuid)',
    'public.get_stock_valuation(uuid, integer)',
    'public.get_stock_history_simple(uuid, uuid, integer)',
    'public.get_stock_movements(uuid, uuid, integer, integer)',
    'public.get_low_stock_items(uuid)',
    'public.get_slow_moving_items(uuid, integer, integer)',
    'public.get_expiring_batches(uuid, integer)',
    'public.get_top_selling_items(uuid, integer, integer)',
    'public.get_daily_movement_trend(uuid, integer)',
    'public.get_receivables_aging(uuid, uuid, text)',

    -- Batch 14: Session/Receipt functions
    'public.get_session_summary(uuid)',
    'public.get_sale_details(uuid)',
    'public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer)',
    'public.get_receipt_config_simple(uuid)',
    'public.update_receipt_config_simple(uuid, text, text, text)',
    'public.get_payment_methods(uuid)',
    'public.get_store_users(uuid)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    BEGIN
      EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || sig || ' FROM anon';
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping revoke: function % does not exist (likely dropped by earlier migration)', sig;
    END;
  END LOOP;
END;
$$;
