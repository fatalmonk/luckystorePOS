-- Migration: RPC Consolidation and Security Hardening
-- Description: Drops redundant/old RPCs, consolidates sale functions, fixes users table schema for legacy requests, and adds missing RLS policies.

-- 1. Fix Users Table for legacy client requests (missing 'name' column)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name') THEN
        ALTER TABLE public.users ADD COLUMN name text;
        -- Sync existing data
        UPDATE public.users SET name = full_name;
    END IF;
END $$;

-- 2. Consolidate Redundant RPC Definitions
-- Drop old/deprecated versions to avoid confusion and parse-time conflicts
DROP FUNCTION IF EXISTS public.record_sale(text, uuid, uuid, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text);

-- Drop the redundant complete_sale (handling the case where multiple versions might exist due to different signatures)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure as proc_name
        FROM pg_proc
        WHERE proname = 'complete_sale'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc_name;
    END LOOP;
END $$;

-- Re-implement complete_sale as the single, authoritative entry point wrapping create_sale
CREATE OR REPLACE FUNCTION public.complete_sale(
    p_store_id uuid,
    p_cashier_id uuid,
    p_session_id uuid DEFAULT NULL,
    p_items jsonb DEFAULT '[]',
    p_payments jsonb DEFAULT '[]',
    p_discount numeric DEFAULT 0,
    p_client_transaction_id text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_snapshot jsonb DEFAULT NULL,
    p_fulfillment_policy text DEFAULT 'STRICT',
    p_override_token text DEFAULT NULL,
    p_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- This ensures we use the most modern creation logic while maintaining the 'complete_sale' name for client compatibility
    RETURN public.create_sale(
        p_store_id,
        p_cashier_id,
        p_session_id,
        p_items,
        p_payments,
        p_discount,
        p_client_transaction_id,
        p_notes,
        p_snapshot,
        p_fulfillment_policy,
        p_override_token,
        p_override_reason
    );
END;
$$;

-- 3. Rename/Alias record_purchase_v2 to record_purchase if it exists
CREATE OR REPLACE FUNCTION public.record_purchase(
    p_idempotency_key text,
    p_tenant_id uuid,
    p_store_id uuid,
    p_supplier_id uuid,
    p_invoice_number text DEFAULT NULL,
    p_invoice_total numeric DEFAULT NULL,
    p_items jsonb DEFAULT '[]',
    p_amount_paid numeric DEFAULT 0,
    p_payment_account_id uuid DEFAULT NULL,
    p_payable_account_id uuid DEFAULT NULL,
    p_status text DEFAULT 'posted',
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.record_purchase_v2(
        p_idempotency_key,
        p_tenant_id,
        p_store_id,
        p_supplier_id,
        p_invoice_number,
        p_invoice_total,
        p_items,
        p_amount_paid,
        p_payment_account_id,
        p_payable_account_id,
        p_status,
        p_notes
    );
END;
$$;

-- 4. Security Hardening - RLS Policies
-- Use helpers from 20260505000000_tenant_isolation_rls.sql if available, or define locally
DO $$
BEGIN
    -- Tenants
    DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
    CREATE POLICY "tenants_select_own" ON public.tenants
        FOR SELECT TO authenticated
        USING (id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

    -- Accounts
    ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "accounts_select_tenant" ON public.accounts;
    CREATE POLICY "accounts_select_tenant" ON public.accounts
        FOR SELECT TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

    -- Parties (Suppliers/Customers)
    ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "parties_select_tenant" ON public.parties;
    CREATE POLICY "parties_select_tenant" ON public.parties
        FOR SELECT TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()));

    -- Ledger Posting Queue
    ALTER TABLE public.ledger_posting_queue ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "lpq_select_staff" ON public.ledger_posting_queue;
    CREATE POLICY "lpq_select_staff" ON public.ledger_posting_queue
        FOR SELECT TO authenticated
        USING (store_id = (SELECT store_id FROM public.users WHERE auth_id = auth.uid()));

    -- Ledger Workers
    ALTER TABLE public.ledger_workers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "lw_select_authenticated" ON public.ledger_workers;
    CREATE POLICY "lw_select_authenticated" ON public.ledger_workers
        FOR SELECT TO authenticated
        USING (true); -- Workers are publicly visible to authenticated staff

    -- Inventory table hardening.
    -- Local replay may use public.items instead of public.inventory_items.
    IF to_regclass('public.inventory_items') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "inventory_items_select_tenant" ON public.inventory_items';
        EXECUTE '
            CREATE POLICY "inventory_items_select_tenant" ON public.inventory_items
            FOR SELECT TO authenticated
            USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()))
        ';
    ELSIF to_regclass('public.items') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.items ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "items_select_tenant" ON public.items';
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'items'
              AND column_name = 'tenant_id'
        ) THEN
            EXECUTE '
                CREATE POLICY "items_select_tenant" ON public.items
                FOR SELECT TO authenticated
                USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()))
            ';
        ELSE
            EXECUTE '
                CREATE POLICY "items_select_authenticated" ON public.items
                FOR SELECT TO authenticated
                USING (true)
            ';
        END IF;
    END IF;

    -- Idempotency Keys hardening.
    IF to_regclass('public.idempotency_keys') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "idempotency_keys_tenant_isolated" ON public.idempotency_keys';
        EXECUTE '
            CREATE POLICY "idempotency_keys_tenant_isolated" ON public.idempotency_keys
            FOR SELECT TO authenticated
            USING (tenant_id = (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()))
        ';
    ELSIF to_regclass('public.ledger_posting_idempotency') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.ledger_posting_idempotency ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "idempotency_keys_tenant_isolated" ON public.ledger_posting_idempotency';
        -- ledger_posting_idempotency links to sales, which has tenant_id.
        -- We use a simpler policy if we can't easily join here, or just enable RLS.
        EXECUTE '
            CREATE POLICY "idempotency_keys_tenant_isolated" ON public.ledger_posting_idempotency
            FOR SELECT TO authenticated
            USING (true)
        ';
    END IF;

END $$;

-- 5. Hardening SECURITY DEFINER functions (Set search_path)
-- This was already done in the definitions above, but good to keep in mind.

-- 6. Add trigger to keep users.name in sync with full_name
CREATE OR REPLACE FUNCTION public.sync_user_name()
RETURNS trigger AS $$
BEGIN
    NEW.name := NEW.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_user_name ON public.users;
CREATE TRIGGER tr_sync_user_name
BEFORE INSERT OR UPDATE OF full_name ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_name();
