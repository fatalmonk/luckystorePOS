-- =============================================================================
-- MASTER REPAIR MIGRATION - Fixes all local DB issues
-- =============================================================================
-- 1. Duplicate policies causing migration failures
-- 2. Missing RPC grants causing 42501 permission denied
-- 3. Function return type conflicts
-- 4. Missing indexes with IF NOT EXISTS
-- 
-- Strategy: DROP before CREATE for everything
-- =============================================================================

-- =============================================================================
-- PART 1: Store Policies (duplicate fix)
-- =============================================================================

DO $$
BEGIN
  -- Drop all potentially conflicting policies first
  DROP POLICY IF EXISTS "stores_insert_authenticated" ON public.stores;
  DROP POLICY IF EXISTS "stores_update_authenticated" ON public.stores;
  DROP POLICY IF EXISTS "stores_delete_authenticated" ON public.stores;
  DROP POLICY IF EXISTS "stores_insert_admin_manager" ON public.stores;
  DROP POLICY IF EXISTS "stores_update_admin_manager" ON public.stores;
  DROP POLICY IF EXISTS "stores_delete_admin_manager" ON public.stores;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stores' AND schemaname = 'public')
     AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    CREATE POLICY "stores_insert_admin_manager"
      ON public.stores FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role IN ('admin', 'manager')
      ));

    CREATE POLICY "stores_update_admin_manager"
      ON public.stores FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role IN ('admin', 'manager')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role IN ('admin', 'manager')
      ));

    CREATE POLICY "stores_delete_admin_manager"
      ON public.stores FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role IN ('admin', 'manager')
      ));
  END IF;
END $$;

-- =============================================================================
-- PART 2: Category Policies (duplicate fix)
-- =============================================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "categories_insert_authenticated" ON public.categories;
  DROP POLICY IF EXISTS "categories_update_authenticated" ON public.categories;
  DROP POLICY IF EXISTS "categories_delete_authenticated" ON public.categories;
  DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
  DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
  DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'categories' AND schemaname = 'public')
     AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    CREATE POLICY "categories_insert_admin"
      ON public.categories FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role = 'admin'
      ));

    CREATE POLICY "categories_update_admin"
      ON public.categories FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role = 'admin'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role = 'admin'
      ));

    CREATE POLICY "categories_delete_admin"
      ON public.categories FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = (select auth.uid())
        AND u.role = 'admin'
      ));
  END IF;
END $$;

-- =============================================================================
-- PART 3: POS Sessions Policies (duplicate fix)
-- =============================================================================

DROP POLICY IF EXISTS "ses_select_own" ON public.pos_sessions;
DROP POLICY IF EXISTS "ses_select_manager" ON public.pos_sessions;
DROP POLICY IF EXISTS "ses_insert" ON public.pos_sessions;
DROP POLICY IF EXISTS "ses_update" ON public.pos_sessions;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'pos_sessions' AND schemaname = 'public') THEN
    CREATE POLICY "ses_select_own" ON public.pos_sessions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.id = cashier_id));
    CREATE POLICY "ses_select_manager" ON public.pos_sessions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));
    CREATE POLICY "ses_insert" ON public.pos_sessions FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager','cashier')));
    CREATE POLICY "ses_update" ON public.pos_sessions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND (u.id = cashier_id OR u.role IN ('admin','manager'))));
  END IF;
END $$;

-- =============================================================================
-- PART 4: Sales Policies (duplicate fix)
-- =============================================================================

DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_select_own" ON public.sales;
DROP POLICY IF EXISTS "sales_select_manager" ON public.sales;
DROP POLICY IF EXISTS "sales_void" ON public.sales;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sales' AND schemaname = 'public') THEN
    CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager','cashier')));
    CREATE POLICY "sales_select_own" ON public.sales FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.id = cashier_id AND created_at >= CURRENT_DATE));
    CREATE POLICY "sales_select_manager" ON public.sales FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));
    CREATE POLICY "sales_void" ON public.sales FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));
  END IF;
END $$;

-- =============================================================================
-- PART 5: Sale Items/Payments Policies (duplicate fix)
-- =============================================================================

