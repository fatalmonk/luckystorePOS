-- Migration: 20260907020000_pr4_atomic_card_settlement.sql
-- Description: PR 4 - Atomic Card Settlement in _checkout Private Schema
--              1. Private _checkout schema with sale_intent and stock_reservations.
--              2. Exact RPC grant matrix:
--                 - create_sale_intent: authenticated, service_role
--                 - get_sale_intent_status: authenticated, service_role (tenant isolated)
--                 - settle_card_sale_ipn: strictly service_role
--              3. Atomic 8-step IPN settlement order inside settle_card_sale_ipn.

-- ============================================================================
-- 1. PRIVATE _CHECKOUT SCHEMA & TABLES
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS _checkout;

-- Revoke schema usage from public and client roles; allow only internal roles
REVOKE ALL ON SCHEMA _checkout FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA _checkout TO postgres, service_role;

-- 1.1 _checkout.sale_intent
CREATE TABLE IF NOT EXISTS _checkout.sale_intent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    store_id UUID NOT NULL REFERENCES public.stores(id),
    cashier_id UUID REFERENCES public.users(id),
    customer_id UUID REFERENCES public.parties(id),
    session_id UUID REFERENCES public.pos_sessions(id),
    intent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (intent_status IN ('PENDING', 'SETTLED', 'EXPIRED', 'FAILED', 'CANCELLED')),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BDT',
    items JSONB NOT NULL,
    client_transaction_id TEXT,
    gateway_transaction_id TEXT NOT NULL UNIQUE,
    gateway_val_id TEXT,
    gateway_payment_method TEXT,
    gateway_payload JSONB DEFAULT '{}'::jsonb,
    sale_id UUID REFERENCES public.sales(id),
    expires_at TIMESTAMPTZ NOT NULL,
    settled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 _checkout.stock_reservations
CREATE TABLE IF NOT EXISTS _checkout.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID NOT NULL REFERENCES _checkout.sale_intent(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id),
    item_id UUID NOT NULL REFERENCES public.items(id),
    reserved_qty INTEGER NOT NULL CHECK (reserved_qty > 0),
    status TEXT NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & lookups
