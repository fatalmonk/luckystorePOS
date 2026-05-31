-- Import hardening migration for backend-first MVP shipping.
-- Adds importer observability and data-integrity constraints/indexes.

-- 1) Import run observability table
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.import_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    initiated_by uuid,
    row_count integer NOT NULL DEFAULT 0,
    rows_succeeded integer NOT NULL DEFAULT 0,
    rows_failed integer NOT NULL DEFAULT 0,
    error_count integer NOT NULL DEFAULT 0,
    duration_ms integer,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  );

  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    ALTER TABLE public.import_runs DROP CONSTRAINT IF EXISTS fk_import_runs_initiated_by;
    ALTER TABLE public.import_runs
      ADD CONSTRAINT fk_import_runs_initiated_by
      FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON public.import_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_runs_initiated_by ON public.import_runs(initiated_by);

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
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
  END IF;
END $$;

-- 2) Data-guard indexes/constraints for importer hot paths
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'categories' AND schemaname = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stores' AND schemaname = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_stores_code ON public.stores(code);
  END IF;
END $$;

-- Enforce unique identity for non-empty barcode/sku values.
-- Uses expression indexes to avoid treating empty strings as real identities.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'items' AND schemaname = 'public') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'barcode'
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_barcode_non_empty
      ON public.items ((NULLIF(TRIM(barcode), '')))
      WHERE NULLIF(TRIM(barcode), '') IS NOT NULL;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'sku'
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_sku_non_empty
      ON public.items ((NULLIF(TRIM(sku), '')))
      WHERE NULLIF(TRIM(sku), '') IS NOT NULL;
    END IF;
  END IF;
END $$;
