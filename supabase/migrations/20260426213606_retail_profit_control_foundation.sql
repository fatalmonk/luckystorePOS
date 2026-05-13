-- Phase 1: Database Schema Foundation for Retail Profit Control System
-- Priority sequence as defined in Execution Spec v1

-- 1. tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. stores
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    name TEXT,
    role TEXT NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. parties
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'employee')),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. journal_batches
CREATE TABLE IF NOT EXISTS journal_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ledger_entries
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

-- 8. inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    quantity_change NUMERIC(15, 4) NOT NULL,
    weighted_average_cost NUMERIC(15, 4) NOT NULL DEFAULT 0,
    reference_type TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 10. idempotency_keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_body JSONB
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- For Month 1 speed, we will allow authenticated users full access to their tenant's data.
-- A helper function to get the current tenant_id (assuming it's set in the JWT or a session variable)
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  -- In a real app, extract from auth.jwt()
  -- For local dev/testing without full auth, we can mock or rely on service_role.
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
