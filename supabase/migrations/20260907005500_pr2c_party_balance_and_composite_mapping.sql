-- Migration: 20260907005500_pr2c_party_balance_and_composite_mapping.sql
-- Description: PR 2C - Party AR/AP Balance Alignment & Payment Method Composite Mapping
--              1. Composite Foreign-Key DDL linking payment_methods(store_id, ledger_account_id)
--                 to ledger_accounts(store_id, id).
--              2. Active payment-method constraint requiring mapped ledger_account_id.
--              3. Backfill payment method mappings across all active stores.
--              4. Automated trigger to auto-assign default ledger accounts for new payment methods.
--              5. Reconcile parties.current_balance against canonical posted ledger entries (AR & AP).
--              6. Update resolve_payment_ledger_account to prioritize explicit mappings.

-- ============================================================================
-- 1. COMPOSITE FOREIGN KEY DDL & CONSTRAINTS
-- ============================================================================

-- Step 1.1: Add ledger_account_id column to payment_methods if not present
ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS ledger_account_id uuid;

-- Step 1.2: Add unique constraint on ledger_accounts(store_id, id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ledger_accounts_store_id_id_key'
  ) THEN
    ALTER TABLE public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_store_id_id_key
    UNIQUE (store_id, id);
  END IF;
END $$;

-- Step 1.3: Ensure standard Cash and Bank ledger accounts exist for stores with payment methods
INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system, is_active)
SELECT DISTINCT pm.store_id, '1000_CASH', 'Cash on Hand', 'ASSET', true, true
FROM public.payment_methods pm
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_accounts la 
  WHERE la.store_id = pm.store_id AND la.code = '1000_CASH'
)
ON CONFLICT (store_id, code) DO NOTHING;

INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system, is_active)
SELECT DISTINCT pm.store_id, '1010_BANK', 'Bank / Mobile Settlement', 'ASSET', true, true
FROM public.payment_methods pm
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_accounts la 
  WHERE la.store_id = pm.store_id AND la.code = '1010_BANK'
)
ON CONFLICT (store_id, code) DO NOTHING;

-- Step 1.4: Add foreign key constraint linking (store_id, ledger_account_id) -> ledger_accounts(store_id, id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_store_ledger_account_fkey'
  ) THEN
    ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_store_ledger_account_fkey
    FOREIGN KEY (store_id, ledger_account_id)
    REFERENCES public.ledger_accounts (store_id, id);
  END IF;
END $$;

-- ============================================================================
-- 2. BACKFILL PAYMENT METHOD ACCOUNT MAPPINGS
-- ============================================================================

-- Backfill cash payment methods to 1000_CASH
UPDATE public.payment_methods pm
SET ledger_account_id = la.id
FROM public.ledger_accounts la
WHERE la.store_id = pm.store_id
  AND la.code = '1000_CASH'
  AND pm.type = 'cash'
  AND pm.ledger_account_id IS NULL;

-- Backfill non-cash payment methods (mobile_banking, card, etc.) to 1010_BANK
UPDATE public.payment_methods pm
SET ledger_account_id = la.id
FROM public.ledger_accounts la
WHERE la.store_id = pm.store_id
  AND la.code = '1010_BANK'
  AND pm.type != 'cash'
  AND pm.ledger_account_id IS NULL;

-- Fallback for any active payment methods where type didn't match: map to 1000_CASH
UPDATE public.payment_methods pm
SET ledger_account_id = la.id
FROM public.ledger_accounts la
WHERE la.store_id = pm.store_id
  AND la.code = '1000_CASH'
  AND pm.is_active = true
  AND pm.ledger_account_id IS NULL;

-- ============================================================================
-- 3. ACTIVE PAYMENT METHOD CONSTRAINT & VALIDATION
-- ============================================================================

