-- Migration: Deduplicate daily_sales RLS policies
-- Issue: Multiple migrations created policies with same names
-- Fix: Drop all daily_sales policies, recreate only the correct ones

-- Drop all existing daily_sales policies (idempotent)
DROP POLICY IF EXISTS "Users can view daily_sales of their store" ON public.daily_sales;
DROP POLICY IF EXISTS "Managers can insert daily_sales" ON public.daily_sales;
DROP POLICY IF EXISTS "Managers can update daily_sales" ON public.daily_sales;

-- Recreate only the corrected policies (from 20260511060100_fix_daily_sales_rls.sql)
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
