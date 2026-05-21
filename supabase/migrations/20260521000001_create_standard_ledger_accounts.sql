-- Create standard ledger accounts for all stores
-- Cash, Bank, and Sales Revenue for customer ledger operations

-- 1. Cash Account (ASSET)
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '1000_CASH', 'Cash', 'ASSET', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '1000_CASH'
);

-- 2. Bank Account (ASSET)
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '1100_BANK', 'Bank', 'ASSET', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '1100_BANK'
);

-- 3. Sales Revenue Account (REVENUE) — used for credit sale postings
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '4000_SALES_REVENUE', 'Sales Revenue', 'REVENUE', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '4000_SALES_REVENUE'
);

-- 4. Credit Sales Account (REVENUE) — optional separate tracker for credit-only sales
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT id, '4100_CREDIT_SALES', 'Credit Sales', 'REVENUE', true
FROM public.stores
WHERE NOT EXISTS (
    SELECT 1 FROM public.ledger_accounts
    WHERE store_id = stores.id AND code = '4100_CREDIT_SALES'
);

-- Verify created accounts
SELECT code, name, account_type, COUNT(*) as store_count
FROM public.ledger_accounts
WHERE code IN ('1000_CASH', '1100_BANK', '4000_SALES_REVENUE', '4100_CREDIT_SALES', '1300_ACCOUNTS_RECEIVABLE', '2000_ACCOUNTS_PAYABLE')
GROUP BY code, name, account_type
ORDER BY code;
