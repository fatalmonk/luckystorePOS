# Invariant Fingerprint Registry

## 1. Ledger Integrity (SQL)
```sql
SELECT 1 FROM stock_levels s 
JOIN (SELECT product_id, store_id, SUM(quantity_delta) as sum_qty 
      FROM inventory_movements GROUP BY 1, 2) m 
ON s.item_id = m.product_id AND s.store_id = m.store_id
WHERE s.qty != m.sum_qty; -- FAIL IF ROWS RETURNED
```

## 2. Idempotency Guard (SQL)
```sql
SELECT operation_id, COUNT(*) FROM inventory_movements 
WHERE operation_id IS NOT NULL 
GROUP BY 1 HAVING COUNT(*) > 1; -- FAIL IF ROWS RETURNED
```

## 3. Reference Consistency (SQL)
```sql
SELECT 1 FROM inventory_movements 
WHERE reference_type = 'sale' 
AND NOT EXISTS (SELECT 1 FROM sales WHERE id = reference_id); -- FAIL IF ROWS RETURNED
```
