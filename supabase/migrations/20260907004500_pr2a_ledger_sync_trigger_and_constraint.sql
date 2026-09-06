-- Migration: 20260907004500_pr2a_ledger_sync_trigger_and_constraint.sql
-- Description: PR 2A - Accounting Integrity Step 1.
--              1. Adds is_active flag to ledger_accounts.
--              2. Voids empty POSTED ledger batches with audit metadata.
--              3. Creates BEFORE INSERT synchronization trigger on ledger_entries to keep debit/credit and debit_amount/credit_amount in parity.
--              4. Adds unvalidated CHECK constraint chk_ledger_entries_debit_credit_sync.

-- ============================================================================
-- 1. LEDGER ACCOUNTS STATUS
-- ============================================================================
ALTER TABLE public.ledger_accounts
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================================
-- 2. TRANSITION EMPTY POSTED BATCHES TO VOIDED
-- ============================================================================
-- Target empty batches marked as POSTED that have no entries associated with them
UPDATE public.ledger_batches lb
SET 
  status = 'VOIDED',
  risk_flag = true,
  risk_note = COALESCE(risk_note || '; ', '') || 'Remediated empty POSTED batch transitioned to VOIDED via PR 2A'
WHERE lb.status = 'POSTED'
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le WHERE le.batch_id = lb.id
  );

-- ============================================================================
-- 3. BEFORE INSERT COLUMN SYNCHRONIZATION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_sync_ledger_entry_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reconcile whichever pair is provided by writer
  IF NEW.debit IS NOT NULL AND (NEW.debit_amount IS NULL OR NEW.debit_amount = 0) AND NEW.debit > 0 THEN
    NEW.debit_amount := NEW.debit;
  ELSIF NEW.debit_amount IS NOT NULL AND (NEW.debit IS NULL OR NEW.debit = 0) AND NEW.debit_amount > 0 THEN
    NEW.debit := NEW.debit_amount;
  ELSE
    NEW.debit_amount := COALESCE(NEW.debit, NEW.debit_amount, 0);
    NEW.debit := COALESCE(NEW.debit, NEW.debit_amount, 0);
  END IF;

  IF NEW.credit IS NOT NULL AND (NEW.credit_amount IS NULL OR NEW.credit_amount = 0) AND NEW.credit > 0 THEN
    NEW.credit_amount := NEW.credit;
  ELSIF NEW.credit_amount IS NOT NULL AND (NEW.credit IS NULL OR NEW.credit = 0) AND NEW.credit_amount > 0 THEN
    NEW.credit := NEW.credit_amount;
  ELSE
    NEW.credit_amount := COALESCE(NEW.credit, NEW.credit_amount, 0);
    NEW.credit := COALESCE(NEW.credit, NEW.credit_amount, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ledger_entry_columns ON public.ledger_entries;
CREATE TRIGGER trg_sync_ledger_entry_columns
BEFORE INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sync_ledger_entry_columns();

-- ============================================================================
-- 4. UNVALIDATED SYNC CHECK CONSTRAINT
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ledger_entries_debit_credit_sync'
  ) THEN
    ALTER TABLE public.ledger_entries
    ADD CONSTRAINT chk_ledger_entries_debit_credit_sync
    CHECK (debit = debit_amount AND credit = credit_amount) NOT VALID;
  END IF;
END $$;
