-- =============================================================================
-- Inventory Import from LS InventoryApr10th.csv
-- Store ID: 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd
-- Products: ~480 items with MRP support
-- =============================================================================
-- This is a manual import template — no-op during migration.
-- To use: uncomment and run manually after loading CSV data.
-- =============================================================================
DO $$ BEGIN /* no-op: manual CSV import template */ END; $$;

-- Structural sanitation: Ensure table structure is correct for import
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key') THEN ALTER TABLE public.categories ADD CONSTRAINT categories_name_key UNIQUE (name); END IF; END $$;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT 0;

-- Step 1: Create temp table matching CSV structure
DROP TABLE IF EXISTS temp_inventory_apr10th;
CREATE TEMP TABLE temp_inventory_apr10th (
  sl integer,
  item_code text,
  item_name text,
  category text,
  description text,
  brand text,
  sales_price text,
  purchase_price text,
  mrp text,
  opening_stock text,
  low_stock text
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

-- Step 3: Insert items
INSERT INTO public.items (
  id,
  sku,
  name,
  description,
  brand,
  category_id,
  price,
  cost,
  mrp,
  short_code,
  barcode,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  item_code,
  item_name,
  COALESCE(NULLIF(t.description, ''), item_name),
  brand,
  c.id,
  COALESCE(sales_price::numeric, 0),
  COALESCE(purchase_price::numeric, 0),
  COALESCE(mrp::numeric, 0),
  LEFT(item_code, 8),
  item_code,
  true,
  NOW(),
  NOW()
FROM temp_inventory_apr10th t
LEFT JOIN public.categories c ON c.name = trim(t.category)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  mrp = EXCLUDED.mrp,
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
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
  COALESCE(opening_stock::integer, 0),
  COALESCE(low_stock::integer, 5),
  NOW(),
  NOW()
FROM temp_inventory_apr10th t
JOIN public.items i ON i.sku = t.item_code
ON CONFLICT (item_id, store_id) DO UPDATE SET
  qty = EXCLUDED.qty,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = NOW();

-- Summary query
SELECT
  'Stock levels for store' as metric,
  COUNT(*)::text
FROM public.stock_levels
WHERE store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

-- Clean up (optional - keep for debugging)
-- DROP TABLE IF EXISTS temp_inventory_apr10th;
*/
