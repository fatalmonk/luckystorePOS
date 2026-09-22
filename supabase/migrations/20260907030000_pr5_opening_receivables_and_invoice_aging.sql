-- Migration: 20260907030000_pr5_opening_receivables_and_invoice_aging.sql
-- Description: PR 5 - invoice terms, allocation engine, and aging RPC.
-- Opening-receivable data conversion is intentionally separated into the next
-- migration so large datasets are handled set-wise and ambiguous store
-- attribution can fail closed before any rows are written.

-- ============================================================================
-- 1. EXTEND PUBLIC.SALES WITH INVOICE & CREDIT TERMS COLUMNS
-- ============================================================================

ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invoice_date DATE,
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS credit_terms_days INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'PAID';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_credit_status'
    ) THEN
        ALTER TABLE public.sales
        ADD CONSTRAINT chk_sales_credit_status
        CHECK (credit_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_credit_terms_days'
    ) THEN
        ALTER TABLE public.sales
        ADD CONSTRAINT chk_sales_credit_terms_days
        CHECK (credit_terms_days >= 0);
    END IF;
END $$;

UPDATE public.sales
SET invoice_date = COALESCE(invoice_date, created_at::date, CURRENT_DATE),
    due_date = COALESCE(due_date, created_at::date, CURRENT_DATE),
    credit_terms_days = COALESCE(credit_terms_days, 0),
    credit_status = COALESCE(credit_status, 'PAID')
WHERE invoice_date IS NULL OR due_date IS NULL OR credit_status IS NULL;

ALTER TABLE public.sales
    ALTER COLUMN invoice_date SET DEFAULT CURRENT_DATE,
    ALTER COLUMN invoice_date SET NOT NULL,
    ALTER COLUMN due_date SET DEFAULT CURRENT_DATE,
    ALTER COLUMN due_date SET NOT NULL,
    ALTER COLUMN credit_status SET DEFAULT 'PAID',
    ALTER COLUMN credit_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id
    ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_credit_status
    ON public.sales (credit_status) WHERE credit_status != 'PAID';
CREATE INDEX IF NOT EXISTS idx_sales_due_date
    ON public.sales (due_date);
CREATE INDEX IF NOT EXISTS idx_sales_store_credit_status
    ON public.sales (store_id, credit_status);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date
    ON public.sales (invoice_date);

-- ============================================================================
-- 2. CREATE PUBLIC.SALE_PAYMENT_ALLOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sale_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.sale_payments(id) ON DELETE SET NULL,
    ledger_batch_id UUID REFERENCES public.ledger_batches(id) ON DELETE SET NULL,
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sale_payment_allocations_sale
    ON public.sale_payment_allocations (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payment_allocations_payment
    ON public.sale_payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_sale_payment_allocations_batch
    ON public.sale_payment_allocations (ledger_batch_id);

ALTER TABLE public.sale_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spa_select" ON public.sale_payment_allocations;
CREATE POLICY "spa_select" ON public.sale_payment_allocations FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.stores st ON st.id = s.store_id
        JOIN public.users u ON u.tenant_id = st.tenant_id AND u.auth_id = (SELECT auth.uid())
        WHERE s.id = sale_payment_allocations.sale_id
    ));

