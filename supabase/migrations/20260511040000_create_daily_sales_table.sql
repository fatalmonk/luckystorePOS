-- Migration: Create daily_sales table for importing historical daily sales data
-- Applied: 2026-05-11

-- Create daily_sales table
CREATE TABLE IF NOT EXISTS public.daily_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_date date NOT NULL,
    cash_amount numeric(12,2) DEFAULT 0,
    bkash_amount numeric(12,2) DEFAULT 0,
    credit_amount numeric(12,2) DEFAULT 0,
    total_sales numeric(12,2) DEFAULT 0,
    stock_purchase numeric(12,2) DEFAULT 0,
    daily_expense numeric(12,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(store_id, sale_date)
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_store_date ON public.daily_sales(store_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(sale_date DESC);

-- Enable RLS
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view daily_sales of their store"
    ON public.daily_sales FOR SELECT
    USING (store_id IN (SELECT store_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Managers can insert daily_sales"
    ON public.daily_sales FOR INSERT
    WITH CHECK (
        store_id IN (SELECT store_id FROM public.users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "Managers can update daily_sales"
    ON public.daily_sales FOR UPDATE
    USING (
        store_id IN (SELECT store_id FROM public.users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_daily_sales_updated_at
    BEFORE UPDATE ON public.daily_sales
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO service_role;

-- Add comment
COMMENT ON TABLE public.daily_sales IS 'Daily sales summary data imported from historical records';