-- Migration: Fix daily_sales RLS policies to use auth_id instead of id
-- Issue: RLS was checking users.id = auth.uid() but should check users.auth_id = auth.uid()
-- Applied: 2026-05-11

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view daily_sales of their store" ON public.daily_sales;
DROP POLICY IF EXISTS "Managers can insert daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Managers can update daily_sales" ON public.daily_sales;

-- Create corrected RLS policies
CREATE POLICY "Users can view daily_sales of their store"
    ON public.daily_sales FOR SELECT
    USING (store_id IN (SELECT store_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Managers can insert daily_sales"
    ON public.daily_sales FOR INSERT
    WITH CHECK (
        store_id IN (SELECT store_id FROM public.users WHERE auth_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Managers can update daily_sales"
    ON public.daily_sales FOR UPDATE
    USING (
        store_id IN (SELECT store_id FROM public.users WHERE auth_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager'))
    );