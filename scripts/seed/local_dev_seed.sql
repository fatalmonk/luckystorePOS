-- LOCAL DEVELOPMENT SEED - Creates test admin user
-- Run this in Supabase Studio SQL Editor after local Supabase is running
-- Or: psql -h 127.0.0.1 -p 54322 -U postgres -f this_file.sql

-- =============================================================================
-- 1. Create Store (if not exists)
-- =============================================================================
INSERT INTO public.stores (id, name, code, address, tenant_id)
VALUES (
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  'Lucky Store (Local Dev)',
  'LUCKY001',
  'Dhaka, Bangladesh',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Create Demo Categories
-- =============================================================================
INSERT INTO public.categories (id, name, store_id) VALUES
  (gen_random_uuid(), 'Beverages', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'),
  (gen_random_uuid(), 'Snacks', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'),
  (gen_random_uuid(), 'Household', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'),
  (gen_random_uuid(), 'Electronics', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. Create Sample Products
-- =============================================================================
INSERT INTO public.items (id, name, sku, category_id, price, cost, is_active, store_id) 
SELECT 
  gen_random_uuid(),
  'Sample Product ' || i,
  'SKU' || LPAD(i::text, 4, '0'),
  (SELECT id FROM public.categories WHERE store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd' LIMIT 1),
  (10 + i)::numeric,
  (7 + i)::numeric,
  true,
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'
FROM generate_series(1, 10) i
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. Create Test Admin User in auth.users (via Supabase Auth API)
-- NOTE: This requires running via Supabase Edge Function or using 
-- supabase.auth.admin.createUser() from a script
-- =============================================================================

-- For local dev, you can create user via Supabase Studio:
-- Go to http://localhost:54323/project/default/auth/users
-- Click "New User"
-- Email: admin@luckystore.local
-- Password: LuckyStore1947!

-- Then run this to link the user:
-- (Replace 'AUTH-UID-FROM-DASHBOARD' with actual auth user ID)
/*
INSERT INTO public.users (id, auth_id, email, role, full_name, store_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AUTH-UID-FROM-DASHBOARD',
  'admin@luckystore.local',
  'admin',
  'Local Admin',
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;
*/

-- Alternative: Create via SQL directly for local development
-- This bypasses Supabase Auth (works in local dev mode only)
DO $$
DECLARE
  new_auth_id uuid := gen_random_uuid();
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Check if test user already exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@luckystore.local') THEN
    -- Insert into auth.users (local Supabase allows this)
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at, 
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      new_auth_id,
      'admin@luckystore.local',
      crypt('LuckyStore1947!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}'
    );
    
    -- Insert into public.users
    INSERT INTO public.users (id, auth_id, email, role, full_name, store_id)
    VALUES (
      new_user_id,
      new_auth_id,
      'admin@luckystore.local',
      'admin',
      'Local Test Admin',
      '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'
    );
    
    RAISE NOTICE 'Created test admin user: admin@luckystore.local / LuckyStore1947!';
  ELSE
    RAISE NOTICE 'Test admin user already exists';
  END IF;
END $$;

-- =============================================================================
-- 5. Create Test Manager and Cashier (optional)
-- =============================================================================
DO $$
DECLARE
  manager_auth_id uuid := gen_random_uuid();
  cashier_auth_id uuid := gen_random_uuid();
BEGIN
  -- Manager
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@luckystore.local') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (manager_auth_id, 'manager@luckystore.local', crypt('Manager123!', gen_salt('bf')), now(), now(), now());
    
    INSERT INTO public.users (id, auth_id, email, role, full_name, store_id)
    VALUES (gen_random_uuid(), manager_auth_id, 'manager@luckystore.local', 'manager', 'Local Manager', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd');
    
    RAISE NOTICE 'Created manager: manager@luckystore.local / Manager123!';
  END IF;
  
  -- Cashier
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cashier@luckystore.local') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (cashier_auth_id, 'cashier@luckystore.local', crypt('Cashier123!', gen_salt('bf')), now(), now(), now());
    
    INSERT INTO public.users (id, auth_id, email, role, full_name, store_id)
    VALUES (gen_random_uuid(), cashier_auth_id, 'cashier@luckystore.local', 'cashier', 'Local Cashier', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd');
    
    RAISE NOTICE 'Created cashier: cashier@luckystore.local / Cashier123!';
  END IF;
END $$;

-- =============================================================================
-- Summary
-- =============================================================================
SELECT 'Local seed complete. Test users:' as message;
SELECT 
  u.email,
  u.role,
  s.name as store,
  'Ready for login' as status
FROM public.users u
JOIN public.stores s ON s.id = u.store_id
WHERE u.email LIKE '%@luckystore.local';