-- Add constraint as NOT VALID if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_methods_active_account_mapped'
  ) THEN
    ALTER TABLE public.payment_methods
    ADD CONSTRAINT chk_payment_methods_active_account_mapped
    CHECK (NOT is_active OR ledger_account_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

-- Validate constraint now that all active rows are backfilled
-- The composite foreign key above can queue deferred trigger events during the
-- mapping updates. Flush them before ALTER TABLE validation.
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE public.payment_methods
VALIDATE CONSTRAINT chk_payment_methods_active_account_mapped;

-- ============================================================================
-- 4. AUTO-ASSIGN TRIGGER FOR NEW / UPDATED PAYMENT METHODS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_fn_auto_assign_payment_method_ledger_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If active and ledger_account_id is not specified, auto-map to standard store account
  IF NEW.ledger_account_id IS NULL AND NEW.is_active = true THEN
    IF NEW.type = 'cash' THEN
      SELECT id INTO NEW.ledger_account_id
      FROM public.ledger_accounts
      WHERE store_id = NEW.store_id AND code = '1000_CASH' AND is_active = true
      LIMIT 1;
    ELSE
      SELECT id INTO NEW.ledger_account_id
      FROM public.ledger_accounts
      WHERE store_id = NEW.store_id AND code = '1010_BANK' AND is_active = true
      LIMIT 1;
    END IF;

    -- If still null, fallback to 1000_CASH of the store
    IF NEW.ledger_account_id IS NULL THEN
      SELECT id INTO NEW.ledger_account_id
      FROM public.ledger_accounts
      WHERE store_id = NEW.store_id AND code = '1000_CASH'
      LIMIT 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_payment_method_ledger_account ON public.payment_methods;
CREATE TRIGGER trg_auto_assign_payment_method_ledger_account
BEFORE INSERT OR UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_auto_assign_payment_method_ledger_account();

-- ============================================================================
-- 5. RECONCILE PARTY AR/AP BALANCES AGAINST POSTED LEDGER ENTRIES
-- ============================================================================

-- Customer Balances: Reconcile against posted 1300_ACCOUNTS_RECEIVABLE (Debit - Credit)
UPDATE public.parties p
SET current_balance = COALESCE((
  SELECT SUM(COALESCE(le.debit, le.debit_amount, 0) - COALESCE(le.credit, le.credit_amount, 0))
  FROM public.ledger_entries le
  JOIN public.ledger_accounts la ON la.id = le.account_id
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  WHERE le.party_id = p.id
    AND la.code = '1300_ACCOUNTS_RECEIVABLE'
    AND lb.status NOT IN ('VOIDED', 'DELETED')
), 0)
WHERE p.type = 'customer';

-- Supplier Balances: Reconcile against posted 2000_ACCOUNTS_PAYABLE (Credit - Debit)
UPDATE public.parties p
SET current_balance = COALESCE((
  SELECT SUM(COALESCE(le.credit, le.credit_amount, 0) - COALESCE(le.debit, le.debit_amount, 0))
  FROM public.ledger_entries le
  JOIN public.ledger_accounts la ON la.id = le.account_id
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  WHERE le.party_id = p.id
    AND la.code = '2000_ACCOUNTS_PAYABLE'
    AND lb.status NOT IN ('VOIDED', 'DELETED')
), 0)
WHERE p.type = 'supplier';

-- ============================================================================
-- 6. UPDATE RESOLVE_PAYMENT_LEDGER_ACCOUNT TO USE EXPLICIT MAPPING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_payment_ledger_account(
  p_store_id uuid,
  p_payment_method_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account uuid;
  v_type public.payment_type;
BEGIN
  -- 1. Check explicit composite mapping on payment_methods
  SELECT pm.ledger_account_id, pm.type INTO v_account, v_type
  FROM public.payment_methods pm
  WHERE pm.id = p_payment_method_id
    AND pm.store_id = p_store_id
  LIMIT 1;

  IF v_account IS NOT NULL THEN
    RETURN v_account;
  END IF;

  -- 2. Fallback to code resolution if explicit mapping is null
  IF v_type = 'cash' THEN
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1000_CASH'
    LIMIT 1;
  ELSE
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1010_BANK'
    LIMIT 1;
  END IF;

  RETURN v_account;
END;
$$;
