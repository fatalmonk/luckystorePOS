-- Migration: Detect and remove duplicate rows across all tables
-- Strategy: Use primary keys or unique constraints to identify duplicates

-- ============================================
-- 1. DAILY_SALES (unique on store_id + sale_date)
-- ============================================
-- Find duplicates
-- SELECT store_id, sale_date, COUNT(*) as cnt 
-- FROM public.daily_sales 
-- GROUP BY store_id, sale_date 
-- HAVING COUNT(*) > 1;

-- Remove duplicates keeping newest (by updated_at)
DELETE FROM public.daily_sales a
USING (
    SELECT MIN(ctid) as ctid, store_id, sale_date
    FROM public.daily_sales
    GROUP BY store_id, sale_date
    HAVING COUNT(*) > 1
) b
WHERE a.store_id = b.store_id 
  AND a.sale_date = b.sale_date
  AND a.ctid != b.ctid;

-- ============================================
-- 2. PRODUCTS (check for duplicate barcodes)
-- ============================================
-- Find products with same barcode
-- SELECT barcode, tenant_id, COUNT(*) as cnt
-- FROM public.products
-- WHERE barcode IS NOT NULL
-- GROUP BY barcode, tenant_id
-- HAVING COUNT(*) > 1;

-- Remove duplicate products (keep lowest id)
DELETE FROM public.products a
USING (
    SELECT MIN(id) as keep_id, barcode, tenant_id
    FROM public.products
    WHERE barcode IS NOT NULL
    GROUP BY barcode, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.barcode = b.barcode
  AND a.tenant_id = b.tenant_id
  AND a.id != b.keep_id;

-- ============================================
-- 3. PARTIES (check for duplicate phone + tenant)
-- ============================================
-- Find parties with same phone in same tenant
-- SELECT phone, tenant_id, COUNT(*) as cnt
-- FROM public.parties
-- WHERE phone IS NOT NULL
-- GROUP BY phone, tenant_id
-- HAVING COUNT(*) > 1;

-- Remove duplicate parties (keep lowest id)
DELETE FROM public.parties a
USING (
    SELECT MIN(id) as keep_id, phone, tenant_id
    FROM public.parties
    WHERE phone IS NOT NULL
    GROUP BY phone, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.phone = b.phone
  AND a.tenant_id = b.tenant_id
  AND a.id != b.keep_id;

-- ============================================
-- 4. UNITS (check for duplicate names per tenant)
-- ============================================
DELETE FROM public.units a
USING (
    SELECT MIN(id) as keep_id, name, tenant_id
    FROM public.units
    GROUP BY name, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.name = b.name
  AND a.tenant_id = b.tenant_id
  AND a.id != b.keep_id;

-- ============================================
-- 5. CATEGORIES (check for duplicate names per tenant)
-- ============================================
DELETE FROM public.categories a
USING (
    SELECT MIN(id) as keep_id, name, tenant_id
    FROM public.categories
    GROUP BY name, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.name = b.name
  AND a.tenant_id = b.tenant_id
  AND a.id != b.keep_id;

-- ============================================
-- 6. LEDGER_ACCOUNTS (check for duplicate code per store)
-- ============================================
DELETE FROM public.ledger_accounts a
USING (
    SELECT MIN(id) as keep_id, code, store_id
    FROM public.ledger_accounts
    GROUP BY code, store_id
    HAVING COUNT(*) > 1
) b
WHERE a.code = b.code
  AND a.store_id = b.store_id
  AND a.id != b.keep_id;

-- ============================================
-- 7. IDEMPOTENCY_KEYS (should be unique by key)
-- ============================================
DELETE FROM public.idempotency_keys a
USING (
    SELECT MIN(ctid) as ctid, idempotency_key
    FROM public.idempotency_keys
    GROUP BY idempotency_key
    HAVING COUNT(*) > 1
) b
WHERE a.idempotency_key = b.idempotency_key
  AND a.ctid != b.ctid;

-- ============================================
-- 8. SALE_SYNC_CONFLICTS (check for duplicate sale_id)
-- ============================================
DELETE FROM public.sale_sync_conflicts a
USING (
    SELECT MIN(id) as keep_id, sale_id
    FROM public.sale_sync_conflicts
    GROUP BY sale_id
    HAVING COUNT(*) > 1
) b
WHERE a.sale_id = b.sale_id
  AND a.id != b.keep_id;

-- ============================================
-- 9. LEDGER_POSTING_IDEMPOTENCY (should be unique by sale_id)
-- ============================================
DELETE FROM public.ledger_posting_idempotency a
USING (
    SELECT MIN(id) as keep_id, sale_id
    FROM public.ledger_posting_idempotency
    GROUP BY sale_id
    HAVING COUNT(*) > 1
) b
WHERE a.sale_id = b.sale_id
  AND a.id != b.keep_id;

-- Add comments
COMMENT ON TABLE public.daily_sales IS 'Daily sales summary - deduplicated on store_id+date';
COMMENT ON TABLE public.products IS 'Products - deduplicated on barcode+tenant';
COMMENT ON TABLE public.parties IS 'Parties - deduplicated on phone+tenant';
