-- Seed data for Supabase RPC Integration Tests
-- Focuses on Tenant Isolation, Stock Correctness, and Ledger Integrity

-- Clean up
TRUNCATE TABLE public.ledger_entries CASCADE;
TRUNCATE TABLE public.journal_batches CASCADE;
TRUNCATE TABLE public.stock_movements CASCADE;
TRUNCATE TABLE public.stock_levels CASCADE;
TRUNCATE TABLE public.inventory_items CASCADE;
TRUNCATE TABLE public.items CASCADE;
TRUNCATE TABLE public.accounts CASCADE;
TRUNCATE TABLE public.ledger_accounts CASCADE;
TRUNCATE TABLE public.payment_methods CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.stores CASCADE;
TRUNCATE TABLE public.tenants CASCADE;
TRUNCATE TABLE public.idempotency_keys CASCADE;

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

-- 4. Ledger Accounts (ledger-style)
INSERT INTO public.ledger_accounts (id, store_id, code, name, account_type, is_system) VALUES
('la000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '1000_CASH', 'Cash on Hand', 'ASSET', true),
('la000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '1010_BANK', 'Bank / Mobile', 'ASSET', true),
('lb000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '1000_CASH', 'Cash on Hand', 'ASSET', true);

-- 5. Payment Methods
-- Types: 'cash', 'mobile_banking', 'card', 'other'
INSERT INTO public.payment_methods (id, store_id, name, type) VALUES
('pm000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cash', 'cash'),
('pm000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bKash', 'mobile_banking'),
('pm000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Cash', 'cash');

-- 6. Items & Inventory Items
-- Items (legacy table)
INSERT INTO public.items (id, name, sku, barcode, price, cost, active) VALUES
('item0000-0000-0000-0000-000000000001', 'Alpha Product 1', 'SKU-A1', 'BAR-A1', 100.00, 70.00, true),
('item0000-0000-0000-0000-000000000002', 'Alpha Product 2', 'SKU-A2', 'BAR-A2', 200.00, 150.00, true),
('item0000-0000-0000-0000-000000000003', 'Beta Product 1', 'SKU-B1', 'BAR-B1', 50.00, 30.00, true);

-- Inventory Items (foundation table)
INSERT INTO public.inventory_items (id, tenant_id, name, sku, barcode) VALUES
('item0000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alpha Product 1', 'SKU-A1', 'BAR-A1'),
('item0000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Alpha Product 2', 'SKU-A2', 'BAR-A2'),
('item0000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Beta Product 1', 'SKU-B1', 'BAR-B1');

-- 7. Stock Levels
INSERT INTO public.stock_levels (store_id, item_id, qty) VALUES
('11111111-1111-1111-1111-111111111111', 'item0000-0000-0000-0000-000000000001', 50),
('11111111-1111-1111-1111-111111111111', 'item0000-0000-0000-0000-000000000002', 20),
('22222222-2222-2222-2222-222222222222', 'item0000-0000-0000-0000-000000000003', 100);

-- 8. Users
-- We need to link to auth.users if possible, but for integration tests we can insert dummy rows in public.users
-- Since public.users references auth.users(id), we might need to insert into auth.users first if we want proper foreign keys.
-- However, Supabase service_role can bypass some checks. 
-- For now, let's assume we insert into public.users and see if it works. 
-- If not, we'll need to mock auth.uid().

-- Dummy users (UUIDs should match what we use for auth.uid() in tests)
INSERT INTO public.users (id, tenant_id, store_id, name, role) VALUES
('u1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alpha Manager', 'manager'),
('u2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Beta Manager', 'manager');

-- Initial Stock Movements to set Weighted Average Cost
INSERT INTO public.stock_movements (tenant_id, store_id, item_id, quantity_change, weighted_average_cost, reference_type) VALUES
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'item0000-0000-0000-0000-000000000001', 50, 70.00, 'INITIAL'),
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'item0000-0000-0000-0000-000000000002', 20, 150.00, 'INITIAL'),
('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'item0000-0000-0000-0000-000000000003', 100, 30.00, 'INITIAL');
