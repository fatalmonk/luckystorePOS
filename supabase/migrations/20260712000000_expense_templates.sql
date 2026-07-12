-- Create expense_templates table
CREATE TABLE IF NOT EXISTS public.expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  name text NOT NULL,
  vendor_name text,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_type text NOT NULL CHECK (payment_type IN ('Cash', 'Bank transfer', 'Bkash', 'Card')),
  category text NOT NULL,

  is_pinned boolean NOT NULL DEFAULT false,

  recurrence_interval text NOT NULL DEFAULT 'none' CHECK (recurrence_interval IN ('none', 'weekly', 'monthly')),
  recurrence_anchor_date date,
  recurrence_day_of_month smallint CHECK (recurrence_day_of_month BETWEEN 1 AND 28),
  recurrence_day_of_week smallint CHECK (recurrence_day_of_week BETWEEN 0 AND 6),

  last_triggered_at timestamptz,
  next_due_at date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_recurrence_anchor
    CHECK (recurrence_interval = 'none' OR recurrence_anchor_date IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_templates_store_id ON public.expense_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_pinned ON public.expense_templates(store_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_expense_templates_next_due ON public.expense_templates(store_id, next_due_at) WHERE recurrence_interval != 'none';

-- RLS Settings
ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select_own_store" ON public.expense_templates
  FOR SELECT TO authenticated
  USING (store_id = public.get_current_user_store_id());

CREATE POLICY "templates_write_own_store" ON public.expense_templates
  FOR ALL TO authenticated
  USING (store_id = public.get_current_user_store_id())
  WITH CHECK (store_id = public.get_current_user_store_id());
