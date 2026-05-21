-- Drop the ledger_batches mutation trigger to allow soft-delete via status update
-- The ledger_entries trigger still protects actual transaction lines (immutable ledger)
-- delete_ledger_transaction RPC handles soft-delete by setting status = 'DELETED'

DROP TRIGGER IF EXISTS trg_prevent_ledger_batches_mutation ON public.ledger_batches;
