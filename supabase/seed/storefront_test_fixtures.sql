-- =============================================================================
-- Storefront Test Fixtures for Supabase Test Environment (grxxenvdhfwzafzyykgo)
-- Provides deterministic tenants, store, categories, products, and stock levels
-- required for customer storefront E2E testing.
-- =============================================================================

-- 0. Deterministic Cleanup of Mutable E2E Test State
DELETE FROM public.orders
WHERE store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

DELETE FROM public.idempotency_keys
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- 1. Ensure Tenant
INSERT INTO public.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Lucky Store Test Tenant')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Ensure Store (Matches STORE_ID = 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd)
INSERT INTO public.stores (id, tenant_id, name, code)
VALUES (
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  '00000000-0000-0000-0000-000000000001',
  'Lucky Store Chattogram Main',
  'STORE-MAIN'
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  name = EXCLUDED.name,
  code = EXCLUDED.code;

-- 3. Deterministic Categories for Navigation & Filtering
INSERT INTO public.categories (id, store_id, tenant_id, name, category, slug, emoji, active, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Rice & Grains', 'Rice & Grains', 'rice-and-grain', '🍚', true, 1),
  ('c0000000-0000-0000-0000-000000000002', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Dairy & Eggs', 'Dairy & Eggs', 'dairy-and-eggs', '🥛', true, 2),
  ('c0000000-0000-0000-0000-000000000003', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Snacks', 'Snacks', 'snacks', '🍿', true, 3),
  ('c0000000-0000-0000-0000-000000000004', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Cleaning Supplies', 'Cleaning Supplies', 'cleaning-supplies', '🧼', true, 4),
  ('c0000000-0000-0000-0000-000000000005', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Cooking Essentials', 'Cooking Essentials', 'cooking-essentials', '🌾', true, 5),
  ('c0000000-0000-0000-0000-000000000006', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Beverages', 'Beverages', 'beverages', '🧃', true, 6),
  ('c0000000-0000-0000-0000-000000000007', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Personal Care', 'Personal Care', 'personal-care', '🧺', true, 7)
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  emoji = EXCLUDED.emoji,
  active = EXCLUDED.active,
  display_order = EXCLUDED.display_order;

-- 4. Deterministic Products (items)
INSERT INTO public.items (
  id, tenant_id, name, brand, price, mrp, cost, category_id, sku, barcode, is_active, image_url, description
)
VALUES
  (
    'a0740000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Miniket Rice Premium',
    'Lucky Store',
    85.00,
    95.00,
    70.00,
    'c0000000-0000-0000-0000-000000000001',
    'RICE-MIN-01',
    NULL,
    true,
    '/banners/promo_welcome_v2_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Aarong Dairy Pure Liquid Milk',
    'Aarong Dairy',
    90.00,
    90.00,
    75.00,
    'c0000000-0000-0000-0000-000000000002',
    'MILK-AAR-01',
    NULL,
    true,
    '/banners/promo_dairy_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Fresh Farm Eggs Layer (12 pcs)',
    'Lucky Store',
    145.00,
    155.00,
    120.00,
    'c0000000-0000-0000-0000-000000000002',
    'EGG-LAY-12',
    NULL,
    true,
    '/banners/promo_dairy_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Bombay Sweets Potato Crackers',
    'Bombay Sweets',
    25.00,
    25.00,
    18.00,
    'c0000000-0000-0000-0000-000000000003',
    'SNK-POT-01',
    NULL,
    true,
    '/banners/promo_snacks_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'Vim Dishwashing Liquid 500ml',
    'Vim',
    130.00,
    140.00,
    100.00,
    'c0000000-0000-0000-0000-000000000004',
    'CLN-VIM-01',
    NULL,
    true,
    '/banners/promo_cleaning_supply_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'Pran Mustard Oil 500ml',
    'Pran',
    180.00,
    195.00,
    150.00,
    'c0000000-0000-0000-0000-000000000005',
    'OIL-PRAN-500',
    NULL,
    true,
    '/banners/promo_cooking_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000099',
    '00000000-0000-0000-0000-000000000001',
    'Auth test rice',
    'Lucky Store',
    100.00,
    100.00,
    80.00,
    'c0000000-0000-0000-0000-000000000001',
    'AUTH-TEST-01',
    NULL,
    true,
    '/banners/promo_welcome_v2_400.webp',
    'Deterministic storefront E2E fixture.'
  ),
  (
    'a0740000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'Radhuni Turmeric Powder 200g',
    'Radhuni',
    95.00,
    95.00,
    75.00,
    'c0000000-0000-0000-0000-000000000005',
    'RAD-TUR-200',
    NULL,
    true,
    '/banners/promo_cooking_400.webp',
    'Deterministic storefront E2E fixture.'
  )
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  price = EXCLUDED.price,
  mrp = EXCLUDED.mrp,
  cost = EXCLUDED.cost,
  category_id = EXCLUDED.category_id,
  sku = EXCLUDED.sku,
  barcode = EXCLUDED.barcode,
  is_active = EXCLUDED.is_active,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description;

-- 5. Stock Levels for Store 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd
INSERT INTO public.stock_levels (store_id, item_id, qty)
VALUES
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000001', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000002', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000003', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000004', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000005', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000006', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000099', 50),
  ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0740000-0000-0000-0000-000000000007', 0) -- out of stock item
ON CONFLICT (store_id, item_id) DO UPDATE SET
  qty = EXCLUDED.qty;
