-- Fix RLS policy on competitor_prices
-- Old policy checked auth.users.raw_user_meta_data which was never set,
-- blocking all anon-key (browser) queries. Use get_current_user_store_id()
-- like every other table in the schema.

DROP POLICY IF EXISTS "Users can view competitor prices for their store"
    ON public.competitor_prices;

CREATE POLICY "Users can view competitor prices for their store"
    ON public.competitor_prices
    FOR SELECT TO authenticated
    USING (store_id = public.get_current_user_store_id());