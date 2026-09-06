-- Migration: 20260906192000_pr0c_relational_rls_tenant_isolation.sql
-- Description: PR 0C - Multi-Tenant Relational RLS Isolation.
--              Enforces tenant and store boundary traversal across:
--              1. ledger_entries (via batch_id -> ledger_batches -> stores)
--              2. ledger_batches (via store_id -> stores)
--              3. ledger_accounts (via store_id -> stores)
--              4. sales (via store_id -> stores)
--              5. sale_items & sale_payments (via sale_id -> sales -> stores)

-- ============================================================================
-- 1. LEDGER ACCOUNTS RLS
-- ============================================================================
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS la_select ON public.ledger_accounts;
CREATE POLICY la_select ON public.ledger_accounts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE s.id = ledger_accounts.store_id
      AND u.tenant_id = s.tenant_id
      AND (
        u.role IN ('admin', 'manager')
        OR u.store_id = ledger_accounts.store_id
      )
  )
);

-- ============================================================================
-- 2. LEDGER BATCHES RLS
-- ============================================================================
ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lb_select ON public.ledger_batches;
CREATE POLICY lb_select ON public.ledger_batches
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE s.id = ledger_batches.store_id
      AND u.tenant_id = s.tenant_id
      AND (
        u.role IN ('admin', 'manager')
        OR u.store_id = ledger_batches.store_id
      )
  )
);

-- Clean up any residual direct insert policies (mutations must use RPCs)
DROP POLICY IF EXISTS lb_insert ON public.ledger_batches;

-- ============================================================================
-- 3. LEDGER ENTRIES RLS (Relational Traversal through ledger_batches)
-- ============================================================================
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS le_select ON public.ledger_entries;
CREATE POLICY le_select ON public.ledger_entries
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ledger_batches lb
    JOIN public.stores s ON s.id = lb.store_id
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE lb.id = ledger_entries.batch_id
      AND u.tenant_id = s.tenant_id
      AND (
        u.role IN ('admin', 'manager')
        OR u.store_id = lb.store_id
      )
  )
);

-- Clean up residual direct insert policies
DROP POLICY IF EXISTS "le_insert_tenant" ON public.ledger_entries;

-- ============================================================================
-- 4. SALES RLS (Tenant and Store Boundary Scoping)
-- ============================================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select_own" ON public.sales;
DROP POLICY IF EXISTS "sales_select_manager" ON public.sales;

-- Cashiers can view their own sales within their assigned store and tenant
CREATE POLICY "sales_select_cashier" ON public.sales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE s.id = sales.store_id
      AND u.tenant_id = s.tenant_id
      AND u.id = sales.cashier_id
      AND u.store_id = sales.store_id
  )
);

-- Managers/Admins can view sales strictly within their tenant's stores
CREATE POLICY "sales_select_manager" ON public.sales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE s.id = sales.store_id
      AND u.tenant_id = s.tenant_id
      AND u.role IN ('admin', 'manager')
  )
);

-- ============================================================================
-- 5. SALE ITEMS & PAYMENTS RLS
-- ============================================================================
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "si_select" ON public.sale_items;
CREATE POLICY "si_select" ON public.sale_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.stores st ON st.id = s.store_id
    JOIN public.users u ON u.auth_id = auth.uid()
    WHERE s.id = sale_items.sale_id
      AND u.tenant_id = st.tenant_id
      AND (
        u.role IN ('admin', 'manager')
        OR (u.id = s.cashier_id AND u.store_id = s.store_id)
      )
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sale_payments'
  ) THEN
    ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sp_select" ON public.sale_payments;
    CREATE POLICY "sp_select" ON public.sale_payments
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.sales s
        JOIN public.stores st ON st.id = s.store_id
        JOIN public.users u ON u.auth_id = auth.uid()
        WHERE s.id = sale_payments.sale_id
          AND u.tenant_id = st.tenant_id
          AND (
            u.role IN ('admin', 'manager')
            OR (u.id = s.cashier_id AND u.store_id = s.store_id)
          )
      )
    );
  END IF;
END $$;
