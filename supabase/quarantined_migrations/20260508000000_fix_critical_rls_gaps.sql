-- =============================================================================
-- Migration: Fix Critical RLS Security Gaps
-- Date: 2026-05-08
-- Issue: Multiple tables have RLS policies with USING (true) allowing any
--         authenticated user to access ALL data across all tenants
-- Impact: CRITICAL - Multi-tenant isolation broken
-- =============================================================================

-- =============================================================================
-- PREREQUISITES: Ensure helper functions exist
-- =============================================================================

-- These should already exist from migration 20260505000000_tenant_isolation_rls.sql
-- but we'll ensure they're available

CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT store_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- =============================================================================
-- 1) CATEGORIES - Product categories
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_select_tenant_isolated" ON public.categories;

-- Create secure SELECT policy
CREATE POLICY "categories_select_tenant_isolated"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    -- User can see categories from their store
    store_id = public.get_current_user_store_id()
    OR
    -- Admins/managers can see categories from their tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
        AND EXISTS (
          SELECT 1 FROM public.categories c
          WHERE c.store_id = u.store_id
        )
    )
  );

-- Verify and create INSERT policy if missing
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_tenant_scoped" ON public.categories;

CREATE POLICY "categories_insert_tenant_scoped"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.store_id = store_id
    )
  );

-- Verify and create UPDATE policy if missing
DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_update_tenant_scoped" ON public.categories;

CREATE POLICY "categories_update_tenant_scoped"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.store_id = store_id
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.store_id = store_id
    )
  );

-- Verify and create DELETE policy if missing
DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_tenant_scoped" ON public.categories;

CREATE POLICY "categories_delete_tenant_scoped"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.store_id = store_id
    )
  );

-- =============================================================================
-- 2) ITEMS - Products/Inventory items
-- =============================================================================
-- CRITICAL: items table lacks tenant_id column (design flaw)
-- We must add tenant_id for proper multi-tenant isolation

-- Add tenant_id column to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Populate tenant_id from categories (items belong to same tenant as their category)
UPDATE public.items i
SET tenant_id = c.tenant_id
FROM public.categories c
WHERE i.category_id = c.id
  AND i.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

-- For items without category or category without tenant, assign based on user context
DO $$
BEGIN
  IF public.get_current_user_tenant_id() IS NOT NULL THEN
    UPDATE public.items
    SET tenant_id = public.get_current_user_tenant_id()
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Drop vulnerable policies
DROP POLICY IF EXISTS "Allow read to authenticated" ON public.items;
DROP POLICY IF EXISTS "items_select_tenant_isolated" ON public.items;

-- Create secure SELECT policy
CREATE POLICY "items_select_tenant_isolated"
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    -- User can see items from their tenant
    tenant_id = public.get_current_user_tenant_id()
    OR
    -- Admins/managers can see items from their tenant
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify existing write policies
DROP POLICY IF EXISTS "Admins manage items" ON public.items;
DROP POLICY IF EXISTS "items_manage_authorized" ON public.items;

CREATE POLICY "items_manage_authorized"
  ON public.items
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 3) DISCOUNTS - Discount configurations
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "disc_select" ON public.discounts;
DROP POLICY IF EXISTS "discounts_select_tenant_isolated" ON public.discounts;

-- Create secure SELECT policy
CREATE POLICY "discounts_select_tenant_isolated"
  ON public.discounts
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "disc_write" ON public.discounts;
DROP POLICY IF EXISTS "discounts_write_authorized" ON public.discounts;

CREATE POLICY "discounts_write_authorized"
  ON public.discounts
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 4) ITEM_BATCHES - Batch tracking
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "item_batches_select" ON public.item_batches;
DROP POLICY IF EXISTS "item_batches_select_tenant_isolated" ON public.item_batches;

-- Create secure SELECT policy
CREATE POLICY "item_batches_select_tenant_isolated"
  ON public.item_batches
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "item_batches_write" ON public.item_batches;
DROP POLICY IF EXISTS "item_batches_write_authorized" ON public.item_batches;

CREATE POLICY "item_batches_write_authorized"
  ON public.item_batches
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 5) PAYMENT_METHODS - Payment configurations
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "pm_select" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_select_tenant_isolated" ON public.payment_methods;

-- Create secure SELECT policy
CREATE POLICY "payment_methods_select_tenant_isolated"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "pm_write" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_write_authorized" ON public.payment_methods;

