-- Import Inventory From CSV
-- This file was originally a manual data-import script that depended on temp_inventory_import
-- and hardcoded local data. It must not run during deterministic migration replay.
-- Runtime/import behavior belongs in supabase/functions/import-inventory or scripts/data.
DO $$
BEGIN
  RAISE NOTICE 'Skipping manual CSV import during deterministic migration replay.';
END $$;
