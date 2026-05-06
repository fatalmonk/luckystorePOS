-- Inventory scaling support:
-- 1) Atomic stock delta apply helper for imports
-- 2) Text-search performance indexes
-- 3) Import run observability indexes

CREATE OR REPLACE FUNCTION public.import_apply_stock_delta(
  p_store_id uuid,
  p_item_id uuid,
  p_delta integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be > 0';
  END IF;

  WITH upserted AS (
    INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (p_store_id, p_item_id, p_delta)
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET qty = public.stock_levels.qty + EXCLUDED.qty
    RETURNING (xmax = 0) AS inserted
  )
  SELECT inserted INTO v_inserted FROM upserted;

  RETURN COALESCE(v_inserted, false);
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_items_name_trgm
ON public.items USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_items_barcode_trgm
ON public.items USING gin (barcode gin_trgm_ops)
WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_sku_trgm
ON public.items USING gin (sku gin_trgm_ops)
WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_import_runs_status_created_at
ON public.import_runs(status, created_at DESC);