CREATE POLICY "payment_methods_write_authorized"
  ON public.payment_methods
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 6) PURCHASE_ORDERS - Purchase orders
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "purchase_orders_select" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_select_tenant_isolated" ON public.purchase_orders;

-- Create secure SELECT policy
CREATE POLICY "purchase_orders_select_tenant_isolated"
  ON public.purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "purchase_orders_write" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_write_authorized" ON public.purchase_orders;

CREATE POLICY "purchase_orders_write_authorized"
  ON public.purchase_orders
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 7) PURCHASE_ORDER_ITEMS - PO line items
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "po_items_select" ON public.purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_select_tenant_isolated" ON public.purchase_order_items;

-- Create secure SELECT policy
CREATE POLICY "purchase_order_items_select_tenant_isolated"
  ON public.purchase_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          po.store_id = public.get_current_user_store_id()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.auth_id = (SELECT auth.uid())
              AND u.role IN ('admin', 'manager', 'advisor')
              AND u.tenant_id = public.get_current_user_tenant_id()
          )
        )
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "po_items_write" ON public.purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_write_authorized" ON public.purchase_order_items;

CREATE POLICY "purchase_order_items_write_authorized"
  ON public.purchase_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND po.store_id = public.get_current_user_store_id()
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND po.store_id = public.get_current_user_store_id()
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor')
        )
    )
  );

-- =============================================================================
-- 8) RECEIPT_CONFIG - Receipt settings
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "rc_select" ON public.receipt_config;
DROP POLICY IF EXISTS "receipt_config_select_tenant_isolated" ON public.receipt_config;

-- Create secure SELECT policy
CREATE POLICY "receipt_config_select_tenant_isolated"
  ON public.receipt_config
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "rc_write" ON public.receipt_config;
DROP POLICY IF EXISTS "receipt_config_write_authorized" ON public.receipt_config;

CREATE POLICY "receipt_config_write_authorized"
  ON public.receipt_config
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- 9) STOCK_ALERT_THRESHOLDS - Stock alerts
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "stock_alert_thresholds_read_all" ON public.stock_alert_thresholds;
DROP POLICY IF EXISTS "stock_alert_thresholds_select_tenant_isolated" ON public.stock_alert_thresholds;

-- Create secure SELECT policy
CREATE POLICY "stock_alert_thresholds_select_tenant_isolated"
  ON public.stock_alert_thresholds
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "stock_alert_thresholds_write_staff" ON public.stock_alert_thresholds;
DROP POLICY IF EXISTS "stock_alert_thresholds_write_authorized" ON public.stock_alert_thresholds;

CREATE POLICY "stock_alert_thresholds_write_authorized"
  ON public.stock_alert_thresholds
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  );

-- =============================================================================
-- 10) STOCK_LEVELS - Current inventory
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "Authenticated users can read stock levels" ON public.stock_levels;
DROP POLICY IF EXISTS "stock_levels_select_tenant_isolated" ON public.stock_levels;

-- Create secure SELECT policy
CREATE POLICY "stock_levels_select_tenant_isolated"
  ON public.stock_levels
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "Staff roles can manage stock levels" ON public.stock_levels;
DROP POLICY IF EXISTS "stock_levels_write_authorized" ON public.stock_levels;

CREATE POLICY "stock_levels_write_authorized"
  ON public.stock_levels
  FOR ALL
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  )
  WITH CHECK (
    store_id = public.get_current_user_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  );

-- =============================================================================
-- 11) STOCK_TRANSFERS - Transfer records
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "stock_transfers_read_authenticated" ON public.stock_transfers;
DROP POLICY IF EXISTS "stock_transfers_select_tenant_isolated" ON public.stock_transfers;

-- Create secure SELECT policy
CREATE POLICY "stock_transfers_select_tenant_isolated"
  ON public.stock_transfers
  FOR SELECT
  TO authenticated
  USING (
    from_store_id = public.get_current_user_store_id()
    OR to_store_id = public.get_current_user_store_id()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "stock_transfers_write_staff" ON public.stock_transfers;
DROP POLICY IF EXISTS "stock_transfers_write_authorized" ON public.stock_transfers;

CREATE POLICY "stock_transfers_write_authorized"
  ON public.stock_transfers
  FOR ALL
  TO authenticated
  USING (
    (from_store_id = public.get_current_user_store_id() OR to_store_id = public.get_current_user_store_id())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  )
  WITH CHECK (
    (from_store_id = public.get_current_user_store_id() OR to_store_id = public.get_current_user_store_id())
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor', 'staff')
    )
  );

