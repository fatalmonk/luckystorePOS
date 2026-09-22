-- Product identifiers are tenant-scoped. The former global uniqueness rules
-- prevented two independent tenants from using the same supplier barcode/SKU.
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_sku_key;
DROP INDEX IF EXISTS public.idx_items_barcode_unique;
DROP INDEX IF EXISTS public.idx_items_unique_barcode_non_empty;
DROP INDEX IF EXISTS public.idx_items_unique_sku_non_empty;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_tenant_barcode_unique
  ON public.items (tenant_id, NULLIF(btrim(barcode), ''))
  WHERE NULLIF(btrim(barcode), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_tenant_sku_unique
  ON public.items (tenant_id, NULLIF(btrim(sku), ''))
  WHERE NULLIF(btrim(sku), '') IS NOT NULL;
