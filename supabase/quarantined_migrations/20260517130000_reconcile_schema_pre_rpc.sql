-- =============================================================================
-- Migration: Reconcile Schema Pre-RPC
-- Timestamp: 20260517130000
-- Purpose: Add missing tables, align column names, and resolve prerequisites
--          before staging RPC definitions are applied.
-- =============================================================================

-- =============================================================================
-- 0. PRE-RPC DRIFT CLEANUP: Drop stale overloaded duplicate functions
--    to prevent "is not unique" ambiguity errors.
-- =============================================================================
DROP FUNCTION IF EXISTS public.adjust_stock(uuid, uuid, integer, text, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.void_sale(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_stock_level_by_id(uuid) CASCADE;


-- 1. Conditionally recreate enum types if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM ('sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer', 'manual', 'sync_repair');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_type') THEN
    CREATE TYPE public.reference_type AS ENUM ('sale', 'purchase', 'expense', 'adjustment', 'system', 'sync');
  END IF;
END $$;

-- 2. Extend core tables to ensure complete structural parity with staging
-- 2.1 categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- 2.2 users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pos_pin text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pos_pin_hash text;

-- 2.3 stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS code text DEFAULT '';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- 3. Standardize is_active and active columns for dual-support on items & suppliers
-- This ensures absolute compatibility for both frontend (is_active) and staging RPCs (active)

-- 3.1 items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Backfill missing values
UPDATE public.items 
SET active = COALESCE(active, is_active, true),
    is_active = COALESCE(is_active, active, true);

-- 3.2 suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Backfill missing values
UPDATE public.suppliers 
SET active = COALESCE(active, is_active, true),
    is_active = COALESCE(is_active, active, true);

-- 3.3 Create synchronization function and trigger
CREATE OR REPLACE FUNCTION public.sync_active_is_active()
RETURNS trigger AS $$
BEGIN
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    NEW.is_active := NEW.active;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.active := NEW.is_active;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_items_active ON public.items;
CREATE TRIGGER trg_sync_items_active
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_active_is_active();
DROP TRIGGER IF EXISTS trg_sync_suppliers_active ON public.suppliers;
CREATE TRIGGER trg_sync_suppliers_active
  BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_active_is_active();

-- 3.4 stock_levels
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS qty integer DEFAULT 0;
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS qty_on_hand integer DEFAULT 0;

-- Backfill missing values
UPDATE public.stock_levels 
SET qty = COALESCE(qty, qty_on_hand, 0),
    qty_on_hand = COALESCE(qty_on_hand, qty, 0);

-- Create synchronization function and trigger
CREATE OR REPLACE FUNCTION public.sync_qty_qty_on_hand()
RETURNS trigger AS $$
BEGIN
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    NEW.qty_on_hand := NEW.qty;
  ELSIF NEW.qty_on_hand IS DISTINCT FROM OLD.qty_on_hand THEN
    NEW.qty := NEW.qty_on_hand;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_qty_qty_on_hand ON public.stock_levels;
CREATE TRIGGER trg_sync_qty_qty_on_hand
  BEFORE INSERT OR UPDATE ON public.stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_qty_qty_on_hand();

-- 4. Create missing tables on local to match remote staging
-- 4.1 rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    count integer NOT NULL DEFAULT 0,
    reset_at timestamp with time zone NOT NULL
);

-- 4.2 receipt_counters
CREATE TABLE IF NOT EXISTS public.receipt_counters (
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    date date NOT NULL,
    counter integer DEFAULT 0,
    PRIMARY KEY (store_id, date)
);

-- 4.3 returns
CREATE TABLE IF NOT EXISTS public.returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    processed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    reason text,
    refund_amount numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now()
);

-- 4.4 daily_sales
CREATE TABLE IF NOT EXISTS public.daily_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_date date NOT NULL,
    total_sales numeric(12,2) DEFAULT 0.00,
    cash_amount numeric(12,2) DEFAULT 0.00,
    bkash_amount numeric(12,2) DEFAULT 0.00,
    credit_amount numeric(12,2) DEFAULT 0.00,
    daily_expense numeric(12,2) DEFAULT 0.00,
    stock_purchase numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (store_id, sale_date)
);

-- 4.5 audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    operation text NOT NULL,
    primary_key jsonb NOT NULL,
    old_row jsonb,
    new_row jsonb,
    performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    performed_at timestamp with time zone DEFAULT now()
);

-- 4.6 inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    sku text,
    barcode text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) on newly created tables
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
