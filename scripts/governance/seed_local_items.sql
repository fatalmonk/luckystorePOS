-- =============================================================================
-- Script: Seed Local Items for Development
-- Purpose: Populates the local environment with sample data for UI verification.
-- =============================================================================

BEGIN;

-- 1) Create a Sample Category
INSERT INTO public.categories (id, name, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-0000000000c1', 'Beverages', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000c2', 'Snacks', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 2) Create Sample Items
INSERT INTO public.items (id, sku, barcode, short_code, name, price, cost, category_id, tenant_id, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000011', 'COKE-500', '1234567890123', 'C1', 'Coca Cola 500ml', 45.00, 38.00, '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000012', 'PEPSI-500', '1234567890124', 'P1', 'Pepsi 500ml', 45.00, 38.00, '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000013', 'LAYS-MAGIC', '1234567890125', 'L1', 'Lays Magic Masala', 25.00, 20.00, '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Create Initial Stock Levels
INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000011', 100, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000012', 5, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000013', 50, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (store_id, item_id) DO NOTHING;

-- 4) Create Thresholds
INSERT INTO public.stock_alert_thresholds (store_id, item_id, min_qty, reorder_qty, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000012', 10, 50, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (store_id, item_id) DO NOTHING;

COMMIT;