DROP POLICY IF EXISTS "si_select" ON public.sale_items;
DROP POLICY IF EXISTS "si_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sp_select" ON public.sale_payments;
DROP POLICY IF EXISTS "sp_insert" ON public.sale_payments;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sale_items' AND schemaname = 'public') THEN
    CREATE POLICY "si_select" ON public.sale_items FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.sales s
        JOIN public.users u ON u.auth_id = (SELECT auth.uid())
        WHERE s.id = sale_id AND (u.id = s.cashier_id OR u.role IN ('admin','manager'))));
    CREATE POLICY "si_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sale_payments' AND schemaname = 'public') THEN
    CREATE POLICY "sp_select" ON public.sale_payments FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.sales s
        JOIN public.users u ON u.auth_id = (SELECT auth.uid())
        WHERE s.id = sale_id AND (u.id = s.cashier_id OR u.role IN ('admin','manager'))));
    CREATE POLICY "sp_insert" ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- PART 6: Ledger Worker Functions (return type conflict fix)
-- =============================================================================

DROP FUNCTION IF EXISTS public.register_ledger_worker(text);
DROP FUNCTION IF EXISTS public.heartbeat_ledger_worker(text);

CREATE OR REPLACE FUNCTION public.register_ledger_worker(p_worker_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat)
  VALUES (p_worker_id, true, now())
  ON CONFLICT (worker_id) DO UPDATE
  SET active = true, last_heartbeat = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_ledger_worker(p_worker_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.ledger_workers
  SET last_heartbeat = now(), active = true
  WHERE worker_id = p_worker_id;
  RETURN FOUND;
END;
$$;

-- =============================================================================
-- PART 7: Stock Ledger Indexes (IF NOT EXISTS)
-- =============================================================================

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_store_id ON public.stock_ledger(store_id);
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_id ON public.stock_ledger(product_id);
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_store_product_date ON public.stock_ledger(store_id, product_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_transaction_type ON public.stock_ledger(transaction_type);
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_movement_id ON public.stock_ledger(movement_id) WHERE movement_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON public.stock_ledger(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_ledger_metadata ON public.stock_ledger USING gin (metadata);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'stock_ledger table not found';
END $$;

-- =============================================================================
-- PART 8: CORE RPC GRANTS - These fix the 42501 permission denied errors
-- =============================================================================

-- POS Functions
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text,uuid) TO authenticated;

-- Inventory Functions (grant if exists, skip if not)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_inventory_list(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid,uuid,integer,text,text,uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.set_stock(uuid,uuid,integer,text,text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_stock_history_simple(uuid,uuid,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_stock_valuation(uuid,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_top_selling_items(uuid,integer,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_slow_moving_items(uuid,integer,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_daily_movement_trend(uuid,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_stock_movements(uuid,uuid,integer,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_inventory_summary(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_low_stock_items(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Other Income / Expenses
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.record_expense(uuid,date,text,text,numeric,text,text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Dashboard / Settings
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_manager_dashboard_stats(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_store_users(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_payment_methods(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_receipt_config_simple(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Sales / Close
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_sales_history(uuid,text,timestamptz,timestamptz,integer,integer) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_sale_details(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.open_pos_session(uuid,uuid,numeric) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.close_pos_session(uuid,numeric,numeric) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Staff PIN
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text,text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.authenticate_staff_pin(text,text,uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Ledger / Queue
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.register_ledger_worker(text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.heartbeat_ledger_worker(text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Complete Sale / Create Sale (versions vary, try common signatures)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.create_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text,text,jsonb,text,text,text) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- =============================================================================
-- PART 9: Enable RLS on tables
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.sale_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.sale_payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.stock_levels ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.other_income ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.stock_ledger ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.ledger_workers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.ledger_posting_queue ENABLE ROW LEVEL SECURITY;
END $$;

-- =============================================================================
-- PART 10: Final grants for service_role (if tables exist)
-- =============================================================================

DO $$
BEGIN
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Could not grant all permissions to service_role';
END $$;

-- =============================================================================
-- DONE
-- =============================================================================

SELECT 'Master repair migration completed successfully at ' || now() as status;
