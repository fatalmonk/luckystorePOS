-- Recovered from production hvmyxyccfnkrbxqbhlnm migration history.
-- Preserve the original applied statement; do not replay it on production.
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
SELECT s.id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true
FROM public.stores AS s
WHERE s.id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM public.ledger_accounts AS la
    WHERE la.store_id = s.id AND la.code = '1200_INVENTORY'
  )
ON CONFLICT (store_id, code) DO NOTHING;
