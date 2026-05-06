-- =============================================================================
-- Bootstrap: Minimum replay-compatible schema for pre-foundation migrations.
-- Runs immediately before 20231118120000_add_stock_functions.sql.
-- Provides the legacy/core tables that early migrations assumed existed.
-- =============================================================================
-- Convention-bridge identity model:
--   users.id        = canonical PK, REFERENCES auth.users(id). Always = auth.uid().
--   users.auth_id   = compatibility mirror of users.id. Exists for pre-foundation
--                     RLS policies that predate the merged-id foundation design.
--   CHECK (auth_id = id) enforces this mirror at the schema level.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM types (idempotent; also created by 20260420100000)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.sale_status AS ENUM ('completed', 'voided', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('cash', 'mobile_banking', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1) tenants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2) stores  (tenant_id added by foundation 20260426213606)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3) users — convention-bridge identity model
--    id REFERENCES auth.users(id) is the canonical identity.
--    auth_id is the legacy compatibility mirror (always = id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_id UUID NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'cashier',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_auth_id_mirrors_id CHECK (auth_id = id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id_unique ON public.users(auth_id);

-- ---------------------------------------------------------------------------
-- 4) categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5) items — single canonical inventory table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2),
    cost NUMERIC(12,2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6) stock_movements — production schema (foundation will skip via IF NOT EXISTS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason TEXT,
    notes TEXT,
    meta JSONB,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7) stock_levels — composite PK (store_id, item_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_levels (
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    qty INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    CONSTRAINT stock_levels_pkey PRIMARY KEY (store_id, item_id)
);

-- ---------------------------------------------------------------------------
-- 8) sales — full schema from 20260420100000 so its IF NOT EXISTS is a clean skip
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number TEXT NOT NULL UNIQUE,
    receipt_number TEXT,
    store_id UUID NOT NULL REFERENCES public.stores(id),
    cashier_id UUID NOT NULL REFERENCES public.users(id),
    status public.sale_status NOT NULL DEFAULT 'completed',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_tendered NUMERIC(12,2),
    change_due NUMERIC(12,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9) sale_items — full schema from 20260420100000 so its IF NOT EXISTS is a clean skip
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    line_total NUMERIC(12,2) NOT NULL,
    UNIQUE (sale_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all bootstrap tables (policies are created by later migrations)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
