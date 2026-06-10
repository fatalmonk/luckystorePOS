-- supabase/migrations/20260611000003_add_items_rls.sql
-- DO NOT add RLS on public.items -- it breaks existing admin_web policies
-- Instead, grant anon execute on the existing search_items_pos RPC

grant execute on function public.search_items_pos(text, uuid) to anon;
