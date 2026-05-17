-- Revoke anon execute on SECURITY DEFINER POS functions
-- These functions must only be callable by authenticated users
-- Addresses Supabase linter: anon_security_definer_function_executable

DO $$
DECLARE
  func_sig TEXT;
  revoke_sigs TEXT[] := ARRAY[
    'get_pos_categories(UUID)',
    'lookup_item_by_scan(TEXT, UUID)',
    'search_items_pos(UUID, TEXT, UUID, INTEGER, INTEGER)',
    'validate_sale_intent(JSONB)'
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