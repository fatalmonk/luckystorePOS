-- Revoke anon execute on SECURITY DEFINER POS functions
-- These functions must only be callable by authenticated users
-- Addresses Supabase linter: anon_security_definer_function_executable

REVOKE EXECUTE ON FUNCTION public.get_pos_categories(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_item_by_scan(TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_items_pos(UUID, TEXT, UUID, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_sale_intent(JSONB) FROM anon;