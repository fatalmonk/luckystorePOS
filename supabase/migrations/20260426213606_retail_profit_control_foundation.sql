-- Phase 1: Database Schema Foundation for Retail Profit Control System
-- Priority sequence as defined in Execution Spec v1
--
-- PATCHED (Option A): Additive/idempotent for replay compatibility.
-- Bootstrap (20231117000000) already provides: tenants, stores, users, categories,
-- items, stock_movements, stock_levels, sales, sale_items.
-- This migration adds net-new foundation tables and injects tenant_id into pre-existing tables.

-- =============================================================================
-- 1. tenants — bootstrap already created; make idempotent
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. stores — bootstrap created without tenant_id; add tenant_id column + FK
-- =============================================================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If bootstrap created stores without tenant_id, add it now.
DO $$
BEGIN
  ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tenant_id UUID;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'stores'
      AND kcu.column_name = 'tenant_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Backfill: if any rows lack tenant_id, this is a data gap from manual creation.
    -- Add FK as NOT VALID to avoid locking on existing rows; validate separately.
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  -- Ensure tenant_id is NOT NULL after backfill.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'tenant_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Create a default tenant row if none exists.
    IF NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1) THEN
      INSERT INTO public.tenants (name) VALUES ('default');
    END IF;

    -- Backfill any null tenant_id with the first available tenant.
    UPDATE public.stores
    SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
    WHERE tenant_id IS NULL;

    ALTER TABLE public.stores ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 3. users — bootstrap already created with convention-bridge model.
--    Only add tenant_id. Do NOT recreate the table.
-- =============================================================================
DO $$
BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'users'
      AND kcu.column_name = 'tenant_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  -- Ensure tenant_id is NOT NULL after backfill.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Create a default tenant row if none exists.
    IF NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1) THEN
      INSERT INTO public.tenants (name) VALUES ('default');
    END IF;

    -- Backfill any null tenant_id with the first available tenant.
    UPDATE public.users
    SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
    WHERE tenant_id IS NULL;

    ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 4. parties — genuinely new table
-- =============================================================================
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'employee')),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. accounts — genuinely new table
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. journal_batches — genuinely new table
-- =============================================================================
CREATE TABLE IF NOT EXISTS journal_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. ledger_entries — genuinely new table
-- =============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    journal_batch_id UUID NOT NULL REFERENCES journal_batches(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    party_id UUID REFERENCES parties(id),
    debit_amount NUMERIC(15, 4) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(15, 4) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BDT',
    reference_type TEXT NOT NULL,
    reference_id UUID,
    notes TEXT,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reversal_of_entry_id UUID REFERENCES ledger_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =============================================================================
-- 8. inventory_items — REMOVED.
--    public.items (bootstrap 20231117000000) is the single canonical inventory table.
--    The foundation's inventory_items was an aspirational rename that was never
--    applied to production. Downstream references (purchase_receiving_v2 L40)
--    have been patched to reference public.items(id).
-- =============================================================================

-- =============================================================================
-- 9. stock_movements — bootstrap already created with production schema.
--    Make idempotent so foundation-era columns can be added additively.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity_change NUMERIC(15, 4) NOT NULL,
    weighted_average_cost NUMERIC(15, 4) NOT NULL DEFAULT 0,
    reference_type TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Add foundation-era columns if bootstrap-created stock_movements lacks them.
DO $$
BEGIN
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS quantity_change NUMERIC(15, 4);
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS weighted_average_cost NUMERIC(15, 4) DEFAULT 0;
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_type TEXT;
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_id UUID;
  ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
END $$;

-- =============================================================================
-- 10. idempotency_keys — genuinely new table
-- =============================================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_body JSONB
);

-- =============================================================================
-- Enable RLS on genuinely new foundation tables (bootstrap tables already have RLS)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tenants' AND schemaname = 'public') THEN
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stores' AND schemaname = 'public') THEN
    ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'parties' AND schemaname = 'public') THEN
    ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'accounts' AND schemaname = 'public') THEN
    ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'journal_batches' AND schemaname = 'public') THEN
    ALTER TABLE journal_batches ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ledger_entries' AND schemaname = 'public') THEN
    ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stock_movements' AND schemaname = 'public') THEN
    ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'idempotency_keys' AND schemaname = 'public') THEN
    ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================================================
-- Helper function: current_tenant_id()
-- =============================================================================
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
