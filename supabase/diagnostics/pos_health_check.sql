-- =============================================================================
-- POS Health Check Diagnostic Script
-- Run this in Supabase SQL Editor before implementing any POS fixes
-- =============================================================================

-- 1. Verify items table has data
SELECT 'Items count' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM items WHERE active = true;

-- 2. Verify stock_levels table has data (replace <store_id> with actual store UUID)
SELECT 'Stock levels count' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM stock_levels WHERE store_id = '<store_id>';

-- 3. Detect NULL prices (critical - will crash POS)
SELECT 'NULL prices' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM items WHERE price IS NULL OR price <= 0;

-- 4. Detect negative stock (corruption)
SELECT 'Negative stock' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM stock_levels WHERE qty < 0;

-- 5. Detect duplicate SKUs (scanner ambiguity)
SELECT 'Duplicate SKUs' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM items WHERE sku IS NOT NULL
GROUP BY sku HAVING COUNT(*) > 1;

-- 6. Detect duplicate barcodes (scanner ambiguity)
SELECT 'Duplicate barcodes' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM items WHERE barcode IS NOT NULL
GROUP BY barcode HAVING COUNT(*) > 1;

-- 7. Detect items without stock_levels (invisible in POS)
SELECT 'Items without stock_levels' as check_name, COUNT(*) as result,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM items i
LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = '<store_id>'
WHERE i.active = true AND sl.id IS NULL;

-- 8. Verify record_sale RPC exists
SELECT 'record_sale RPC exists' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_sale')
            THEN 'PASS' ELSE 'FAIL' END as status;

-- 9. Verify search_items_pos RPC exists
SELECT 'search_items_pos RPC exists' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_items_pos')
            THEN 'PASS' ELSE 'FAIL' END as status;

-- 10. Verify get_pos_categories RPC exists
SELECT 'get_pos_categories RPC exists' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_pos_categories')
            THEN 'PASS' ELSE 'FAIL' END as status;

-- 11. Verify lookup_item_by_scan RPC exists
SELECT 'lookup_item_by_scan RPC exists' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lookup_item_by_scan')
            THEN 'PASS' ELSE 'FAIL' END as status;

-- 12. Verify get_inventory_list RPC exists
SELECT 'get_inventory_list RPC exists' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_inventory_list')
            THEN 'PASS' ELSE 'FAIL' END as status;

-- =============================================================================
-- Detailed Data Issues (if any FAIL above, run these to see details)
-- =============================================================================

-- Items with NULL or invalid prices
SELECT id, name, sku, price
FROM items
WHERE price IS NULL OR price <= 0
ORDER BY name;

-- Stock levels with negative quantities
SELECT sl.store_id, sl.item_id, i.name, sl.qty
FROM stock_levels sl
JOIN items i ON i.id = sl.item_id
WHERE sl.qty < 0
ORDER BY sl.qty;

-- Duplicate SKUs
SELECT sku, COUNT(*) as count, array_agg(name) as items
FROM items
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Duplicate barcodes
SELECT barcode, COUNT(*) as count, array_agg(name) as items
FROM items
WHERE barcode IS NOT NULL
GROUP BY barcode
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Items without stock_levels (replace <store_id>)
SELECT i.id, i.name, i.sku
FROM items i
LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = '<store_id>'
WHERE i.active = true AND sl.id IS NULL
ORDER BY i.name;

-- =============================================================================
-- Test RPC Responses (replace <store_id> with actual store UUID)
-- =============================================================================

-- Test get_inventory_list
-- SELECT * FROM get_inventory_list('<store_id>') LIMIT 5;

-- Test search_items_pos
-- SELECT * FROM search_items_pos('<store_id>', '', NULL, 10, 0);

-- Test get_pos_categories
-- SELECT * FROM get_pos_categories('<store_id>');

-- Test lookup_item_by_scan
-- SELECT * FROM lookup_item_by_scan('TEST_SKU', '<store_id>');
