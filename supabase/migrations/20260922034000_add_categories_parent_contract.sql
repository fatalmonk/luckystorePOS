-- Ensure hierarchical category support is replayable in all environments.
-- Production already has this shape; disposable/test databases may not because
-- the original hierarchy rollout lived under scripts/db instead of migrations.
--
-- Keep this migration transactional: it installs only the column/FK contract.
-- The supporting index is built concurrently in the immediately following
-- nontransactional migration.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id)
      REFERENCES public.categories(id)
      ON DELETE SET NULL;
  END IF;
END
$migration$;
