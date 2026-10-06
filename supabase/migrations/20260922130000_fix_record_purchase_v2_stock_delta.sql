-- Superseded by 20260922144139_fix_purchase_posting_live_ledger_schema.sql.
-- The prior function body targeted accounts/journal_batches and could replace
-- the ledger_accounts/ledger_batches implementation used by production.
-- Keep this migration version as a harmless marker; the forward repair at
-- 20261003060559 restores the current production contract.
SELECT 'superseded: use the live-ledger purchase implementation' AS migration_note;
