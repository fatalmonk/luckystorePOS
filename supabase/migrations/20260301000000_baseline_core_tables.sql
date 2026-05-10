-- Baseline migration: Core tables that existed before tracked migrations
-- This captures the initial schema state to enable proper migration ordering

-- Core tenant and user tables
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan text DEFAULT 'free',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    auth_id uuid UNIQUE,
    name text NOT NULL,
    email text,
    role text DEFAULT 'staff',
    pin text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    sku text,
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL DEFAULT 0,
    cost numeric(12,2) DEFAULT 0,
    unit text DEFAULT 'piece',
    barcode text,
    is_active boolean DEFAULT true,
    has_variants boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    name text NOT NULL,
    phone text,
    address text,
    type text DEFAULT 'customer',
    balance numeric(12,2) DEFAULT 0,
    credit_limit numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    receipt_number text NOT NULL,
    party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
    cashier_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    discount_total numeric(12,2) DEFAULT 0,
    tax_total numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL DEFAULT 0,
    payment_method text DEFAULT 'cash',
    status text DEFAULT 'completed',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
    qty integer NOT NULL DEFAULT 1,
    price numeric(12,2) NOT NULL DEFAULT 0,
    cost numeric(12,2) DEFAULT 0,
    discount numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    method text NOT NULL,
    reference text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on core tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- Stock tables
CREATE TABLE IF NOT EXISTS public.stock_levels (
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer NULL DEFAULT 0,
    reserved integer NULL DEFAULT 0,
    CONSTRAINT stock_levels_pkey PRIMARY KEY (store_id, item_id),
    CONSTRAINT stock_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE,
    CONSTRAINT stock_levels_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
    batch_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    meta jsonb,
    performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    notes text,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    quantity_change integer,
    weighted_average_cost numeric(15,4),
    reference_type text,
    reference_id uuid,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.stock_alert_thresholds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    min_qty integer NOT NULL DEFAULT 0,
    max_qty integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT stock_alert_thresholds_store_item_unique UNIQUE (store_id, item_id)
);

-- Batches for inventory
CREATE TABLE IF NOT EXISTS public.batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    batch_number text NOT NULL,
    qty integer NOT NULL DEFAULT 0,
    expires_at date,
    manufactured_at date,
    notes text,
    po_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    po_number text NOT NULL,
    status text DEFAULT 'draft',
    total_amount numeric(12,2) DEFAULT 0,
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    qty_ordered integer NOT NULL DEFAULT 0,
    qty_received integer DEFAULT 0,
    unit_price numeric(12,2) NOT NULL DEFAULT 0,
    total_price numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Stock transfers
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    from_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    to_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    status text DEFAULT 'pending',
    notes text,
    initiated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    qty integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0,
    description text,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Competitor prices
CREATE TABLE IF NOT EXISTS public.competitor_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    competitor_name text NOT NULL,
    price numeric(12,2) NOT NULL DEFAULT 0,
    source text,
    recorded_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on additional tables
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_tenant ON public.stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant ON public.items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.items(barcode);
CREATE INDEX IF NOT EXISTS idx_parties_tenant ON public.parties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_store_item ON public.stock_levels(store_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store ON public.stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_store_item ON public.batches(store_id, item_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store ON public.expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
