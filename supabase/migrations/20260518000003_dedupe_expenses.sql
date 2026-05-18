-- Migration: Remove duplicate rows from expenses table
-- Duplicates defined by: store_id + expense_date + vendor_name + description + amount

DELETE FROM public.expenses a
USING (
    SELECT MIN(id::text) as keep_id, store_id, expense_date, vendor_name, description, amount
    FROM public.expenses
    GROUP BY store_id, expense_date, vendor_name, description, amount
    HAVING COUNT(*) > 1
) b
WHERE a.store_id = b.store_id
  AND a.expense_date = b.expense_date
  AND a.vendor_name = b.vendor_name
  AND a.description = b.description
  AND a.amount = b.amount
  AND a.id::text != b.keep_id;

COMMENT ON TABLE public.expenses IS 'Expenses - deduplicated on store_id+date+vendor+description+amount';
