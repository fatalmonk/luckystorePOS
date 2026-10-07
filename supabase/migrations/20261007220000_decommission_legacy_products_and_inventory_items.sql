-- Decommission legacy redundant catalog tables: public.products and public.inventory_items.
-- Canonical catalog single source of truth is public.items.

SET LOCAL lock_timeout = '5s';

-- 1. Create archive schema for historical safety
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Archive public.products if present
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS archive.products_backup_20261007 AS
      SELECT * FROM public.products;

    DROP TABLE public.products RESTRICT;
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

    DROP TABLE public.inventory_items RESTRICT;
  END IF;
END $$;
