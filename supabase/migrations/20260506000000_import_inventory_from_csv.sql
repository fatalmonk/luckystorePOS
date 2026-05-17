-- =============================================================================
-- Inventory Import from CSV: Lucky Store Inventory with images
-- =============================================================================
-- This is a manual import template — no-op during migration.
-- To use it:
--   1. Create temp table: CREATE TEMP TABLE temp_inventory_import (...)
--   2. Load CSV data via Supabase dashboard or psql
--   3. Uncomment and run the sections below
--   4. Clean up: DROP TABLE IF EXISTS temp_inventory_import;
-- =============================================================================
-- Import function that reads from a temp table
-- Run this after loading CSV data via Supabase dashboard or psql
-- =============================================================================

-- Structural sanitation: Ensure table structure is correct for import
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS brand text;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_sku_key') THEN ALTER TABLE public.items ADD CONSTRAINT items_sku_key UNIQUE (sku); END IF; END $$;
ALTER TABLE public.stock_levels ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

-- Create temp table matching CSV structure
CREATE TEMP TABLE IF NOT EXISTS temp_inventory_import (
  "Item Code" text,
  "Item Name" text,
  "Category" text,
  "Description" text,
  "Brand" text,
  "Sales Price" text,
  "Purchase Price" text,
  "Opening Stock" text,
  "Low Stock" text,
  "Image URL" text
);

-- Note: In a real migration, we would COPY from CSV here.
-- For local dev replay, this might be empty unless seeded.

-- First, ensure categories exist
INSERT INTO public.categories (id, name, description, created_at, updated_at)
SELECT DISTINCT ON ("Category")
  uuid_generate_v4(),
  "Category",
  "Category" || ' products',
  NOW(),
  NOW()
FROM temp_inventory_import
WHERE "Category" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.name = temp_inventory_import."Category"
  );

-- Insert items with their categories
INSERT INTO public.items (
  id,
  sku,
  name,
  description,
  brand,
  category_id,
  price,
  cost,
  image_url,
  short_code,
  barcode,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),                              -- id
  "Item Code",                                      -- sku (unique identifier)
  "Item Name",                                      -- name
  COALESCE(NULLIF("Description", ''), "Item Name"), -- description
  "Brand",                                            -- brand
  c.id,                                             -- category_id
  "Sales Price"::numeric,                          -- price
  "Purchase Price"::numeric,                       -- cost
  "Image URL",                                      -- image_url
  LEFT("Item Code", 8),                            -- short_code (first 8 chars)
  "Item Code",                                      -- barcode (same as sku)
  true,                                             -- is_active
  NOW(),                                           -- created_at
  NOW()                                            -- updated_at
FROM temp_inventory_import t
LEFT JOIN public.categories c ON c.name = t."Category"
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  brand = EXCLUDED.brand,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  image_url = EXCLUDED.image_url,
  short_code = EXCLUDED.short_code,
  barcode = EXCLUDED.barcode,
  updated_at = NOW();

-- Insert stock levels for the store
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
  COALESCE("Opening Stock"::integer, 0),
  COALESCE("Low Stock"::integer, 5),
  NOW(),
  NOW()
FROM temp_inventory_import t
JOIN public.items i ON i.sku = t."Item Code"
ON CONFLICT (item_id, store_id) DO UPDATE SET
  qty = EXCLUDED.qty,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = NOW();

-- Clean up temp table
DROP TABLE IF EXISTS temp_inventory_import;

-- Verify import
SELECT
  'Categories created:' as info,
  COUNT(*) as count
FROM public.categories
UNION ALL
SELECT
  'Items created:' as info,
  COUNT(*) as count
FROM public.items
UNION ALL
SELECT
  'Stock levels created:' as info,
  COUNT(*) as count
FROM public.stock_levels
WHERE store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
