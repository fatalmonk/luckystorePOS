-- Decommission legacy redundant catalog tables: public.products and public.inventory_items.
-- Canonical catalog single source of truth is public.items.

-- 1. Create archive schema for historical safety
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Archive public.products if present
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS archive.products_backup_20261007 AS
      SELECT * FROM public.products;

    -- Reconcile any missing items from products into items before dropping
    INSERT INTO public.items (
      tenant_id,
      name,
      sku,
      barcode,
      price,
      cost,
      category_id,
      image_url,
      is_active,
      created_at
    )
    SELECT
      COALESCE(p.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid),
      p.name,
      p.sku,
      p.barcode,
      COALESCE(p.price, 0),
      COALESCE(p.cost, 0),
      p.category_id,
      p.image_url,
      COALESCE(p.is_active, true),
      COALESCE(p.created_at, now())
    FROM public.products p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.items i
      WHERE (p.sku IS NOT NULL AND i.sku = p.sku)
         OR (p.barcode IS NOT NULL AND i.barcode = p.barcode)
         OR i.name = p.name
    )
    ON CONFLICT DO NOTHING;

    DROP TABLE public.products CASCADE;
  END IF;
END $$;

-- 3. Archive & drop public.inventory_items if present
DO $$
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.inventory_items LIMIT 1) THEN
      CREATE TABLE IF NOT EXISTS archive.inventory_items_backup_20261007 AS
        SELECT * FROM public.inventory_items;
    END IF;

    DROP TABLE public.inventory_items CASCADE;
  END IF;
END $$;
