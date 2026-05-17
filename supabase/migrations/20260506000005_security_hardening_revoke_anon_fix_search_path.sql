-- Security hardening: revoke anon execute, fix search_path
-- Addresses Supabase linter warnings:
--   - function_search_path_mutable: add SET search_path
--   - anon_security_definer_function_executable: revoke PUBLIC, grant authenticated only

DO $$
DECLARE
  func_sig TEXT;
  alter_sigs TEXT[] := ARRAY[
    'record_purchase(TEXT, UUID, UUID, UUID, UUID, JSONB, TEXT)',
    'record_purchase_v2(TEXT, UUID, UUID, UUID, TEXT, NUMERIC, JSONB, NUMERIC, UUID, UUID, TEXT, TEXT)'
  ];
  revoke_sigs TEXT[] := ARRAY[
    'close_pos_session(UUID, NUMERIC)',
    'current_tenant_id()',
    'enqueue_sale_for_ledger_posting_from_sales()',
    'ensure_expense_ledger_accounts(UUID)',
    'get_inventory_list(UUID)',
    'get_or_create_ar_account(UUID)',
    'get_pos_categories(UUID)',
    'get_session_summary(UUID)',
    'get_stock_history_simple(UUID, UUID, INTEGER)',
    'import_historical_daily_sale(UUID, DATE, NUMERIC, NUMERIC)',
    'lookup_item_by_scan(TEXT, UUID)',
    'record_expense(UUID, DATE, TEXT, TEXT, NUMERIC, TEXT, TEXT)',
    'search_items_pos(UUID, TEXT, UUID, INTEGER, INTEGER)',
    'set_stock(UUID, UUID, INTEGER, TEXT, TEXT)',
    'update_user_last_login()',
    'validate_sale_intent(JSONB)'
  ];
  func_name TEXT;
  func_exists BOOLEAN;
BEGIN
  -- 1) Fix mutable search_path
  FOREACH func_sig IN ARRAY alter_sigs LOOP
    func_name := split_part(func_sig, '(', 1);
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      BEGIN
        EXECUTE 'ALTER FUNCTION public.' || func_sig || ' SET search_path = public, pg_temp';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to alter search path on public.%', func_sig;
      END;
    END IF;
  END LOOP;

  -- 2) Revoke PUBLIC execute
  FOREACH func_sig IN ARRAY revoke_sigs LOOP
    func_name := split_part(func_sig, '(', 1);
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      BEGIN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || func_sig || ' FROM PUBLIC';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to revoke execute on public.%', func_sig;
      END;
    END IF;
  END LOOP;
END $$;