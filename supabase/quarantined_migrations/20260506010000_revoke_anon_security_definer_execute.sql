-- ============================================================================
-- CRITICAL SECURITY FIX: Revoke EXECUTE from anon on SECURITY DEFINER functions
-- ============================================================================
-- Issue: Anonymous users can execute SECURITY DEFINER functions via REST API
-- Impact: Unauthenticated users can perform privileged operations (sales, purchases, etc.)
-- Fix: Revoke EXECUTE permission from anon role on all affected functions
-- ============================================================================

-- Batch 1: Core business functions (highest risk)
REVOKE EXECUTE ON FUNCTION public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, text, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_sale(text, uuid, uuid, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_sale(uuid, text) FROM anon;

-- Batch 2: Purchase/receiving functions
REVOKE EXECUTE ON FUNCTION public.record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_purchase_v2(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_draft_purchase_receipt(uuid) FROM anon;

-- Batch 3: Stock/Inventory functions
REVOKE EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, integer, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_stock(uuid, uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_stock_transfer(uuid, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_stock_transfer_status(uuid, public.stock_transfer_status, text) FROM anon;

-- Batch 4: Customer/Payment functions
REVOKE EXECUTE ON FUNCTION public.record_customer_payment(text, uuid, uuid, uuid, numeric, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_followup_note(uuid, uuid, uuid, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_followup_resolved(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_customer_reminder(uuid, uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_ar_account(uuid) FROM anon;

-- Batch 5: POS/Cash functions
REVOKE EXECUTE ON FUNCTION public.close_pos_session(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.authenticate_staff_pin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_pos_override_token(uuid, text, jsonb, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_cash_closing(text, uuid, uuid, uuid, numeric, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_expected_cash(uuid, uuid, uuid, date) FROM anon;

-- Batch 6: Ledger/Accounting functions
REVOKE EXECUTE ON FUNCTION public.post_sale_to_ledger(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_ledger_posting_batch(text, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_pending_ledger_postings(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_ledger_posting_jobs(text, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_ledger_worker(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deactivate_ledger_worker(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.heartbeat_ledger_worker(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renew_ledger_job_lease(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reclaim_stale_ledger_locks() FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_accounting_period(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_trial_balance(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replay_sale_ledger_chain(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_sale_ledger_accounts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_expense_ledger_accounts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_payment_ledger_account(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_sale_for_ledger_posting(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_sale_for_ledger_posting_from_sales() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ledger_batch_balance() FROM anon;

-- Batch 7: Reminder/Notification functions
REVOKE EXECUTE ON FUNCTION public.create_reminder(uuid, uuid, text, text, date, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_reminder(uuid, text, text, date, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_reminder(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_upcoming_reminders(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_customer_reminder(uuid, uuid, uuid, text) FROM anon;

-- Batch 8: Expense/Historical import
REVOKE EXECUTE ON FUNCTION public.record_expense(uuid, date, text, text, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.import_historical_daily_sale(uuid, date, numeric, numeric) FROM anon;

-- Batch 9: Idempotency/Sync functions
REVOKE EXECUTE ON FUNCTION public.check_idempotency(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_sale_sync_conflict(uuid, text, text, jsonb, boolean) FROM anon;

-- Batch 10: User/Tenant functions
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_store_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_tenant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_last_login() FROM anon;

-- Batch 11: Lookup/Query functions (these might be intentionally public - review needed)
-- REVOKE EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_pos_categories(uuid) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.search_items_pos(uuid, text, uuid, integer, integer) FROM anon;

-- Batch 12: Reporting/Analytics functions
REVOKE EXECUTE ON FUNCTION public.get_manager_dashboard_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_close_risk_analytics(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_governance_scorecard(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_daily_reconciliation(uuid, date) FROM anon;

-- Batch 13: Inventory query functions
REVOKE EXECUTE ON FUNCTION public.get_inventory_list(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_inventory_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_level_by_id(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_valuation(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_history_simple(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_movements(uuid, uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_items(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_slow_moving_items(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_batches(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_selling_items(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_movement_trend(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_receivables_aging(uuid, uuid, text) FROM anon;

-- Batch 14: Session/Receipt functions
REVOKE EXECUTE ON FUNCTION public.get_session_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sale_details(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_history(uuid, text, timestamptz, timestamptz, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_receipt_config_simple(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_receipt_config_simple(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_payment_methods(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_store_users(uuid) FROM anon;

-- ============================================================================
-- NOTE: Functions NOT revoked (review these):
-- - lookup_item_by_scan: May be needed for POS barcode scanning without auth
-- - get_pos_categories: May be needed for POS display
-- - search_items_pos: May be needed for POS search
-- ============================================================================
