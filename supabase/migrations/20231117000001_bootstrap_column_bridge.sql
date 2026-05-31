-- Pre-baseline bridge: add columns that the bootstrap migration doesn't create
-- but the baseline migration references in indexes, FKs, and RLS policies.
-- This runs BETWEEN the bootstrap and the baseline, ensuring all referenced
-- columns exist before the baseline tries to use them.

-- categories: bootstrap has (id, name, description, created_at, updated_at)
-- baseline expects: + category (text), store_id (uuid), tenant_id (uuid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'category') THEN
            ALTER TABLE public.categories ADD COLUMN category text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'store_id') THEN
            ALTER TABLE public.categories ADD COLUMN store_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.categories ADD COLUMN tenant_id uuid;
        END IF;
    END IF;
END $$;

-- items: bootstrap has (id, sku, name, description, price, cost, category_id, image_url, active, created_at, updated_at)
-- baseline expects: + barcode (text), short_code (text), brand (text), group_tag (text), mrp (numeric), tenant_id (uuid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'barcode') THEN
            ALTER TABLE public.items ADD COLUMN barcode text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'short_code') THEN
            ALTER TABLE public.items ADD COLUMN short_code text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'brand') THEN
            ALTER TABLE public.items ADD COLUMN brand text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'group_tag') THEN
            ALTER TABLE public.items ADD COLUMN group_tag text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'mrp') THEN
            ALTER TABLE public.items ADD COLUMN mrp numeric;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.items ADD COLUMN tenant_id uuid;
        END IF;
    END IF;
END $$;

-- sale_items: bootstrap has (id, sale_id, item_id, qty, unit_price, cost, discount, line_total, UNIQUE(sale_id, item_id))
-- baseline expects: + batch_id (uuid), price (numeric)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sale_items' AND column_name = 'batch_id') THEN
            ALTER TABLE public.sale_items ADD COLUMN batch_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sale_items' AND column_name = 'price') THEN
            ALTER TABLE public.sale_items ADD COLUMN price numeric(15,2);
        END IF;
    END IF;
END $$;

-- sales: bootstrap has (id, sale_number, receipt_number, store_id, cashier_id, status, subtotal, discount_amount, total_amount, amount_tendered, change_due, notes, created_at, updated_at)
-- baseline expects: + payment_method, payment_meta, session_id, voided_by, voided_at, void_reason, client_transaction_id, ledger_batch_id, fulfilled_subtotal, backordered_subtotal, accounting_posting_status, accounting_posting_error, accounting_posted_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'payment_method') THEN
            ALTER TABLE public.sales ADD COLUMN payment_method text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'payment_meta') THEN
            ALTER TABLE public.sales ADD COLUMN payment_meta jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'session_id') THEN
            ALTER TABLE public.sales ADD COLUMN session_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'voided_by') THEN
            ALTER TABLE public.sales ADD COLUMN voided_by uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'voided_at') THEN
            ALTER TABLE public.sales ADD COLUMN voided_at timestamp with time zone;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'void_reason') THEN
            ALTER TABLE public.sales ADD COLUMN void_reason text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'client_transaction_id') THEN
            ALTER TABLE public.sales ADD COLUMN client_transaction_id text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'ledger_batch_id') THEN
            ALTER TABLE public.sales ADD COLUMN ledger_batch_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'fulfilled_subtotal') THEN
            ALTER TABLE public.sales ADD COLUMN fulfilled_subtotal numeric(12,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'backordered_subtotal') THEN
            ALTER TABLE public.sales ADD COLUMN backordered_subtotal numeric(12,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'accounting_posting_status') THEN
            ALTER TABLE public.sales ADD COLUMN accounting_posting_status text NOT NULL DEFAULT 'PENDING_POSTING';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'accounting_posting_error') THEN
            ALTER TABLE public.sales ADD COLUMN accounting_posting_error text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'accounting_posted_at') THEN
            ALTER TABLE public.sales ADD COLUMN accounting_posted_at timestamp with time zone;
        END IF;
    END IF;
END $$;

-- stock_movements: bootstrap has (id, store_id, item_id, delta, reason, notes, meta, performed_by, created_at)
-- baseline expects: + batch_id, notes(text), tenant_id, quantity_change, weighted_average_cost, reference_type, reference_id, created_by
-- (notes exists in both, but type may differ)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'batch_id') THEN
            ALTER TABLE public.stock_movements ADD COLUMN batch_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.stock_movements ADD COLUMN tenant_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'quantity_change') THEN
            ALTER TABLE public.stock_movements ADD COLUMN quantity_change integer;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'weighted_average_cost') THEN
            ALTER TABLE public.stock_movements ADD COLUMN weighted_average_cost numeric(15,4);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'reference_type') THEN
            ALTER TABLE public.stock_movements ADD COLUMN reference_type text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'reference_id') THEN
            ALTER TABLE public.stock_movements ADD COLUMN reference_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'created_by') THEN
            ALTER TABLE public.stock_movements ADD COLUMN created_by uuid;
        END IF;
    END IF;
END $$;

-- stock_levels: bootstrap has (store_id, item_id, qty, reserved)
-- baseline expects: + tenant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_levels') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_levels' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.stock_levels ADD COLUMN tenant_id uuid;
        END IF;
    END IF;
END $$;

-- stores: bootstrap has (id, name, code, created_at)
-- baseline expects: + address, timezone, tenant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'address') THEN
            ALTER TABLE public.stores ADD COLUMN address text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'timezone') THEN
            ALTER TABLE public.stores ADD COLUMN timezone text DEFAULT 'Asia/Dhaka';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.stores ADD COLUMN tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
        END IF;
    END IF;
END $$;

-- users: bootstrap has (id, auth_id, store_id, name, full_name, email, role, last_login, created_at)
-- baseline expects: + pos_pin, pos_pin_hash, tenant_id, last_login_at
-- (bootstrap has "last_login" but baseline calls it "last_login_at")
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pos_pin') THEN
            ALTER TABLE public.users ADD COLUMN pos_pin text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pos_pin_hash') THEN
            ALTER TABLE public.users ADD COLUMN pos_pin_hash text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.users ADD COLUMN tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login_at') THEN
            ALTER TABLE public.users ADD COLUMN last_login_at timestamp with time zone;
        END IF;
    END IF;
END $$;
