-- Migration: Security Hardening V2
-- Description: Sets secure search_path for critical functions and revokes public execution of SECURITY DEFINER functions.

-- 1. Secure Search Path for flagged functions
ALTER FUNCTION public.sync_user_name() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_low_stock_items(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_manager_dashboard_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.adjust_stock(uuid, uuid, integer, text, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.authenticate_staff_pin(text) SET search_path = public, pg_temp;

-- 2. Revoke public access to functions (Supabase default is too permissive)
-- First, revoke from the 'public' pseudo-role
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Re-grant to authorized roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Explicitly check for 'anon' access on sensitive functions and revoke
REVOKE EXECUTE ON FUNCTION public.complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_purchase(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text) FROM anon;

-- 4. Fix any remaining RLS gaps from advisor
ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_reminders_tenant_isolated" ON public.customer_reminders;
CREATE POLICY "customer_reminders_tenant_isolated" ON public.customer_reminders
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

ALTER TABLE public.followup_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "followup_notes_tenant_isolated" ON public.followup_notes;
CREATE POLICY "followup_notes_tenant_isolated" ON public.followup_notes
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

ALTER TABLE public.journal_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_batches_tenant_isolated" ON public.journal_batches;
CREATE POLICY "journal_batches_tenant_isolated" ON public.journal_batches
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

-- 5. Final verification of SECURITY DEFINER functions search_path
-- (Looping through all functions to set search_path might be too aggressive, 
-- but setting it for these known ones is a good start).
