-- Security hardening: revoke anon execute, fix search_path
-- Addresses Supabase linter warnings:
--   - function_search_path_mutable: add SET search_path
--   - anon_security_definer_function_executable: revoke PUBLIC, grant authenticated only

-- =============================================================================
-- 1) Fix mutable search_path on functions missing it
-- =============================================================================
ALTER FUNCTION public.record_purchase(TEXT, UUID, UUID, UUID, UUID, JSONB, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT) SET search_path = public, pg_temp;

-- =============================================================================
-- 2) Revoke PUBLIC (anon) execute on SECURITY DEFINER functions
--    Keep GRANT to authenticated since those are intentional
-- =============================================================================

-- POS/session functions
REVOKE EXECUTE ON FUNCTION public.close_pos_session(UUID, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_sale_for_ledger_posting_from_sales() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_expense_ledger_accounts(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_inventory_list(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_ar_account(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pos_categories(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_session_summary(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_stock_history_simple(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_historical_daily_sale(UUID, DATE, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_item_by_scan(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_expense(UUID, DATE, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_items_pos(UUID, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_stock(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_last_login() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_sale_intent(JSONB) FROM PUBLIC;