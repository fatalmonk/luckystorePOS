-- Repair missing domain RPC functions
-- These functions were defined in earlier migrations but didn't persist to remote

-- =============================================================================
-- Helper to handle idempotency
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_idempotency(p_key TEXT, p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_response JSONB;
BEGIN
    SELECT response_body INTO v_response
    FROM idempotency_keys
    WHERE idempotency_key = p_key AND tenant_id = p_tenant_id;

    IF FOUND THEN
        RETURN v_response;
    END IF;

    INSERT INTO idempotency_keys (idempotency_key, tenant_id, locked_at)
    VALUES (p_key, p_tenant_id, NOW());

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.check_idempotency(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_idempotency(TEXT, UUID) TO authenticated;

-- =============================================================================
-- RPC: record_sale
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_sale(
    p_idempotency_key TEXT,
    p_tenant_id UUID,
    p_store_id UUID,
    p_items JSONB,
    p_payments JSONB,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_item RECORD;
    v_payment RECORD;
    v_total_revenue NUMERIC(15, 4) := 0;
    v_total_payment NUMERIC(15, 4) := 0;
    v_total_cogs NUMERIC(15, 4) := 0;
    v_current_avg_cost NUMERIC(15, 4);
    v_revenue_account_id UUID;
    v_inventory_account_id UUID;
    v_cogs_account_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    SELECT id INTO v_revenue_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Sales Revenue' LIMIT 1;
    SELECT id INTO v_inventory_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset' LIMIT 1;
    SELECT id INTO v_cogs_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Cost of Goods Sold' LIMIT 1;

    IF v_revenue_account_id IS NULL OR v_inventory_account_id IS NULL OR v_cogs_account_id IS NULL THEN
        RAISE EXCEPTION 'System accounts not configured for tenant %', p_tenant_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_price NUMERIC)
    LOOP
        v_total_revenue := v_total_revenue + (v_item.quantity * v_item.unit_price);
    END LOOP;

    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(amount NUMERIC)
    LOOP
        v_total_payment := v_total_payment + v_payment.amount;
    END LOOP;

    IF ABS(v_total_revenue - v_total_payment) > 0.01 THEN
        RAISE EXCEPTION 'Total revenue (%) does not match total payments (%)', v_total_revenue, v_total_payment;
    END IF;

    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_price NUMERIC)
    LOOP
        SELECT weighted_average_cost INTO v_current_avg_cost
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
        ORDER BY created_at DESC LIMIT 1;

        v_current_avg_cost := COALESCE(v_current_avg_cost, 0);
        v_total_cogs := v_total_cogs + (v_item.quantity * v_current_avg_cost);

        INSERT INTO stock_movements (tenant_id, store_id, item_id, quantity_change, weighted_average_cost, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_item.item_id, -v_item.quantity, v_current_avg_cost, 'SALE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_revenue_account_id, v_total_revenue, 'SALE', v_batch_id, v_user_id);

    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(account_id UUID, amount NUMERIC, party_id UUID)
    LOOP
        INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, debit_amount, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_batch_id, v_payment.account_id, v_payment.party_id, v_payment.amount, 'SALE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_cogs_account_id, v_total_cogs, 'SALE', v_batch_id, v_user_id);

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id, v_total_cogs, 'SALE', v_batch_id, v_user_id);

    v_response := jsonb_build_object('status', 'success', 'batch_id', v_batch_id, 'total_revenue', v_total_revenue);
    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.record_sale(TEXT, UUID, UUID, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_sale(TEXT, UUID, UUID, JSONB, JSONB, TEXT) TO authenticated;

-- =============================================================================
-- RPC: record_purchase
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_purchase(
    p_idempotency_key TEXT,
    p_tenant_id UUID,
    p_store_id UUID,
    p_party_id UUID,
    p_account_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_item RECORD;
    v_total_cost NUMERIC(15, 4) := 0;
    v_current_qty NUMERIC(15, 4);
    v_current_avg_cost NUMERIC(15, 4);
    v_new_avg_cost NUMERIC(15, 4);
    v_inventory_account_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    SELECT id INTO v_inventory_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset' LIMIT 1;
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'Inventory account not configured';
    END IF;

    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
    LOOP
        SELECT COALESCE(SUM(quantity_change), 0) INTO v_current_qty
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id;

        SELECT weighted_average_cost INTO v_current_avg_cost
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
        ORDER BY created_at DESC LIMIT 1;

        v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

        IF (v_current_qty + v_item.quantity) > 0 THEN
            v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost) / (v_current_qty + v_item.quantity);
        ELSE
            v_new_avg_cost := v_item.unit_cost;
        END IF;

        v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);

        INSERT INTO stock_movements (tenant_id, store_id, item_id, quantity_change, weighted_average_cost, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_item.item_id, v_item.quantity, v_new_avg_cost, 'PURCHASE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id, v_total_cost, 'PURCHASE', v_batch_id, v_user_id);

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, p_account_id, p_party_id, v_total_cost, 'PURCHASE', v_batch_id, v_user_id);

    v_response := jsonb_build_object('status', 'success', 'batch_id', v_batch_id, 'total_cost', v_total_cost);
    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.record_purchase(TEXT, UUID, UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_purchase(TEXT, UUID, UUID, UUID, UUID, JSONB, TEXT) TO authenticated;

-- =============================================================================
-- Helper: Get Expected Cash Balance
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_expected_cash(
    p_tenant_id UUID,
    p_store_id UUID,
    p_account_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_balance
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id
      AND store_id = p_store_id
      AND account_id = p_account_id
      AND effective_date = p_date;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_expected_cash(UUID, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expected_cash(UUID, UUID, UUID, DATE) TO authenticated;

-- =============================================================================
-- RPC: record_cash_closing
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_cash_closing(
    p_idempotency_key TEXT,
    p_tenant_id UUID,
    p_store_id UUID,
    p_account_id UUID,
    p_actual_cash NUMERIC(15, 4),
    p_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_response JSONB;
    v_expected_cash NUMERIC(15, 4);
    v_variance NUMERIC(15, 4);
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    v_expected_cash := public.get_expected_cash(p_tenant_id, p_store_id, p_account_id, p_date);
    v_variance := p_actual_cash - v_expected_cash;

    v_response := jsonb_build_object(
        'status', 'success',
        'date', p_date,
        'expected_cash', v_expected_cash,
        'actual_cash', p_actual_cash,
        'variance', v_variance
    );

    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.record_cash_closing(TEXT, UUID, UUID, UUID, NUMERIC, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_cash_closing(TEXT, UUID, UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;
