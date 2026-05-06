-- Import hardening migration for backend-first MVP shipping.
-- Adds importer observability and data-integrity constraints/indexes.

-- 1) Import run observability table
CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  initiated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  row_count integer NOT NULL DEFAULT 0,
  rows_succeeded integer NOT NULL DEFAULT 0,
  rows_failed integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON public.import_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_runs_initiated_by ON public.import_runs(initiated_by);

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS import_runs_admin_manager_select ON public.import_runs;
CREATE POLICY import_runs_admin_manager_select
ON public.import_runs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.role IN ('admin', 'manager')
  )
);

-- 2) Data-guard indexes/constraints for importer hot paths
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_stores_code ON public.stores(code);

-- Enforce unique identity for non-empty barcode/sku values.
-- Uses expression indexes to avoid treating empty strings as real identities.
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_barcode_non_empty
ON public.items ((NULLIF(TRIM(barcode), '')))
WHERE NULLIF(TRIM(barcode), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_sku_non_empty
ON public.items ((NULLIF(TRIM(sku), '')))
WHERE NULLIF(TRIM(sku), '') IS NOT NULL;
