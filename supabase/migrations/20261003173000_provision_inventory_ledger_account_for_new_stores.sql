-- Ensure purchase posting has its required store-scoped inventory account.
-- The earlier production seed is intentionally a no-op on fresh installs.

CREATE OR REPLACE FUNCTION public.provision_inventory_ledger_account_for_new_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system, is_active)
  VALUES (NEW.id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true, true)
  ON CONFLICT (store_id, code) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_inventory_ledger_account_for_new_store()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS provision_inventory_ledger_account_for_new_store ON public.stores;
CREATE TRIGGER provision_inventory_ledger_account_for_new_store
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.provision_inventory_ledger_account_for_new_store();

-- Install the trigger first. This backfill then includes stores created before
-- trigger installation, while concurrent later inserts are covered by it.
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system, is_active)
SELECT s.id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true, true
FROM public.stores AS s
ON CONFLICT (store_id, code) DO NOTHING;
