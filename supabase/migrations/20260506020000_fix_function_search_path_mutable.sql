-- ============================================================================
-- HIGH PRIORITY SECURITY FIX: Fix mutable search_path on functions
-- ============================================================================
-- Issue: Functions without explicit search_path are vulnerable to search path injection
-- Fix: Use ALTER FUNCTION to set search_path = public, pg_temp
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- Batch 1: Core business and security functions
ALTER FUNCTION public.log_customer_reminder SET search_path = public, pg_temp;
ALTER FUNCTION public.add_followup_note SET search_path = public, pg_temp;
ALTER FUNCTION public.check_ledger_batch_balance SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_ledger_mutation SET search_path = public, pg_temp;
ALTER FUNCTION public.current_tenant_id SET search_path = public, pg_temp;
ALTER FUNCTION public.get_or_create_ar_account SET search_path = public, pg_temp;
ALTER FUNCTION public.get_receivables_aging SET search_path = public, pg_temp;
ALTER FUNCTION public.is_ledger_worker_alive SET search_path = public, pg_temp;
ALTER FUNCTION public.is_period_closed SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_followup_resolved SET search_path = public, pg_temp;

-- Batch 2: Data protection and reminder functions
ALTER FUNCTION public.prevent_sale_audit_log_mutation SET search_path = public, pg_temp;
ALTER FUNCTION public.record_customer_payment SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at_timestamp SET search_path = public, pg_temp;
ALTER FUNCTION public.get_upcoming_reminders SET search_path = public, pg_temp;
ALTER FUNCTION public.create_reminder SET search_path = public, pg_temp;
ALTER FUNCTION public.check_idempotency SET search_path = public, pg_temp;

-- Batch 3: Transaction and cash functions
ALTER FUNCTION public.record_sale SET search_path = public, pg_temp;
ALTER FUNCTION public.get_expected_cash SET search_path = public, pg_temp;
ALTER FUNCTION public.record_cash_closing SET search_path = public, pg_temp;
ALTER FUNCTION public.update_reminder SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_reminder SET search_path = public, pg_temp;
ALTER FUNCTION public.log_stock_ledger_on_update SET search_path = public, pg_temp;
ALTER FUNCTION public.post_draft_purchase_receipt SET search_path = public, pg_temp;

-- Batch 4: record_purchase_v2
ALTER FUNCTION public.record_purchase_v2 SET search_path = public, pg_temp;