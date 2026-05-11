-- =============================================================================
-- Seed Stock Levels for All Active Items
-- Run this if stock_levels table is empty for a store
-- =============================================================================

-- Replace <store_id> with your actual store UUID
-- This migration initializes all active items with qty = 0

DO $$
BEGIN
  IF '<store_id>' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    INSERT INTO stock_levels (store_id, item_id, qty)
    SELECT
      '<store_id>'::uuid as store_id,
      i.id as item_id,
      0 as qty
    FROM items i
    WHERE i.is_active = true
    ON CONFLICT (store_id, item_id) DO NOTHING;
  END IF;
END $$;

-- Verify the seed
SELECT
  COUNT(*) as total_stock_levels,
  COUNT(CASE WHEN qty = 0 THEN 1 END) as items_with_zero_stock,
  COUNT(CASE WHEN qty > 0 THEN 1 END) as items_with_stock
FROM stock_levels
WHERE '<store_id>' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND store_id = '<store_id>'::uuid;
