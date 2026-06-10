-- Seed data for Supabase RPC Integration Tests
-- Focuses on Tenant Isolation, Stock Correctness, and Ledger Integrity
-- 
-- Compatible with bootstrap+foundation schema:
--   public.items is the canonical inventory table (NO inventory_items).
--   public.users.auth_id mirrors users.id (NOT NULL, CHECK auth_id = id).

-- Clean up (order respects FK dependencies; use IF EXISTS for safety)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ledger_entries' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.ledger_entries CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'journal_batches' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.journal_batches CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stock_movements' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.stock_movements CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stock_levels' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.stock_levels CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'items' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.items CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'accounts' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.accounts CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ledger_accounts' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.ledger_accounts CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payment_methods' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.payment_methods CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.users CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stores' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.stores CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tenants' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.tenants CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'idempotency_keys' AND schemaname = 'public') THEN
    TRUNCATE TABLE public.idempotency_keys CASCADE;
  END IF;
END $$;

-- 1. Tenants
INSERT INTO public.tenants (id, name) VALUES
('00000000-0000-0000-0000-000000000001', 'Tenant Alpha'),
('00000000-0000-0000-0000-000000000002', 'Tenant Beta');

-- 2. Stores
INSERT INTO public.stores (id, tenant_id, name) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Store Alpha 1'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'Store Beta 1');

-- 3. Accounts (foundation-style)
INSERT INTO public.accounts (id, tenant_id, name, type) VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sales Revenue', 'revenue'),
('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Inventory Asset', 'asset'),
('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cost of Goods Sold', 'expense'),
('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Cash Account', 'asset'),

('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Sales Revenue', 'revenue'),
('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Inventory Asset', 'asset'),
('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Cost of Goods Sold', 'expense'),
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Cash Account', 'asset');

-- 4. Ledger Accounts (ledger-style, created by 20260423213000)
INSERT INTO public.ledger_accounts (id, store_id, code, name, account_type, is_system) VALUES
('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '1000_CASH', 'Cash on Hand', 'ASSET', true),
('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '1010_BANK', 'Bank / Mobile', 'ASSET', true),
('c0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '1000_CASH', 'Cash on Hand', 'ASSET', true);

-- 5. Payment Methods
-- Types: 'cash', 'mobile_banking', 'card', 'other'
INSERT INTO public.payment_methods (id, store_id, name, type) VALUES
('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cash', 'cash'),
('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bKash', 'mobile_banking'),
('d0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Cash', 'cash');

-- 6. Items (public.items is canonical — no inventory_items table)
INSERT INTO public.items (id, name, sku, barcode, price, cost, is_active) VALUES
('e0000000-0000-0000-0000-000000000001', 'Alpha Product 1', 'SKU-A1', 'BAR-A1', 100.00, 70.00, true),
('e0000000-0000-0000-0000-000000000002', 'Alpha Product 2', 'SKU-A2', 'BAR-A2', 200.00, 150.00, true),
('e0000000-0000-0000-0000-000000000003', 'Beta Product 1', 'SKU-B1', 'BAR-B1', 50.00, 30.00, true);

-- 7. Stock Levels
INSERT INTO public.stock_levels (store_id, item_id, qty) VALUES
('11111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000001', 50),
('11111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000002', 20),
('22222222-2222-2222-2222-222222222222', 'e0000000-0000-0000-0000-000000000003', 100);

-- 8. Users
-- public.users.id references auth.users(id) ON DELETE CASCADE.
-- public.users.auth_id must equal id (CHECK constraint).
-- For local tests we first insert into auth.users, then public.users.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
VALUES
('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alpha@test.local', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '{}', '{}'),
('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beta@test.local', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '{}', '{}');

INSERT INTO public.users (id, auth_id, tenant_id, store_id, name, role) VALUES
('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alpha Manager', 'manager'),
('f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Beta Manager', 'manager');

-- 9. Initial Stock Movements to set Weighted Average Cost
INSERT INTO public.stock_movements (store_id, item_id, quantity_change, weighted_average_cost, reference_type) VALUES
('11111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000001', 50, 70.00, 'INITIAL'),
('11111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000002', 20, 150.00, 'INITIAL'),
('22222222-2222-2222-2222-222222222222', 'e0000000-0000-0000-0000-000000000003', 100, 30.00, 'INITIAL');
