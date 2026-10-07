-- Decommission legacy redundant catalog tables: public.products and public.inventory_items.
-- Canonical catalog single source of truth is public.items.

SET LOCAL lock_timeout = '5s';

-- 1. Create archive schema for historical safety
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Archive public.products if present
DO $$
DECLARE
  fk record;
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS archive.products_backup_20261007 AS
      SELECT * FROM public.products;

    -- Re-target or remove foreign key constraints referencing public.products
    IF to_regclass('public.inventory_adjustments') IS NOT NULL THEN
      ALTER TABLE public.inventory_adjustments
        DROP CONSTRAINT IF EXISTS inventory_adjustments_product_id_fkey;

      IF to_regclass('public.items') IS NOT NULL THEN
        ALTER TABLE public.inventory_adjustments
          ADD CONSTRAINT inventory_adjustments_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES public.items(id)
          ON DELETE SET NULL
          NOT VALID;
      END IF;
    END IF;

    IF to_regclass('public.online_order_items') IS NOT NULL THEN
      ALTER TABLE public.online_order_items
        DROP CONSTRAINT IF EXISTS online_order_items_item_id_fkey;

      IF to_regclass('public.items') IS NOT NULL THEN
        ALTER TABLE public.online_order_items
          ADD CONSTRAINT online_order_items_item_id_fkey
          FOREIGN KEY (item_id) REFERENCES public.items(id)
          ON DELETE SET NULL
          NOT VALID;
      END IF;
    END IF;

    -- Drop any remaining foreign keys referencing public.products
    FOR fk IN
      SELECT tc.table_schema, tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'products'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', fk.table_schema, fk.table_name, fk.constraint_name);
    END LOOP;

    DROP TABLE public.products RESTRICT;
  END IF;
END $$;

-- 3. Archive & drop public.inventory_items if present
DO $$
DECLARE
  fk record;
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.inventory_items LIMIT 1) THEN
      CREATE TABLE IF NOT EXISTS archive.inventory_items_backup_20261007 AS
        SELECT * FROM public.inventory_items;
    END IF;

    -- Re-target or remove foreign key constraints referencing public.inventory_items
    IF to_regclass('public.inventory_movements') IS NOT NULL THEN
      ALTER TABLE public.inventory_movements
        DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;

      IF to_regclass('public.items') IS NOT NULL THEN
        ALTER TABLE public.inventory_movements
          ADD CONSTRAINT inventory_movements_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES public.items(id)
          ON DELETE SET NULL
          NOT VALID;
      END IF;
    END IF;

    IF to_regclass('public.inventory_reconciliations') IS NOT NULL THEN
      ALTER TABLE public.inventory_reconciliations
        DROP CONSTRAINT IF EXISTS inventory_reconciliations_product_id_fkey;

      IF to_regclass('public.items') IS NOT NULL THEN
        ALTER TABLE public.inventory_reconciliations
          ADD CONSTRAINT inventory_reconciliations_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES public.items(id)
          ON DELETE SET NULL
          NOT VALID;
      END IF;
    END IF;

    -- Drop any remaining foreign keys referencing public.inventory_items
    FOR fk IN
      SELECT tc.table_schema, tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'inventory_items'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', fk.table_schema, fk.table_name, fk.constraint_name);
    END LOOP;

    DROP TABLE public.inventory_items RESTRICT;
  END IF;
END $$;