-- =============================================================================
-- 12) STOCK_TRANSFER_ITEMS - Transfer line items
-- =============================================================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "stock_transfer_items_read_authenticated" ON public.stock_transfer_items;
DROP POLICY IF EXISTS "stock_transfer_items_select_tenant_isolated" ON public.stock_transfer_items;

-- Create secure SELECT policy
CREATE POLICY "stock_transfer_items_select_tenant_isolated"
  ON public.stock_transfer_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_transfers st
      WHERE st.id = stock_transfer_items.transfer_id
        AND (
          st.from_store_id = public.get_current_user_store_id()
          OR st.to_store_id = public.get_current_user_store_id()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.auth_id = (SELECT auth.uid())
              AND u.role IN ('admin', 'manager', 'advisor')
              AND u.tenant_id = public.get_current_user_tenant_id()
          )
        )
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "stock_transfer_items_write_staff" ON public.stock_transfer_items;
DROP POLICY IF EXISTS "stock_transfer_items_write_authorized" ON public.stock_transfer_items;

CREATE POLICY "stock_transfer_items_write_authorized"
  ON public.stock_transfer_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_transfers st
      WHERE st.id = stock_transfer_items.transfer_id
        AND (st.from_store_id = public.get_current_user_store_id() OR st.to_store_id = public.get_current_user_store_id())
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor', 'staff')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stock_transfers st
      WHERE st.id = stock_transfer_items.transfer_id
        AND (st.from_store_id = public.get_current_user_store_id() OR st.to_store_id = public.get_current_user_store_id())
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'advisor', 'staff')
        )
    )
  );

-- =============================================================================
-- 13) SUPPLIERS - Supplier data
-- =============================================================================

-- CRITICAL: suppliers table lacks tenant_id column (design flaw)
-- We must add tenant_id for proper multi-tenant isolation

-- Add tenant_id column to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Populate tenant_id from existing purchase_orders
-- Each supplier gets assigned to the tenant of stores that ordered from them
UPDATE public.suppliers s
SET tenant_id = st.tenant_id
FROM public.purchase_orders po
JOIN public.stores st ON po.store_id = st.id
WHERE s.id = po.supplier_id
  AND s.tenant_id IS NULL;

-- For suppliers not yet referenced in purchase_orders, assign based on user context
-- (They will be properly assigned when first purchase_order is created)
-- Note: This updates only if there's a current user context
DO $$
BEGIN
  IF public.get_current_user_tenant_id() IS NOT NULL THEN
    UPDATE public.suppliers
    SET tenant_id = public.get_current_user_tenant_id()
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Drop vulnerable policies
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_tenant_isolated" ON public.suppliers;

-- Create secure SELECT policy
CREATE POLICY "suppliers_select_tenant_isolated"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- Verify write policies
DROP POLICY IF EXISTS "suppliers_write" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_write_authorized" ON public.suppliers;

CREATE POLICY "suppliers_write_authorized"
  ON public.suppliers
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

-- =============================================================================
-- GRANT EXECUTE ON HELPER FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_store_id() TO authenticated;

-- =============================================================================
-- ADDITIONAL TABLE SECURITY ENHANCEMENTS
-- =============================================================================

-- Ensure parties (customers) have proper RLS
-- Note: parties table has tenant_id, not store_id
DROP POLICY IF EXISTS "parties_select_all" ON public.parties;
DROP POLICY IF EXISTS "parties_select_tenant_isolated" ON public.parties;

CREATE POLICY "parties_select_tenant_isolated" ON public.parties
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_user_tenant_id()
  );

-- Ensure expenses have proper RLS
DROP POLICY IF EXISTS "expenses_select_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_tenant_isolated" ON public.expenses;

CREATE POLICY "expenses_select_tenant_isolated" ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    store_id = public.get_current_user_store_id()
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'advisor')
        AND u.tenant_id = public.get_current_user_tenant_id()
    )
  );

-- =============================================================================
-- VERIFICATION QUERIES (Run these manually after migration)
-- =============================================================================

-- To verify no tables have USING (true) policies:
-- SELECT schemaname, tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE qual = 'true' OR qual IS NULL;

-- To see all policies on a specific table:
-- SELECT * FROM pg_policies WHERE tablename = 'items';

-- To check RLS is enabled on all tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = false;
