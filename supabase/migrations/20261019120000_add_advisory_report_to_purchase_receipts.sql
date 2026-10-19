-- Migration: add advisory_report JSONB column to purchase_receipts
-- Stores JEV evidence evaluation, reconciliation delta, and advisory recommendation.

ALTER TABLE public.purchase_receipts
  ADD COLUMN IF NOT EXISTS advisory_report JSONB DEFAULT NULL;

COMMENT ON COLUMN public.purchase_receipts.advisory_report IS
  'Snapshot of JEV advisory evidence, deterministic reconciliation delta, and verification status at time of manual approval.';
