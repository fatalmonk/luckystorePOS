-- =============================================================================
-- Inventory Import from LS InventoryApr10th.csv
-- Store ID: 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd
-- Products: ~480 items with MRP support
-- =============================================================================

-- Step 1: Create temp table matching CSV structure
DROP TABLE IF EXISTS temp_inventory_apr10th;

CREATE TEMP TABLE temp_inventory_apr10th (
  sl integer,
  sku text,
  barcode text,
  item_name text,
  category text,
  description text,
  cost numeric,
  mrp numeric,
  competitor_price text,
  ls_price numeric,
  initial_stock_qty integer,
  tax_paid text,
  discount text,
  total_cost text,
  total_price text,
  total_profit text,
  profit_percent text,
  batch_code text,
  supplier text,
  expiry_date date,
  image_url text,
  price_url text,
  xpath text
);

-- Note: After creating this table, load the CSV via:
-- COPY temp_inventory_apr10th FROM '/path/to/LS InventoryApr10th.csv' WITH (FORMAT csv, HEADER true);
-- OR use Supabase dashboard Table Editor to import

-- Step 2: Insert categories
INSERT INTO public.categories (id, name, description, created_at, updated_at)
SELECT DISTINCT
  uuid_generate_v4(),
  COALESCE(NULLIF(trim(category), ''), 'Uncategorized'),
  COALESCE(NULLIF(trim(category), ''), 'Uncategorized') || ' products',
  NOW(),
  NOW()
FROM temp_inventory_apr10th
WHERE trim(category) IS NOT NULL
  AND trim(category) != ''
ON CONFLICT (name) DO NOTHING;

-- Step 3: Insert items with MRP
INSERT INTO public.items (
  id,
  sku,
  name,
  description,
  brand,
  category_id,
  price,           -- LS Price (sale price)
  mrp,             -- MRP for strikethrough
  cost,            -- Purchase cost
  image_url,
  barcode,
  supplier,
  batch_code,
  expiry_date,
  active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  COALESCE(NULLIF(trim(sku), ''), 'SKU-' || sl::text),  -- Generate SKU if empty
  item_name,
  COALESCE(NULLIF(trim(description), ''), item_name),
  NULL,  -- Brand not in this CSV
  c.id,
  COALESCE(ls_price, mrp, 0),  -- Sale price (fallback to MRP)
  COALESCE(mrp, ls_price, 0),  -- MRP (fallback to sale price)
  COALESCE(cost, 0),           -- Cost
  NULLIF(trim(image_url), ''),
  NULLIF(trim(barcode), ''),
  NULLIF(trim(supplier), ''),
  NULLIF(trim(batch_code), ''),
  expiry_date,
  true,
  NOW(),
  NOW()
FROM temp_inventory_apr10th t
LEFT JOIN public.categories c ON c.name = COALESCE(NULLIF(trim(t.category), ''), 'Uncategorized')
WHERE trim(item_name) IS NOT NULL
  AND trim(item_name) != ''
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  mrp = EXCLUDED.mrp,
  cost = EXCLUDED.cost,
  image_url = EXCLUDED.image_url,
  barcode = EXCLUDED.barcode,
  supplier = EXCLUDED.supplier,
  batch_code = EXCLUDED.batch_code,
  expiry_date = EXCLUDED.expiry_date,
  updated_at = NOW();

-- Step 4: Insert stock levels
INSERT INTO public.stock_levels (
  id,
  item_id,
  store_id,
  qty,
  low_stock_threshold,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  i.id,
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,  -- Your store ID
  COALESCE(initial_stock_qty, 0),
  5,  -- Default low stock threshold
  NOW(),
  NOW()
FROM temp_inventory_apr10th t
JOIN public.items i ON i.sku = COALESCE(NULLIF(trim(t.sku), ''), 'SKU-' || t.sl::text)
ON CONFLICT (item_id, store_id) DO UPDATE SET
  qty = EXCLUDED.qty,
  updated_at = NOW();

-- Step 5: Verify import
SELECT
  'Categories' as metric,
  COUNT(*)::text as count
FROM public.categories
UNION ALL
SELECT
  'Items with MRP' as metric,
  COUNT(*)::text
FROM public.items
WHERE mrp > 0
UNION ALL
SELECT
  'Stock levels for store' as metric,
  COUNT(*)::text
FROM public.stock_levels
WHERE store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

-- Clean up (optional - keep for debugging)
-- DROP TABLE IF EXISTS temp_inventory_apr10th;
