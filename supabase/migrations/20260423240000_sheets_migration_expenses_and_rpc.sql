-- =================================================================================
-- Google Sheets to PostgreSQL/Supabase Backend Migration
-- Covers: Expenses, Cashbook Migration RPCs, and Ledger Integration
-- =================================================================================

-- 1) Create Expenses Table
-- Maps the Google Sheets "Accounts - Expenses" directly, but adds ledger tracking
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  vendor_name text NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_type text NOT NULL CHECK (payment_type IN ('Cash', 'Bank transfer', 'Bkash', 'Card')),
  category text NOT NULL,
  ledger_batch_id uuid REFERENCES public.ledger_batches(id),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'manager')));

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'manager')));

-- 2) Map Categories to Ledger Accounts
-- Ensures the categories from Google Sheets have matching ledger accounts
CREATE OR REPLACE FUNCTION public.ensure_expense_ledger_accounts(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '6000_CAPEX', 'Capital Expenditure', 'ASSET', true), -- CapEx is an asset until depreciated
    (p_store_id, '5200_UTILITIES', 'Utility Expenses', 'EXPENSE', true),
    (p_store_id, '5300_TRANSPORT', 'Transport & Conveyance', 'EXPENSE', true),
    (p_store_id, '5400_SALARY', 'Staff salary', 'EXPENSE', true),
    (p_store_id, '5500_MISC', 'All Other Expenses', 'EXPENSE', true),
    (p_store_id, '3100_PARTNERS_TAKE', 'Partners Take', 'EQUITY', true) -- Equity draw
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;

-- 3) RPC to Record an Expense and Post to Ledger
-- Safely maps an expense to a double-entry ledger batch
CREATE OR REPLACE FUNCTION public.record_expense(
  p_store_id uuid,
  p_date date,
  p_vendor text,
  p_description text,
  p_amount numeric,
  p_payment_type text,
  p_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expense_id uuid;
  v_batch_id uuid;
  v_user_id uuid;
  v_debit_account uuid;
  v_credit_account uuid;
  v_account_code text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  PERFORM public.ensure_expense_ledger_accounts(p_store_id);

  -- Determine Debit Account based on Category
  CASE p_category
    WHEN 'Capital Expenditure' THEN v_account_code := '6000_CAPEX';
    WHEN 'Utility Expenses' THEN v_account_code := '5200_UTILITIES';
    WHEN 'Transport & Conveyance' THEN v_account_code := '5300_TRANSPORT';
    WHEN 'Staff salary' THEN v_account_code := '5400_SALARY';
    WHEN 'Partners Take' THEN v_account_code := '3100_PARTNERS_TAKE';
    ELSE v_account_code := '5500_MISC';
  END CASE;

  SELECT id INTO v_debit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = v_account_code;

  -- Determine Credit Account (Payment Source)
  IF p_payment_type = 'Cash' THEN
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  END IF;

  -- Insert Expense Record
  INSERT INTO public.expenses (store_id, expense_date, vendor_name, description, amount, payment_type, category, created_by)
  VALUES (p_store_id, p_date, p_vendor, p_description, p_amount, p_payment_type, p_category, v_user_id)
  RETURNING id INTO v_expense_id;

  -- Create Ledger Batch (Atomic Transaction)
  INSERT INTO public.ledger_batches (store_id, source_type, source_id, source_ref, status, created_by)
  VALUES (p_store_id, 'expense', v_expense_id, 'Expense to ' || p_vendor, 'POSTED', v_user_id)
  RETURNING id INTO v_batch_id;

  -- Post Debit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_debit_account, 'Expense Debit', ROUND(p_amount, 2), 0);

  -- Post Credit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_credit_account, 'Payment Credit', 0, ROUND(p_amount, 2));

  -- Link Batch to Expense
  UPDATE public.expenses SET ledger_batch_id = v_batch_id WHERE id = v_expense_id;

  RETURN jsonb_build_object('status', 'SUCCESS', 'expense_id', v_expense_id, 'batch_id', v_batch_id);
END;
$$;

-- 4) RPC to Import Daily Aggregate Sales from Google Sheets
-- The CSV contains daily summaries (Date, Cash, Bkash, Total). We import these directly as journal entries.
CREATE OR REPLACE FUNCTION public.import_historical_daily_sale(
  p_store_id uuid,
  p_date date,
  p_cash_amount numeric,
  p_bkash_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id uuid;
  v_user_id uuid;
  v_cash_account uuid;
  v_bank_account uuid;
  v_revenue_account uuid;
  v_total_amount numeric := ROUND(p_cash_amount + p_bkash_amount, 2);
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Ensure accounts exist
  PERFORM public.ensure_sale_ledger_accounts(p_store_id);

  SELECT id INTO v_cash_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  SELECT id INTO v_bank_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '4000_SALES_REVENUE';

  -- Create Ledger Batch for the Historical Daily Sale
  INSERT INTO public.ledger_batches (store_id, source_type, source_ref, status, created_by, posted_at)
  VALUES (p_store_id, 'historical_sale', 'Sheets Import: ' || p_date::text, 'POSTED', v_user_id, p_date::timestamptz)
  RETURNING id INTO v_batch_id;

  -- Debit Cash
  IF p_cash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_cash_account, 'Historical Cash Sale', ROUND(p_cash_amount, 2), 0);
  END IF;

  -- Debit Bank/bKash
  IF p_bkash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_bank_account, 'Historical bKash Sale', ROUND(p_bkash_amount, 2), 0);
  END IF;

  -- Credit Revenue
  IF v_total_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_revenue_account, 'Historical Gross Revenue', 0, v_total_amount);
  END IF;

  RETURN jsonb_build_object('status', 'SUCCESS', 'batch_id', v_batch_id, 'total_imported', v_total_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_expense(uuid, date, text, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_historical_daily_sale(uuid, date, numeric, numeric) TO authenticated;
