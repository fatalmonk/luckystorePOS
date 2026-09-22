-- Financial records are posted only through reviewed SECURITY DEFINER RPCs.
-- RLS policies are defense in depth; table privileges must not permit callers
-- to bypass the posting boundary with direct mutations or truncation.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ledger_accounts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ledger_batches FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ledger_entries FROM anon, authenticated;

-- These authenticated INSERT policies made the grants above effective. Remove
-- them as defense in depth so a future grant cannot reopen direct ledger writes.
DROP POLICY IF EXISTS lb_insert ON public.ledger_batches;
DROP POLICY IF EXISTS le_insert ON public.ledger_entries;
DROP POLICY IF EXISTS le_insert_tenant ON public.ledger_entries;