CREATE INDEX IF NOT EXISTS idx_checkout_sale_intent_gateway_tx 
    ON _checkout.sale_intent (gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sale_intent_store_status 
    ON _checkout.sale_intent (store_id, intent_status);
CREATE INDEX IF NOT EXISTS idx_checkout_sale_intent_tenant_id 
    ON _checkout.sale_intent (tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sale_intent_expires 
    ON _checkout.sale_intent (expires_at) WHERE intent_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_checkout_stock_reservations_intent 
    ON _checkout.stock_reservations (intent_id);
CREATE INDEX IF NOT EXISTS idx_checkout_stock_reservations_item_store 
    ON _checkout.stock_reservations (store_id, item_id, status);
CREATE INDEX IF NOT EXISTS idx_checkout_stock_reservations_expires 
    ON _checkout.stock_reservations (expires_at) WHERE status = 'RESERVED';

-- Ensure tables are strictly private
REVOKE ALL ON TABLE _checkout.sale_intent FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE _checkout.stock_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE _checkout.sale_intent TO postgres, service_role;
GRANT ALL ON TABLE _checkout.stock_reservations TO postgres, service_role;

-- ============================================================================
-- 2. CREATE_SALE_INTENT (Authenticated Clients / Service Role)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_sale_intent(
    p_store_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_discount NUMERIC DEFAULT 0,
    p_client_transaction_id TEXT DEFAULT NULL,
    p_gateway_transaction_id TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_expires_in_minutes INTEGER DEFAULT 15,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _checkout, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_is_service_role BOOLEAN := COALESCE((SELECT auth.jwt()->>'role'), '') = 'service_role';
    v_user public.users%ROWTYPE;
    v_store public.stores%ROWTYPE;
    v_tenant_id UUID;
    v_item JSONB;
    v_item_id UUID;
    v_qty INTEGER;
    v_unit_price NUMERIC(12,2);
    v_line_discount NUMERIC(12,2);
    v_line_total NUMERIC(12,2);
    v_subtotal NUMERIC(12,2) := 0;
    v_calc_total NUMERIC(12,2) := 0;
    v_item_rec public.items%ROWTYPE;
    v_stock_rec public.stock_levels%ROWTYPE;
    v_active_reserved INTEGER;
    v_available_qty INTEGER;
    v_gateway_tran_id TEXT;
    v_expires_at TIMESTAMPTZ;
    v_intent_id UUID;
    v_customer public.parties%ROWTYPE;
BEGIN
    -- 1. Authentication Check
    IF NOT v_is_service_role THEN
        IF v_auth_uid IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        SELECT * INTO v_user
        FROM public.users
        WHERE auth_id = v_auth_uid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
        END IF;

        IF v_user.role NOT IN ('admin', 'manager', 'cashier') THEN
            RAISE EXCEPTION 'User role % not authorized to create checkout intents', v_user.role USING ERRCODE = '42501';
        END IF;

        v_tenant_id := v_user.tenant_id;
    END IF;

    -- 2. Store Verification
    SELECT * INTO v_store
    FROM public.stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Store % not found', p_store_id USING ERRCODE = 'P0002';
    END IF;

    IF v_tenant_id IS NOT NULL AND v_store.tenant_id IS DISTINCT FROM v_tenant_id THEN
        RAISE EXCEPTION 'Store % belongs to another tenant', p_store_id USING ERRCODE = '42501';
    END IF;

    IF v_tenant_id IS NULL THEN
        v_tenant_id := v_store.tenant_id;
    END IF;

    -- If cashier, verify cashier belongs to this store
    IF NOT v_is_service_role AND v_user.role = 'cashier' AND v_user.store_id IS DISTINCT FROM p_store_id THEN
        RAISE EXCEPTION 'Cashier is not assigned to store %', p_store_id USING ERRCODE = '42501';
    END IF;

    -- 3. Customer Verification (if provided)
    IF p_customer_id IS NOT NULL THEN
        SELECT * INTO v_customer
        FROM public.parties
        WHERE id = p_customer_id
          AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Customer party % not found in tenant', p_customer_id USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- 4. Basic Input Validations
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'No items in checkout intent' USING ERRCODE = '22000';
    END IF;

    IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid total amount %', p_total_amount USING ERRCODE = '22000';
    END IF;

    IF COALESCE(p_discount, 0) < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative' USING ERRCODE = '22000';
    END IF;

    -- Duplicate item check
    IF (
        SELECT count(*)
        FROM jsonb_array_elements(p_items) AS e(value)
    ) IS DISTINCT FROM (
        SELECT count(DISTINCT (e.value->>'item_id')::uuid)
        FROM jsonb_array_elements(p_items) AS e(value)
    ) THEN
        RAISE EXCEPTION 'Duplicate item in checkout items' USING ERRCODE = '22000';
    END IF;

    -- 5. Validate each item and lock stock rows in deterministic order
    FOR v_item IN
        SELECT e.value
        FROM jsonb_array_elements(p_items) AS e(value)
        ORDER BY (e.value->>'item_id')::uuid ASC
    LOOP
        v_item_id := (v_item->>'item_id')::uuid;
        v_qty := COALESCE((v_item->>'qty')::integer, (v_item->>'quantity')::integer);
        v_unit_price := (v_item->>'unit_price')::numeric;
        v_line_discount := COALESCE((v_item->>'discount')::numeric, 0);

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be positive for item %', v_item_id USING ERRCODE = '22000';
        END IF;

        IF v_line_discount < 0 THEN
            RAISE EXCEPTION 'Item discount cannot be negative for item %', v_item_id USING ERRCODE = '22000';
        END IF;

        -- Authoritative item check
        SELECT * INTO v_item_rec
        FROM public.items
        WHERE id = v_item_id
          AND tenant_id = v_tenant_id;

        IF NOT FOUND OR v_item_rec.active IS DISTINCT FROM true THEN
            RAISE EXCEPTION 'Item % not found or inactive in tenant', v_item_id USING ERRCODE = 'P0002';
        END IF;

        -- Check line total
        v_line_total := ROUND((v_item_rec.price - v_line_discount) * v_qty, 2);
        IF v_line_total < 0 THEN
            RAISE EXCEPTION 'Line total cannot be negative for item %', v_item_id USING ERRCODE = '22000';
        END IF;
        v_subtotal := v_subtotal + v_line_total;

        -- Lock stock row
        SELECT * INTO v_stock_rec
        FROM public.stock_levels
        WHERE store_id = p_store_id
          AND item_id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Stock level not configured for item % in store %', v_item_id, p_store_id USING ERRCODE = 'P0002';
        END IF;

        -- Calculate active reservations (unexpired RESERVED rows)
        SELECT COALESCE(SUM(reserved_qty), 0) INTO v_active_reserved
        FROM _checkout.stock_reservations
        WHERE store_id = p_store_id
          AND item_id = v_item_id
          AND status = 'RESERVED'
          AND expires_at > now();

        v_available_qty := COALESCE(v_stock_rec.qty, 0) - v_active_reserved;

        IF v_available_qty < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for %: available %, requested %',
                v_item_rec.name, v_available_qty, v_qty USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    -- Validate subtotal and total
    v_calc_total := ROUND(v_subtotal - COALESCE(p_discount, 0), 2);
    IF v_calc_total < 0 THEN
        v_calc_total := 0;
    END IF;

    IF ROUND(v_calc_total, 2) IS DISTINCT FROM ROUND(p_total_amount, 2) THEN
        RAISE EXCEPTION 'Computed total % does not match requested total %',
            v_calc_total, p_total_amount USING ERRCODE = '22000';
    END IF;

    -- 6. Setup identifiers and expiry
    IF p_gateway_transaction_id IS NOT NULL AND btrim(p_gateway_transaction_id) <> '' THEN
        v_gateway_tran_id := btrim(p_gateway_transaction_id);
    ELSE
        v_gateway_tran_id := 'TRAN_' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 16));
    END IF;

    v_expires_at := now() + (COALESCE(p_expires_in_minutes, 15) || ' minutes')::interval;

    -- 7. Insert Sale Intent
    INSERT INTO _checkout.sale_intent (
        tenant_id,
        store_id,
        cashier_id,
        customer_id,
        session_id,
        intent_status,
        subtotal,
        discount_amount,
        total_amount,
        currency,
        items,
        client_transaction_id,
        gateway_transaction_id,
        expires_at,
        notes
    ) VALUES (
        v_tenant_id,
        p_store_id,
        COALESCE(v_user.id, (SELECT id FROM public.users WHERE tenant_id = v_tenant_id AND role IN ('admin','manager') LIMIT 1)),
        p_customer_id,
        p_session_id,
        'PENDING',
        v_subtotal,
        COALESCE(p_discount, 0),
        v_calc_total,
        'BDT',
        p_items,
        p_client_transaction_id,
        v_gateway_tran_id,
        v_expires_at,
        p_notes
    )
    RETURNING id INTO v_intent_id;

    -- 8. Insert Stock Reservations
    FOR v_item IN
        SELECT e.value
        FROM jsonb_array_elements(p_items) AS e(value)
    LOOP
        v_item_id := (v_item->>'item_id')::uuid;
        v_qty := COALESCE((v_item->>'qty')::integer, (v_item->>'quantity')::integer);

        INSERT INTO _checkout.stock_reservations (
            intent_id,
            store_id,
            item_id,
            reserved_qty,
            status,
            expires_at
        ) VALUES (
            v_intent_id,
            p_store_id,
            v_item_id,
            v_qty,
            'RESERVED',
            v_expires_at
        );
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'intent_id', v_intent_id,
        'gateway_transaction_id', v_gateway_tran_id,
        'subtotal', v_subtotal,
        'discount_amount', COALESCE(p_discount, 0),
        'total_amount', v_calc_total,
        'currency', 'BDT',
        'expires_at', v_expires_at
    );
