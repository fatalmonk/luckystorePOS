-- Consolidate duplicate suppliers table into canonical public.parties table.
-- Unified party model supports customers, suppliers, and dual entities.

SET LOCAL lock_timeout = '5s';

-- 1. Create archive schema for backup safety
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Create supporting lookup index on parties for fast deduplication lookup
CREATE INDEX IF NOT EXISTS idx_parties_tenant_name ON public.parties (tenant_id, name);

-- 3. Archive and reconcile suppliers into parties
DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.suppliers LIMIT 1) THEN
      CREATE TABLE IF NOT EXISTS archive.suppliers_backup_20261007 AS
        SELECT * FROM public.suppliers;

      INSERT INTO public.parties (id, tenant_id, party_type, type, name, phone, created_at)
      SELECT
        s.id,
        COALESCE(s.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid),
        'supplier',
        'supplier',
        s.name,
        s.phone,
        COALESCE(s.created_at, now())
      FROM public.suppliers s
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = s.id OR (p.tenant_id = s.tenant_id AND p.name = s.name)
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Update purchase_orders foreign key to point to canonical parties table (NOT VALID + VALIDATE)
    IF to_regclass('public.purchase_orders') IS NOT NULL THEN
      ALTER TABLE public.purchase_orders
        DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;

      ALTER TABLE public.purchase_orders
        ADD CONSTRAINT purchase_orders_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.parties(id)
        ON DELETE SET NULL
        NOT VALID;

      ALTER TABLE public.purchase_orders
        VALIDATE CONSTRAINT purchase_orders_supplier_id_fkey;
    END IF;

    -- Safe drop using RESTRICT after all documented dependents have been re-targeted
    DROP TABLE public.suppliers RESTRICT;
  END IF;
END $$;
