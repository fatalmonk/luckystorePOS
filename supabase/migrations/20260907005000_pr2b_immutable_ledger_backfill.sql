-- Migration: 20260907005000_pr2b_immutable_ledger_backfill.sql
-- Description: PR 2B - High-Risk Immutable Ledger Maintenance Backfill
--              1. Creates private schema _remediation and remediation manifest table.
--              2. Identifies and stages all divergent ledger_entries rows.
--              3. Executes locked maintenance transaction to align debit_amount/credit_amount with debit/credit.
--              4. Validates chk_ledger_entries_debit_credit_sync constraint.

-- ============================================================================
-- 1. PRIVATE REMEDIATION SCHEMA & MANIFEST TABLE
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS _remediation;

REVOKE ALL ON SCHEMA _remediation FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA _remediation TO service_role, postgres;

CREATE TABLE IF NOT EXISTS _remediation.remediation_manifest (
  remediation_id text NOT NULL,
  ledger_entry_id uuid NOT NULL,
  store_id uuid,
  batch_id uuid,
  debit numeric,
  credit numeric,
  debit_amount numeric,
  credit_amount numeric,
  staged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (remediation_id, ledger_entry_id)
);

REVOKE ALL ON TABLE _remediation.remediation_manifest FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE _remediation.remediation_manifest TO service_role, postgres;

-- ============================================================================
-- 2. POPULATE MANIFEST WITH DIVERGENT ROWS
-- ============================================================================
INSERT INTO _remediation.remediation_manifest (
  remediation_id,
  ledger_entry_id,
  store_id,
  batch_id,
  debit,
  credit,
  debit_amount,
  credit_amount
)
SELECT
  'RUN_20260906_BACKFILL',
  le.id,
  le.store_id,
  le.batch_id,
  le.debit,
  le.credit,
  le.debit_amount,
  le.credit_amount
FROM public.ledger_entries le
WHERE (
  le.debit IS DISTINCT FROM le.debit_amount
  OR le.credit IS DISTINCT FROM le.credit_amount
)
ON CONFLICT (remediation_id, ledger_entry_id) DO NOTHING;

-- ============================================================================
-- 3. CONTROLLED MAINTENANCE BACKFILL TRANSACTION & CONSTRAINT VALIDATION
-- ============================================================================

-- Temporarily make the immutability trigger maintenance-aware.
-- This avoids ALTER TABLE ... DISABLE TRIGGER, which PostgreSQL rejects when
-- deferred trigger events are pending. The replacement is transactional: if
-- this migration fails, PostgreSQL restores the original function definition.
CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.ledger_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;

DO $$
DECLARE
  v_expected integer;
  v_actual integer;
BEGIN
  SELECT COUNT(*)
  INTO v_expected
  FROM _remediation.remediation_manifest
  WHERE remediation_id = 'RUN_20260906_BACKFILL';

  IF v_expected > 0 THEN
    LOCK TABLE public.ledger_entries IN SHARE ROW EXCLUSIVE MODE;

    PERFORM set_config('app.ledger_maintenance', 'on', true);

    UPDATE public.ledger_entries le
    SET
      debit_amount = le.debit,
      credit_amount = le.credit
    FROM _remediation.remediation_manifest rm
    WHERE rm.remediation_id = 'RUN_20260906_BACKFILL'
      AND rm.ledger_entry_id = le.id
      AND (
        le.debit IS DISTINCT FROM le.debit_amount
        OR le.credit IS DISTINCT FROM le.credit_amount
      );

    GET DIAGNOSTICS v_actual = ROW_COUNT;

    PERFORM set_config('app.ledger_maintenance', 'off', true);

    IF v_actual != v_expected THEN
      RAISE EXCEPTION
        'Backfill count mismatch: expected %, updated %; rolling back',
        v_expected,
        v_actual;
    END IF;

    -- Flush deferred ledger constraint-trigger events before ALTER TABLE.
    EXECUTE 'SET CONSTRAINTS ALL IMMEDIATE';
  END IF;

  ALTER TABLE public.ledger_entries
    VALIDATE CONSTRAINT chk_ledger_entries_debit_credit_sync;
END
$$;

-- Restore strict ledger immutability after maintenance.
CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;
