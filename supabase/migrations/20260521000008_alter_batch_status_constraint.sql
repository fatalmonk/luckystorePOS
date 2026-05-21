-- Allow 'DELETED' status for soft-delete ledger batches
-- Previous check constraint only allowed DRAFT, POSTED, VOIDED

ALTER TABLE public.ledger_batches
DROP CONSTRAINT IF EXISTS ledger_batches_status_check;

ALTER TABLE public.ledger_batches
ADD CONSTRAINT ledger_batches_status_check
CHECK (status = ANY (ARRAY['DRAFT'::text, 'POSTED'::text, 'VOIDED'::text, 'DELETED'::text]));