DROP POLICY IF EXISTS "spa_service_role" ON public.sale_payment_allocations;
CREATE POLICY "spa_service_role" ON public.sale_payment_allocations FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 3. PAYMENT ALLOCATION ENGINE (FIFO Open Invoice Matching)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.allocate_payment_to_invoices(
    p_tenant_id UUID,
    p_party_id UUID,
    p_payment_amount NUMERIC,
    p_ledger_batch_id UUID DEFAULT NULL,
    p_payment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_remaining NUMERIC(12,2) := ROUND(p_payment_amount, 2);
    v_sale RECORD;
    v_open_balance NUMERIC(12,2);
    v_alloc_amount NUMERIC(12,2);
    v_allocated_total NUMERIC(12,2) := 0;
    v_invoice_count INTEGER := 0;
    v_allocations JSONB := '[]'::jsonb;
BEGIN
    IF v_remaining <= 0 THEN
        RETURN jsonb_build_object(
            'status', 'NOOP',
            'allocated_total', 0,
            'remaining', 0,
            'invoice_count', 0
        );
    END IF;

    FOR v_sale IN
        SELECT
            s.id,
            s.sale_number,
            s.total_amount,
            s.due_date,
            COALESCE((
                SELECT SUM(spa.allocated_amount)
                FROM public.sale_payment_allocations spa
                WHERE spa.sale_id = s.id
            ), 0) AS total_paid
        FROM public.sales s
        JOIN public.stores st ON st.id = s.store_id
        WHERE s.customer_id = p_party_id
          AND st.tenant_id = p_tenant_id
          AND s.credit_status != 'PAID'
          AND s.total_amount > COALESCE((
              SELECT SUM(spa2.allocated_amount)
              FROM public.sale_payment_allocations spa2
              WHERE spa2.sale_id = s.id
          ), 0)
        ORDER BY s.due_date ASC, s.created_at ASC, s.id ASC
        FOR UPDATE OF s
    LOOP
        EXIT WHEN v_remaining <= 0;

        v_open_balance := ROUND(v_sale.total_amount - v_sale.total_paid, 2);
        v_alloc_amount := LEAST(v_remaining, v_open_balance);

        IF v_alloc_amount > 0 THEN
            INSERT INTO public.sale_payment_allocations (
                sale_id, payment_id, ledger_batch_id, allocated_amount, notes
            ) VALUES (
                v_sale.id, p_payment_id, p_ledger_batch_id, v_alloc_amount,
                'FIFO payment allocation'
            );

            v_remaining := v_remaining - v_alloc_amount;
            v_allocated_total := v_allocated_total + v_alloc_amount;
            v_invoice_count := v_invoice_count + 1;

            UPDATE public.sales
            SET credit_status = CASE
                    WHEN (v_sale.total_paid + v_alloc_amount) >= v_sale.total_amount THEN 'PAID'
                    ELSE 'PARTIALLY_PAID'
                END,
                updated_at = now()
            WHERE id = v_sale.id;

            v_allocations := v_allocations || jsonb_build_object(
                'sale_id', v_sale.id,
                'sale_number', v_sale.sale_number,
                'allocated_amount', v_alloc_amount,
                'remaining_on_sale', v_open_balance - v_alloc_amount
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'allocated_total', v_allocated_total,
        'unallocated_remaining', v_remaining,
        'invoice_count', v_invoice_count,
        'allocations', v_allocations
    );
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_payment_to_invoices(UUID, UUID, NUMERIC, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_payment_to_invoices(UUID, UUID, NUMERIC, UUID, UUID) TO authenticated, service_role;

-- ============================================================================
-- 4. OPENING RECEIVABLE DATA MIGRATION
-- ============================================================================
-- Deliberately deferred to 20260907030100_backfill_opening_receivables_set_based.sql.
-- Keeping schema/RPC installation separate makes the data phase restartable and
-- prevents an unbounded procedural loop from holding one migration transaction.

-- ============================================================================
-- 5. GET_INVOICE_AGING_REPORT RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_invoice_aging_report(
    p_store_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_is_service_role BOOLEAN := COALESCE((SELECT auth.jwt()->>'role'), '') = 'service_role';
    v_caller_tenant_id UUID;
    v_as_of DATE := COALESCE(p_as_of_date, CURRENT_DATE);
    v_invoices JSONB := '[]'::jsonb;
    v_by_customer JSONB := '[]'::jsonb;
    v_summary JSONB;
    v_total_receivables NUMERIC(12,2) := 0;
    v_total_current NUMERIC(12,2) := 0;
    v_total_1_30 NUMERIC(12,2) := 0;
    v_total_31_60 NUMERIC(12,2) := 0;
    v_total_61_90 NUMERIC(12,2) := 0;
    v_total_over_90 NUMERIC(12,2) := 0;
    v_invoice_count INTEGER := 0;
    v_customer_count INTEGER := 0;
    r RECORD;
    r_cust RECORD;
BEGIN
    IF NOT v_is_service_role THEN
        IF v_auth_uid IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        SELECT tenant_id INTO v_caller_tenant_id
        FROM public.users
        WHERE auth_id = v_auth_uid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
        END IF;
    END IF;

    FOR r IN
        WITH invoice_payments AS (
            SELECT sale_id, COALESCE(SUM(allocated_amount), 0) AS paid_amount
            FROM public.sale_payment_allocations
            GROUP BY sale_id
        )
        SELECT
            s.id AS sale_id,
            s.sale_number,
            s.store_id,
            st.name AS store_name,
            s.customer_id,
            p.name AS customer_name,
            p.phone AS customer_phone,
            s.invoice_date,
            s.due_date,
            s.credit_terms_days,
            s.total_amount,
            COALESCE(ip.paid_amount, 0) AS paid_amount,
            ROUND(s.total_amount - COALESCE(ip.paid_amount, 0), 2) AS open_balance,
            GREATEST(v_as_of - s.due_date, 0)::integer AS days_overdue,
            CASE
                WHEN v_as_of <= s.due_date THEN 'current'
                WHEN (v_as_of - s.due_date) BETWEEN 1 AND 30 THEN '1_30_days'
                WHEN (v_as_of - s.due_date) BETWEEN 31 AND 60 THEN '31_60_days'
                WHEN (v_as_of - s.due_date) BETWEEN 61 AND 90 THEN '61_90_days'
                ELSE 'over_90_days'
            END AS aging_bucket,
            CASE
                WHEN (s.total_amount - COALESCE(ip.paid_amount, 0)) <= 0 THEN 'PAID'
                WHEN v_as_of > s.due_date THEN 'OVERDUE'
                WHEN COALESCE(ip.paid_amount, 0) > 0 THEN 'PARTIALLY_PAID'
                ELSE 'UNPAID'
            END AS calculated_credit_status
        FROM public.sales s
        JOIN public.stores st ON st.id = s.store_id
        JOIN public.parties p ON p.id = s.customer_id
        LEFT JOIN invoice_payments ip ON ip.sale_id = s.id
        WHERE s.customer_id IS NOT NULL
          AND s.invoice_date <= v_as_of
          AND (s.total_amount - COALESCE(ip.paid_amount, 0)) > 0
          AND (v_caller_tenant_id IS NULL OR st.tenant_id = v_caller_tenant_id)
          AND (p_store_id IS NULL OR s.store_id = p_store_id)
          AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
        ORDER BY days_overdue DESC, s.due_date ASC
    LOOP
        v_invoice_count := v_invoice_count + 1;
        v_total_receivables := v_total_receivables + r.open_balance;

        IF r.aging_bucket = 'current' THEN
            v_total_current := v_total_current + r.open_balance;
        ELSIF r.aging_bucket = '1_30_days' THEN
            v_total_1_30 := v_total_1_30 + r.open_balance;
        ELSIF r.aging_bucket = '31_60_days' THEN
            v_total_31_60 := v_total_31_60 + r.open_balance;
        ELSIF r.aging_bucket = '61_90_days' THEN
            v_total_61_90 := v_total_61_90 + r.open_balance;
        ELSE
            v_total_over_90 := v_total_over_90 + r.open_balance;
        END IF;

        v_invoices := v_invoices || jsonb_build_object(
            'sale_id', r.sale_id,
            'sale_number', r.sale_number,
            'store_id', r.store_id,
            'store_name', r.store_name,
            'customer_id', r.customer_id,
            'customer_name', r.customer_name,
            'customer_phone', r.customer_phone,
            'invoice_date', r.invoice_date,
            'due_date', r.due_date,
            'credit_terms_days', r.credit_terms_days,
            'total_amount', r.total_amount,
            'paid_amount', r.paid_amount,
            'open_balance', r.open_balance,
            'days_overdue', r.days_overdue,
            'aging_bucket', r.aging_bucket,
            'credit_status', r.calculated_credit_status
        );
    END LOOP;

    FOR r_cust IN
        WITH invoice_payments AS (
            SELECT sale_id, COALESCE(SUM(allocated_amount), 0) AS paid_amount
            FROM public.sale_payment_allocations
            GROUP BY sale_id
        ),
        open_invoices AS (
            SELECT
                s.customer_id,
                p.name AS customer_name,
                p.phone AS customer_phone,
                ROUND(s.total_amount - COALESCE(ip.paid_amount, 0), 2) AS open_balance,
                GREATEST(v_as_of - s.due_date, 0)::integer AS days_overdue,
                CASE
                    WHEN v_as_of <= s.due_date THEN 'current'
                    WHEN (v_as_of - s.due_date) BETWEEN 1 AND 30 THEN '1_30_days'
                    WHEN (v_as_of - s.due_date) BETWEEN 31 AND 60 THEN '31_60_days'
                    WHEN (v_as_of - s.due_date) BETWEEN 61 AND 90 THEN '61_90_days'
                    ELSE 'over_90_days'
                END AS aging_bucket
            FROM public.sales s
            JOIN public.stores st ON st.id = s.store_id
            JOIN public.parties p ON p.id = s.customer_id
            LEFT JOIN invoice_payments ip ON ip.sale_id = s.id
            WHERE s.customer_id IS NOT NULL
              AND s.invoice_date <= v_as_of
              AND (s.total_amount - COALESCE(ip.paid_amount, 0)) > 0
              AND (v_caller_tenant_id IS NULL OR st.tenant_id = v_caller_tenant_id)
              AND (p_store_id IS NULL OR s.store_id = p_store_id)
              AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
        )
        SELECT
            oi.customer_id,
            oi.customer_name,
            oi.customer_phone,
            COUNT(*) AS open_invoice_count,
            SUM(oi.open_balance) AS total_balance,
            SUM(CASE WHEN oi.aging_bucket = 'current' THEN oi.open_balance ELSE 0 END) AS current_amount,
            SUM(CASE WHEN oi.aging_bucket = '1_30_days' THEN oi.open_balance ELSE 0 END) AS bucket_1_30,
            SUM(CASE WHEN oi.aging_bucket = '31_60_days' THEN oi.open_balance ELSE 0 END) AS bucket_31_60,
            SUM(CASE WHEN oi.aging_bucket = '61_90_days' THEN oi.open_balance ELSE 0 END) AS bucket_61_90,
            SUM(CASE WHEN oi.aging_bucket = 'over_90_days' THEN oi.open_balance ELSE 0 END) AS bucket_over_90,
            MAX(oi.days_overdue) AS max_days_overdue
        FROM open_invoices oi
        GROUP BY oi.customer_id, oi.customer_name, oi.customer_phone
        ORDER BY total_balance DESC
    LOOP
        v_customer_count := v_customer_count + 1;
        v_by_customer := v_by_customer || jsonb_build_object(
            'customer_id', r_cust.customer_id,
            'customer_name', r_cust.customer_name,
            'customer_phone', r_cust.customer_phone,
            'open_invoice_count', r_cust.open_invoice_count,
            'total_balance', r_cust.total_balance,
            'current', r_cust.current_amount,
            'bucket_1_30', r_cust.bucket_1_30,
            'bucket_31_60', r_cust.bucket_31_60,
            'bucket_61_90', r_cust.bucket_61_90,
            'bucket_over_90', r_cust.bucket_over_90,
            'max_days_overdue', r_cust.max_days_overdue
        );
    END LOOP;

    v_summary := jsonb_build_object(
        'as_of_date', v_as_of,
        'total_receivables', v_total_receivables,
        'current', v_total_current,
        'bucket_1_30', v_total_1_30,
        'bucket_31_60', v_total_31_60,
        'bucket_61_90', v_total_61_90,
        'bucket_over_90', v_total_over_90,
        'invoice_count', v_invoice_count,
        'customer_count', v_customer_count
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'summary', v_summary,
        'invoices', v_invoices,
        'by_customer', v_by_customer
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_aging_report(UUID, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_aging_report(UUID, UUID, DATE) TO authenticated, service_role;