END;
$$;

-- Exact Grant Matrix for create_sale_intent
REVOKE ALL ON FUNCTION public.create_sale_intent(UUID, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_intent(UUID, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID, INTEGER, TEXT) TO authenticated, service_role;


-- ============================================================================
-- 3. GET_SALE_INTENT_STATUS (Authenticated Clients / Tenant Enforced)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sale_intent_status(
    p_intent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _checkout, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_is_service_role BOOLEAN := COALESCE((SELECT auth.jwt()->>'role'), '') = 'service_role';
    v_caller_tenant_id UUID;
    v_intent _checkout.sale_intent%ROWTYPE;
    v_sale_number TEXT;
BEGIN
    -- 1. Intent lookup
    SELECT * INTO v_intent
    FROM _checkout.sale_intent
    WHERE id = p_intent_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale intent % not found', p_intent_id USING ERRCODE = 'P0002';
    END IF;

    -- 2. Tenant Ownership Verification (non-service-role)
    IF NOT v_is_service_role THEN
        IF v_auth_uid IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        SELECT tenant_id INTO v_caller_tenant_id
        FROM public.users
        WHERE auth_id = v_auth_uid;

        IF v_caller_tenant_id IS DISTINCT FROM v_intent.tenant_id THEN
            RAISE EXCEPTION 'Access denied: intent belongs to another tenant' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 3. Lazy Expiry Transition
    IF v_intent.intent_status = 'PENDING' AND v_intent.expires_at < now() THEN
        UPDATE _checkout.sale_intent
        SET intent_status = 'EXPIRED',
            updated_at = now()
        WHERE id = v_intent.id;

        UPDATE _checkout.stock_reservations
        SET status = 'RELEASED'
        WHERE intent_id = v_intent.id
          AND status = 'RESERVED';

        v_intent.intent_status := 'EXPIRED';
    END IF;

    -- 4. Sale lookup if settled
    IF v_intent.sale_id IS NOT NULL THEN
        SELECT sale_number INTO v_sale_number
        FROM public.sales
        WHERE id = v_intent.sale_id;
    END IF;

    RETURN jsonb_build_object(
        'intent_id', v_intent.id,
        'status', v_intent.intent_status,
        'store_id', v_intent.store_id,
        'subtotal', v_intent.subtotal,
        'discount_amount', v_intent.discount_amount,
        'total_amount', v_intent.total_amount,
        'currency', v_intent.currency,
        'gateway_transaction_id', v_intent.gateway_transaction_id,
        'sale_id', v_intent.sale_id,
        'sale_number', v_sale_number,
        'expires_at', v_intent.expires_at,
        'settled_at', v_intent.settled_at,
        'created_at', v_intent.created_at
    );
END;
$$;

-- Exact Grant Matrix for get_sale_intent_status
REVOKE ALL ON FUNCTION public.get_sale_intent_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sale_intent_status(UUID) TO authenticated, service_role;


-- ============================================================================
-- 4. SETTLE_CARD_SALE_IPN (Strictly service_role / Atomic 8-Step Settlement)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.settle_card_sale_ipn(
    p_gateway_transaction_id TEXT,
    p_val_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'BDT',
    p_store_id UUID DEFAULT NULL,
    p_gateway_payment_method TEXT DEFAULT 'CARD',
    p_gateway_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _checkout, pg_temp
AS $$
DECLARE
    v_intent _checkout.sale_intent%ROWTYPE;
    v_res RECORD;
    v_item RECORD;
    v_sale_id UUID;
    v_sale_number TEXT;
    v_batch_id UUID;
    v_card_pm_id UUID;
    v_payment_account_id UUID;
    v_revenue_account_id UUID;
    v_cogs_account_id UUID;
    v_inventory_account_id UUID;
    v_cogs_total NUMERIC(12,2) := 0;
    v_posting_result JSONB;
BEGIN
    -- STEP 1: Lock intent, stock rows, and reservations (FOR UPDATE)
    SELECT * INTO v_intent
    FROM _checkout.sale_intent
    WHERE gateway_transaction_id = p_gateway_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale intent with gateway_transaction_id % not found',
            p_gateway_transaction_id USING ERRCODE = 'P0002';
    END IF;

    -- Lock reservations deterministically
    PERFORM 1
    FROM _checkout.stock_reservations
    WHERE intent_id = v_intent.id
    ORDER BY item_id ASC
    FOR UPDATE;

    -- Lock stock levels deterministically
    PERFORM 1
    FROM public.stock_levels sl
    WHERE sl.store_id = v_intent.store_id
      AND sl.item_id IN (
          SELECT item_id FROM _checkout.stock_reservations WHERE intent_id = v_intent.id
      )
    ORDER BY sl.item_id ASC
    FOR UPDATE;

    -- STEP 2: Check idempotency on gateway_transaction_id
    IF v_intent.intent_status = 'SETTLED' THEN
        SELECT sale_number INTO v_sale_number
        FROM public.sales
        WHERE id = v_intent.sale_id;

        RETURN jsonb_build_object(
            'status', 'ALREADY_SETTLED',
            'intent_id', v_intent.id,
            'sale_id', v_intent.sale_id,
            'sale_number', v_sale_number,
            'gateway_transaction_id', v_intent.gateway_transaction_id,
            'total_amount', v_intent.total_amount,
            'settled_at', v_intent.settled_at,
            'message', 'Card sale already settled'
        );
    END IF;

    IF v_intent.intent_status IN ('FAILED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Cannot settle intent in status %', v_intent.intent_status USING ERRCODE = '55000';
    END IF;

    -- STEP 3: Validate amount, currency, store, reservation expiry
    IF ROUND(v_intent.total_amount, 2) IS DISTINCT FROM ROUND(p_amount, 2) THEN
        RAISE EXCEPTION 'Amount mismatch: intent expects %, gateway provided %',
            v_intent.total_amount, p_amount USING ERRCODE = '22000';
    END IF;

    IF UPPER(v_intent.currency) IS DISTINCT FROM UPPER(p_currency) THEN
        RAISE EXCEPTION 'Currency mismatch: intent expects %, gateway provided %',
            v_intent.currency, p_currency USING ERRCODE = '22000';
    END IF;

    IF p_store_id IS NOT NULL AND v_intent.store_id IS DISTINCT FROM p_store_id THEN
        RAISE EXCEPTION 'Store mismatch: intent store % does not match gateway store %',
            v_intent.store_id, p_store_id USING ERRCODE = '22000';
    END IF;

    IF v_intent.expires_at < now() THEN
        UPDATE _checkout.sale_intent
        SET intent_status = 'EXPIRED',
            updated_at = now()
        WHERE id = v_intent.id;

        UPDATE _checkout.stock_reservations
        SET status = 'RELEASED'
        WHERE intent_id = v_intent.id;

        RAISE EXCEPTION 'Sale intent % has expired at %', v_intent.id, v_intent.expires_at USING ERRCODE = '55000';
    END IF;

    -- STEP 4: Consume reservations and generate sale
    UPDATE _checkout.stock_reservations
    SET status = 'CONSUMED'
    WHERE intent_id = v_intent.id;

    -- Decrement stock for consumed reservations
    FOR v_res IN
        SELECT item_id, reserved_qty
        FROM _checkout.stock_reservations
        WHERE intent_id = v_intent.id
    LOOP
        UPDATE public.stock_levels
        SET qty = qty - v_res.reserved_qty
        WHERE store_id = v_intent.store_id
          AND item_id = v_res.item_id;

        INSERT INTO public.stock_movements (
            store_id,
            item_id,
            delta,
            movement_type,
            reference_note,
            created_by
        ) VALUES (
            v_intent.store_id,
            v_res.item_id,
            -v_res.reserved_qty,
            'sale',
            'Card Settlement: ' || p_gateway_transaction_id,
            v_intent.cashier_id
        );
    END LOOP;

    -- Insert sale record
    INSERT INTO public.sales (
        store_id,
        cashier_id,
        session_id,
        status,
        subtotal,
        discount_amount,
        total_amount,
        amount_tendered,
        change_due,
        payment_method,
        payment_meta,
        client_transaction_id,
        notes,
        accounting_posting_status
    ) VALUES (
        v_intent.store_id,
        v_intent.cashier_id,
        v_intent.session_id,
        'completed',
        v_intent.subtotal,
        v_intent.discount_amount,
        v_intent.total_amount,
        v_intent.total_amount,
        0,
        COALESCE(p_gateway_payment_method, 'Card'),
        jsonb_build_object(
            'gateway_transaction_id', p_gateway_transaction_id,
            'val_id', p_val_id,
            'gateway_payment_method', p_gateway_payment_method,
            'gateway_payload', p_gateway_payload
        ),
        COALESCE(v_intent.client_transaction_id, p_gateway_transaction_id),
        COALESCE(v_intent.notes, 'Card settlement via IPN'),
        'PENDING_POSTING'
    )
    RETURNING id, sale_number INTO v_sale_id, v_sale_number;

    -- Insert sale items from intent snapshot
    FOR v_item IN
        SELECT * FROM jsonb_to_recordset(v_intent.items) AS x(
            item_id UUID,
            qty INTEGER,
            quantity INTEGER,
            unit_price NUMERIC,
            price NUMERIC,
            cost NUMERIC,
            discount NUMERIC,
            line_total NUMERIC
        )
    LOOP
        DECLARE
            v_item_qty INTEGER := COALESCE(v_item.qty, v_item.quantity);
            v_item_price NUMERIC := COALESCE(v_item.price, v_item.unit_price);
            v_item_cost NUMERIC := COALESCE(v_item.cost, 0);
            v_item_line_total NUMERIC := COALESCE(v_item.line_total, ROUND(v_item_price * v_item_qty, 2));
        BEGIN
            v_cogs_total := v_cogs_total + (v_item_cost * v_item_qty);

            INSERT INTO public.sale_items (
                sale_id,
                item_id,
                qty,
                price,
                cost,
                line_total
            ) VALUES (
                v_sale_id,
                v_item.item_id,
                v_item_qty,
                v_item_price,
                v_item_cost,
                v_item_line_total
            );
        END;
    END LOOP;

    -- STEP 5: Link/update payments row as 'completed' (prevent duplicate payment inserts)
    SELECT id INTO v_card_pm_id
    FROM public.payment_methods
    WHERE store_id = v_intent.store_id
      AND type = 'card'
      AND is_active = true
    ORDER BY sort_order ASC
    LIMIT 1;

    IF v_card_pm_id IS NULL THEN
        -- Fallback to any active payment method for this store
        SELECT id INTO v_card_pm_id
        FROM public.payment_methods
        WHERE store_id = v_intent.store_id
          AND is_active = true
        ORDER BY sort_order ASC
        LIMIT 1;
    END IF;

    IF v_card_pm_id IS NOT NULL THEN
        INSERT INTO public.sale_payments (
            sale_id,
            payment_method_id,
            amount,
            reference
        )
        SELECT v_sale_id, v_card_pm_id, v_intent.total_amount, p_gateway_transaction_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.sale_payments
            WHERE sale_id = v_sale_id
              AND reference = p_gateway_transaction_id
        );
    END IF;

    -- STEP 6: Post balanced ledger batch
    -- Try canonical post_sale_to_ledger first; if not posted, perform direct balanced posting
    BEGIN
        v_posting_result := public.post_sale_to_ledger(v_sale_id);
        IF v_posting_result->>'status' = 'POSTED' THEN
            v_batch_id := (v_posting_result->>'ledger_batch_id')::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_batch_id := NULL;
    END;

    IF v_batch_id IS NULL THEN
        -- Direct balanced posting fallback
        INSERT INTO public.ledger_batches (
            store_id,
            source_type,
            source_id,
            source_ref,
            status,
            override_used,
            risk_flag,
            created_by
        ) VALUES (
            v_intent.store_id,
            'sale',
            v_sale_id,
            p_gateway_transaction_id,
            'POSTED',
            false,
            false,
            v_intent.cashier_id
        )
        RETURNING id INTO v_batch_id;

        -- Resolve accounts
        IF v_card_pm_id IS NOT NULL THEN
            v_payment_account_id := public.resolve_payment_ledger_account(v_intent.store_id, v_card_pm_id);
        END IF;

        IF v_payment_account_id IS NULL THEN
            SELECT id INTO v_payment_account_id
            FROM public.ledger_accounts
            WHERE store_id = v_intent.store_id
              AND code IN ('1010_BANK', '1000_CASH')
            ORDER BY code ASC
            LIMIT 1;
        END IF;

        SELECT id INTO v_revenue_account_id
        FROM public.ledger_accounts
        WHERE store_id = v_intent.store_id
          AND code = '4000_SALES_REVENUE'
        LIMIT 1;

        SELECT id INTO v_cogs_account_id
        FROM public.ledger_accounts
        WHERE store_id = v_intent.store_id
          AND code = '5000_COGS'
        LIMIT 1;

        SELECT id INTO v_inventory_account_id
        FROM public.ledger_accounts
        WHERE store_id = v_intent.store_id
          AND code = '1200_INVENTORY'
        LIMIT 1;

        -- Dr Card/Bank (Cash Asset)
        IF v_payment_account_id IS NOT NULL THEN
            INSERT INTO public.ledger_entries (
                batch_id, account_id, sale_id, line_ref, debit, credit, annotation
            ) VALUES (
                v_batch_id, v_payment_account_id, v_sale_id, 'card_payment',
                v_intent.total_amount, 0,
                jsonb_build_object('gateway_transaction_id', p_gateway_transaction_id, 'val_id', p_val_id)
            );
        END IF;

        -- Cr Revenue
        IF v_revenue_account_id IS NOT NULL THEN
            INSERT INTO public.ledger_entries (
                batch_id, account_id, sale_id, line_ref, debit, credit, annotation
            ) VALUES (
                v_batch_id, v_revenue_account_id, v_sale_id, 'gross_revenue',
                0, v_intent.total_amount,
                jsonb_build_object('sale_id', v_sale_id)
            );
        END IF;

        -- Optional COGS & Inventory entries if configured
        IF v_cogs_account_id IS NOT NULL AND v_inventory_account_id IS NOT NULL AND v_cogs_total > 0 THEN
            INSERT INTO public.ledger_entries (
                batch_id, account_id, sale_id, line_ref, debit, credit, annotation
            ) VALUES (
                v_batch_id, v_cogs_account_id, v_sale_id, 'cogs',
                v_cogs_total, 0,
                jsonb_build_object('source', 'sale_items.cost')
            );

            INSERT INTO public.ledger_entries (
                batch_id, account_id, sale_id, line_ref, debit, credit, annotation
            ) VALUES (
                v_batch_id, v_inventory_account_id, v_sale_id, 'inventory_reduction',
                0, v_cogs_total,
                jsonb_build_object('source', 'sale_items.cost')
            );
        END IF;

        -- Link batch to sale
        UPDATE public.sales
        SET ledger_batch_id = v_batch_id,
            accounting_posting_status = 'POSTED',
            accounting_posted_at = now()
        WHERE id = v_sale_id;
    END IF;

    -- STEP 7: Complete intent
    UPDATE _checkout.sale_intent
    SET intent_status = 'SETTLED',
        sale_id = v_sale_id,
        gateway_val_id = p_val_id,
        gateway_payment_method = p_gateway_payment_method,
        gateway_payload = p_gateway_payload,
        settled_at = now(),
        updated_at = now()
    WHERE id = v_intent.id;

    -- STEP 8: Commit transaction & return settlement receipt
    RETURN jsonb_build_object(
        'status', 'SETTLED',
        'intent_id', v_intent.id,
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'gateway_transaction_id', p_gateway_transaction_id,
        'total_amount', v_intent.total_amount,
        'ledger_batch_id', v_batch_id,
        'settled_at', now()
    );
END;
$$;

-- Exact Grant Matrix for settle_card_sale_ipn: Strictly service_role
REVOKE ALL ON FUNCTION public.settle_card_sale_ipn(TEXT, TEXT, NUMERIC, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_card_sale_ipn(TEXT, TEXT, NUMERIC, TEXT, UUID, TEXT, JSONB) TO service_role;
