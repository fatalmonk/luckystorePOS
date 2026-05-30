-- Drawer Reconciliation with Variance Tracking
-- Adds reconciliation fields to close_review_log and creates RPC for closing with variance

-- Add variance tracking columns to close_review_log if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'opening_cash'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN opening_cash numeric(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'cash_sales'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN cash_sales numeric(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'expected_drawer'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN expected_drawer numeric(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'actual_cash'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN actual_cash numeric(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'variance_amount'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN variance_amount numeric(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'variance_status'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN variance_status text DEFAULT 'balanced';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'variance_threshold_exceeded'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN variance_threshold_exceeded boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'manager_override_required'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN manager_override_required boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'manager_override_pin_verified'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN manager_override_pin_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'close_review_log' 
        AND column_name = 'variance_notes'
    ) THEN
        ALTER TABLE public.close_review_log 
        ADD COLUMN variance_notes text;
    END IF;
END $$;

-- Add constraint for variance_status
ALTER TABLE public.close_review_log 
ADD CONSTRAINT close_review_log_variance_status_check 
CHECK (variance_status IN ('balanced', 'over', 'short'));

-- Add constraint that variance threshold exceeded requires manager override
ALTER TABLE public.close_review_log 
ADD CONSTRAINT close_review_log_variance_requires_override_check 
CHECK (
    (variance_threshold_exceeded = false) 
    OR (
        variance_threshold_exceeded = true 
        AND manager_override_required = true 
        AND admin_override = true
    )
);

-- Create RPC for closing session with reconciliation
CREATE OR REPLACE FUNCTION public.close_session_with_reconciliation(
    p_session_id uuid,
    p_actual_cash numeric,
    p_variance numeric,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session public.pos_sessions;
    v_summary jsonb;
    v_expected_drawer numeric;
    v_cash_sales numeric;
    v_opening_cash numeric;
    v_variance numeric;
    v_variance_status text;
    v_variance_threshold_exceeded boolean;
    v_store_id uuid;
BEGIN
    -- Get session details
    SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status = 'closed' THEN
        RAISE EXCEPTION 'Session is already closed';
    END IF;

    v_store_id := v_session.store_id;
    v_opening_cash := COALESCE(v_session.opening_cash, 0);

    -- Get session summary to calculate expected drawer
    SELECT get_session_summary(p_session_id) INTO v_summary;
    v_expected_drawer := (v_summary->>'expected_drawer')::numeric;
    v_cash_sales := (v_summary->>'total_cash_sales')::numeric;

    -- Calculate variance (actual - expected)
    -- Positive variance = over (more cash than expected)
    -- Negative variance = short (less cash than expected)
    v_variance := p_actual_cash - v_expected_drawer;

    -- Determine variance status
    IF v_variance > 0 THEN
        v_variance_status := 'over';
    ELSIF v_variance < 0 THEN
        v_variance_status := 'short';
    ELSE
        v_variance_status := 'balanced';
    END IF;

    -- Check if variance exceeds threshold (50 Taka)
    v_variance_threshold_exceeded := ABS(v_variance) > 50;

    -- Update session
    UPDATE public.pos_sessions
    SET 
        status = 'closed',
        closed_at = NOW(),
        closing_cash = p_actual_cash,
        total_sales = v_cash_sales
    WHERE id = p_session_id;

    -- Return result with variance details
    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'opening_cash', v_opening_cash,
        'cash_sales', v_cash_sales,
        'expected_drawer', v_expected_drawer,
        'actual_cash', p_actual_cash,
        'variance', v_variance,
        'variance_status', v_variance_status,
        'variance_threshold_exceeded', v_variance_threshold_exceeded,
        'threshold_value', 50
    );
END;
$$;

-- Add comments documenting the variance tracking fields
COMMENT ON COLUMN public.close_review_log.opening_cash IS 'Opening cash amount at session start';
COMMENT ON COLUMN public.close_review_log.cash_sales IS 'Total cash sales during the session';
COMMENT ON COLUMN public.close_review_log.expected_drawer IS 'Expected drawer amount (opening + cash sales)';
COMMENT ON COLUMN public.close_review_log.actual_cash IS 'Actual cash count by cashier';
COMMENT ON COLUMN public.close_review_log.variance_amount IS 'Difference between expected and actual (actual - expected)';
COMMENT ON COLUMN public.close_review_log.variance_status IS 'balanced, over, or short';
COMMENT ON COLUMN public.close_review_log.variance_threshold_exceeded IS 'True if variance exceeds threshold (50 Taka)';
COMMENT ON COLUMN public.close_review_log.manager_override_required IS 'True if manager override is required for this variance';
COMMENT ON COLUMN public.close_review_log.manager_override_pin_verified IS 'True if manager PIN was verified for override';
COMMENT ON COLUMN public.close_review_log.variance_notes IS 'Additional notes about the variance explanation';
COMMENT ON FUNCTION public.close_session_with_reconciliation IS 'Closes POS session with variance tracking. Returns variance details including whether threshold (50 Taka) was exceeded.';
