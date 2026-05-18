-- Migration: Remove duplicate rows from items and parties tables
-- Uses actual schema (items, not products)

-- ============================================
-- 1. ITEMS (check for duplicate barcodes per tenant)
-- ============================================
-- Remove duplicate items (keep lowest id)
DELETE FROM public.items a
USING (
    SELECT MIN(id::text) as keep_id, barcode, tenant_id
    FROM public.items
    WHERE barcode IS NOT NULL AND barcode != ''
    GROUP BY barcode, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.barcode = b.barcode
  AND a.tenant_id = b.tenant_id
  AND a.id::text != b.keep_id;

-- ============================================
-- 2. PARTIES (check for duplicate phone + tenant)
-- ============================================
DELETE FROM public.parties a
USING (
    SELECT MIN(id::text) as keep_id, phone, tenant_id
    FROM public.parties
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.phone = b.phone
  AND a.tenant_id = b.tenant_id
  AND a.id::text != b.keep_id;

-- ============================================
-- 3. CATEGORIES (check for duplicate names per tenant)
-- ============================================
DELETE FROM public.categories a
USING (
    SELECT MIN(id::text) as keep_id, name, tenant_id
    FROM public.categories
    GROUP BY name, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.name = b.name
  AND a.tenant_id = b.tenant_id
  AND a.id::text != b.keep_id;

-- ============================================
-- 4. UNITS (if exists - check for duplicate names per tenant)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') THEN
        EXECUTE '
            DELETE FROM public.units a
            USING (
                SELECT MIN(id::text) as keep_id, name, tenant_id
                FROM public.units
                GROUP BY name, tenant_id
                HAVING COUNT(*) > 1
            ) b
            WHERE a.name = b.name
              AND a.tenant_id = b.tenant_id
              AND a.id::text != b.keep_id
        ';
    END IF;
END $$;

-- ============================================
-- 5. SUPPLIERS (check for duplicate phone per tenant)
-- ============================================
DELETE FROM public.suppliers a
USING (
    SELECT MIN(id::text) as keep_id, phone, tenant_id
    FROM public.suppliers
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone, tenant_id
    HAVING COUNT(*) > 1
) b
WHERE a.phone = b.phone
  AND a.tenant_id = b.tenant_id
  AND a.id::text != b.keep_id;

-- ============================================
-- 6. LEDGER_ACCOUNTS (check for duplicate code per store)
-- ============================================
DELETE FROM public.ledger_accounts a
USING (
    SELECT MIN(id::text) as keep_id, code, store_id
    FROM public.ledger_accounts
    GROUP BY code, store_id
    HAVING COUNT(*) > 1
) b
WHERE a.code = b.code
  AND a.store_id = b.store_id
  AND a.id::text != b.keep_id;

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
-- 8. SALE_SYNC_CONFLICTS (check for duplicate client_transaction_id per store)
-- ============================================
DELETE FROM public.sale_sync_conflicts a
USING (
    SELECT MIN(id::text) as keep_id, client_transaction_id, store_id, conflict_type
    FROM public.sale_sync_conflicts
    GROUP BY client_transaction_id, store_id, conflict_type
    HAVING COUNT(*) > 1
) b
WHERE a.client_transaction_id = b.client_transaction_id
  AND a.store_id = b.store_id
  AND a.conflict_type = b.conflict_type
  AND a.id::text != b.keep_id;

-- ============================================
-- 9. LEDGER_POSTING_IDEMPOTENCY (PK is sale_id, no id column; no dedupe needed — PK already enforces uniqueness)
-- ============================================
-- ledger_posting_idempotency has sale_id as PRIMARY KEY, so duplicates cannot exist.
-- No dedupe required.

-- Add comments
COMMENT ON TABLE public.items IS 'Products/items - deduplicated on barcode+tenant';
COMMENT ON TABLE public.parties IS 'Parties - deduplicated on phone+tenant';
