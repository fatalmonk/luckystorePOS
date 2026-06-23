--
-- PostgreSQL database dump
--

\restrict DpO9zNW0y1KIYjzLKN2TaWWopBxW72jdZixL7HksrplqNMgmYc5NrvWbVOxSTc1

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: discount_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed'
);


--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movement_type AS ENUM (
    'sale',
    'purchase',
    'adjustment',
    'return',
    'damage',
    'transfer',
    'manual',
    'sync_repair'
);


--
-- Name: other_income_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.other_income_category AS ENUM (
    'Display Fee',
    'Delivery',
    'Miscellaneous'
);


--
-- Name: other_income_payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.other_income_payment_method AS ENUM (
    'Cash',
    'bKash',
    'Bank'
);


--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type AS ENUM (
    'cash',
    'mobile_banking',
    'card',
    'other'
);


--
-- Name: po_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
);


--
-- Name: reconciliation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliation_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: reference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reference_type AS ENUM (
    'sale',
    'purchase',
    'expense',
    'adjustment',
    'system',
    'sync'
);


--
-- Name: sale_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_status AS ENUM (
    'completed',
    'voided',
    'refunded'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: social_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_platform AS ENUM (
    'facebook',
    'instagram'
);


--
-- Name: stock_transfer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_transfer_status AS ENUM (
    'pending',
    'in_transit',
    'completed',
    'cancelled'
);


--
-- Name: add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_batch_and_adjust_stock(p_store_id uuid, p_item_id uuid, p_batch_number text, p_qty integer, p_expires_at date DEFAULT NULL::date, p_manufactured_at date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_po_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_batch_id uuid;
  v_user_id  uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_qty <= 0 THEN RAISE EXCEPTION 'Batch quantity must be positive'; END IF;

  -- Create batch record
  INSERT INTO public.item_batches (item_id, store_id, batch_number, qty, expires_at, manufactured_at, notes, po_id)
  VALUES (p_item_id, p_store_id, p_batch_number, p_qty, p_expires_at, p_manufactured_at, p_notes, p_po_id)
  RETURNING id INTO v_batch_id;

  -- Increment stock levels via existing RPC
  PERFORM public.adjust_stock(
    p_store_id,
    p_item_id,
    p_qty,
    'received',
    'Batch received: ' || p_batch_number,
    v_user_id
  );

  RETURN v_batch_id;
END;
$$;


--
-- Name: add_followup_note(uuid, uuid, uuid, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_followup_note(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_note_text text, p_promise_date date DEFAULT NULL::date) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO followup_notes (tenant_id, store_id, party_id, note_text, promise_to_pay_date, created_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_note_text, p_promise_date, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


--
-- Name: adjust_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_quantity_delta integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_allow_negative boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.stores s ON s.id = u.store_id
        WHERE u.auth_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        -- Create it (default 0)
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    -- Check negative constraints
    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- Update the stock level
    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Insert authoritative ledger entry
    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;


--
-- Name: adjust_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_quantity_delta integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_allow_negative boolean DEFAULT false, p_operation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency check
    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.stores s ON s.id = u.store_id
        WHERE u.auth_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;


--
-- Name: adjust_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, boolean, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_quantity_delta integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_allow_negative boolean DEFAULT false, p_operation_id uuid DEFAULT NULL::uuid, p_expected_quantity integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency check
    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.stores s ON s.id = u.store_id
        WHERE u.auth_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    -- Conflict detection
    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;


--
-- Name: adjust_stock(uuid, uuid, integer, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_stock(p_store_id uuid, p_item_id uuid, p_delta integer, p_reason text, p_notes text DEFAULT NULL::text, p_performed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_new_qty integer;
  v_movement_id uuid;
BEGIN
  -- Validate reason
  IF p_reason NOT IN (
    'received', 'damaged', 'lost', 'correction',
    'returned', 'transfer_in', 'transfer_out',
    'sale', 'import', 'expired', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid adjustment reason: %', p_reason;
  END IF;

  -- Validate delta is not zero
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment quantity cannot be zero';
  END IF;

  -- Upsert stock level
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, GREATEST(0, p_delta))
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = GREATEST(0, public.stock_levels.qty + p_delta);

  -- Get the new quantity
  SELECT qty INTO v_new_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  -- Write movement record
  INSERT INTO public.stock_movements (store_id, item_id, delta, reason, meta, performed_by)
  VALUES (
    p_store_id,
    p_item_id,
    p_delta,
    p_reason,
    jsonb_build_object(
      'notes', COALESCE(p_notes, ''),
      'source', 'manual_adjustment',
      'new_qty', v_new_qty
    ),
    p_performed_by
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'new_qty', v_new_qty,
    'delta', p_delta,
    'reason', p_reason
  );
END;
$$;


--
-- Name: approve_inventory_reconciliation(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_inventory_reconciliation(p_reconciliation_id uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_recon public.inventory_reconciliations%ROWTYPE;
    v_user_id UUID := auth.uid();
    v_movement_id UUID;
    v_movement_type movement_type;
BEGIN
    SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_recon
    FROM public.inventory_reconciliations
    WHERE id = p_reconciliation_id
    FOR UPDATE;

    IF v_recon.id IS NULL THEN
        RAISE EXCEPTION 'Reconciliation not found';
    END IF;

    IF v_recon.status <> 'pending' THEN
        RAISE EXCEPTION 'Reconciliation is already %', v_recon.status;
    END IF;

    UPDATE public.inventory_reconciliations
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now()
    WHERE id = p_reconciliation_id;

    IF v_recon.difference <> 0 THEN
        v_movement_type := CASE WHEN v_recon.difference > 0 THEN 'adjustment'::movement_type ELSE 'damage'::movement_type END;
        
        PERFORM public.adjust_inventory_stock(
            v_recon.tenant_id,
            v_recon.store_id,
            v_recon.product_id,
            v_recon.difference,
            'adjustment'::movement_type,
            'adjustment'::reference_type,
            v_recon.id,
            COALESCE(p_notes, v_recon.notes, 'Reconciliation adjustment'),
            TRUE,
            v_recon.id 
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', p_reconciliation_id,
        'difference', v_recon.difference
    );
END;
$$;


--
-- Name: authenticate_staff_pin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.authenticate_staff_pin(p_pin text) RETURNS TABLE(id uuid, auth_id uuid, full_name text, role text, store_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.auth_id,
    COALESCE(u.full_name, 'User') AS full_name,
    u.role,
    u.store_id
  FROM public.users u
  WHERE u.role IN ('cashier', 'manager', 'admin')
    AND (
      -- Preferred secure storage
      (u.pos_pin_hash IS NOT NULL AND extensions.crypt(p_pin, u.pos_pin_hash) = u.pos_pin_hash)
      -- Backward compatibility while old rows are still migrating
      OR (u.pos_pin_hash IS NULL AND u.pos_pin = p_pin)
    )
  LIMIT 1;
END;
$$;


--
-- Name: FUNCTION authenticate_staff_pin(p_pin text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.authenticate_staff_pin(p_pin text) IS 'Server-authoritative PIN authentication for POS staff roles.';


--
-- Name: check_idempotency(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_idempotency(p_key text, p_tenant_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
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
$$;


--
-- Name: check_ledger_batch_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ledger_batch_balance() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_balance numeric(14,2);
BEGIN
  SELECT SUM(debit) - SUM(credit) INTO v_balance
  FROM public.ledger_entries
  WHERE batch_id = NEW.batch_id;

  IF v_balance <> 0 THEN
    RAISE EXCEPTION 'Ledger batch % is out of balance by %', NEW.batch_id, v_balance;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_price_alerts(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_price_alerts(p_store_id uuid, p_threshold numeric DEFAULT 0.15) RETURNS TABLE(product_id uuid, product_name text, our_price numeric, market_avg_price numeric, price_gap_percent numeric, competitors jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH latest_competitor_prices AS (
        SELECT DISTINCT ON (item_id, competitor_name)
            item_id AS product_id,
            competitor_name,
            competitor_price
        FROM public.competitor_prices
        WHERE store_id = p_store_id
        AND scraped_at > NOW() - INTERVAL '24 hours'
        AND scrape_status = 'success'
        ORDER BY item_id, competitor_name, scraped_at DESC
    ),
    market_averages AS (
        SELECT 
            product_id,
            AVG(competitor_price) AS avg_price,
            jsonb_object_agg(competitor_name, competitor_price) AS competitor_prices
        FROM latest_competitor_prices
        GROUP BY product_id
    )
    SELECT 
        i.id AS product_id,
        i.name AS product_name,
        i.price AS our_price,
        ROUND(ma.avg_price::numeric, 2) AS market_avg_price,
        ROUND(((i.price - ma.avg_price) / ma.avg_price)::numeric, 4) AS price_gap_percent,
        ma.competitor_prices AS competitors
    FROM public.items i
    JOIN market_averages ma ON ma.product_id = i.id
    WHERE i.store_id = p_store_id
    AND i.price > ma.avg_price * (1 + p_threshold)
    ORDER BY price_gap_percent DESC;
END;
$$;


--
-- Name: check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_sec integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_entry       public.rate_limits%ROWTYPE;
  v_now         timestamptz := now();
  v_allowed     boolean;
  v_remaining   integer;
  v_reset_after integer;
BEGIN
  -- Validate input parameters
  IF p_key IS NULL OR p_key = '' THEN
    RAISE EXCEPTION 'key cannot be null or empty' USING ERRCODE = 'P0001';
  END IF;
  
  IF p_max IS NULL OR p_max <= 0 THEN
    RAISE EXCEPTION 'max must be a positive integer' USING ERRCODE = 'P0001';
  END IF;
  
  IF p_window_sec IS NULL OR p_window_sec <= 0 THEN
    RAISE EXCEPTION 'window_sec must be a positive integer' USING ERRCODE = 'P0001';
  END IF;

  -- Try to read existing entry
  SELECT * INTO v_entry FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND OR v_now > v_entry.reset_at THEN
    -- First request or window expired: upsert with fresh window
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_sec || ' seconds')::interval)
    ON CONFLICT (key) DO UPDATE
      SET count = 1, reset_at = v_now + (p_window_sec || ' seconds')::interval;
    v_allowed     := true;
    v_remaining   := p_max - 1;
    v_reset_after := p_window_sec;
  ELSIF v_entry.count >= p_max THEN
    -- Limit exceeded
    v_allowed     := false;
    v_remaining   := 0;
    v_reset_after := extract(epoch FROM (v_entry.reset_at - v_now))::integer;
  ELSE
    -- Increment count
    UPDATE public.rate_limits
      SET count = count + 1
      WHERE key = p_key;
    v_allowed     := true;
    v_remaining   := p_max - v_entry.count - 1;
    v_reset_after := extract(epoch FROM (v_entry.reset_at - v_now))::integer;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_after_seconds', v_reset_after
  );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ledger_posting_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_posting_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    store_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 8 NOT NULL,
    locked_by text,
    locked_at timestamp with time zone,
    lock_expires_at timestamp with time zone,
    priority integer DEFAULT 100 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_posting_queue_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT ledger_posting_queue_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT ledger_posting_queue_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'CLAIMED'::text, 'POSTED'::text, 'FAILED'::text])))
);


--
-- Name: claim_ledger_posting_jobs(text, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_ledger_posting_jobs(p_worker_id text, p_batch_size integer DEFAULT 10, p_store_id uuid DEFAULT NULL::uuid) RETURNS SETOF public.ledger_posting_queue
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF public.is_ledger_worker_alive(p_worker_id, interval '2 minutes') IS NOT TRUE THEN
    RAISE EXCEPTION 'worker not active or stale: %', p_worker_id;
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT q.id
    FROM public.ledger_posting_queue q
    WHERE q.status = 'PENDING'
      AND q.attempt_count < q.max_attempts
      AND q.next_retry_at <= now()
      AND (q.lock_expires_at IS NULL OR q.lock_expires_at < now())
      AND (p_store_id IS NULL OR q.store_id = p_store_id)
    ORDER BY q.priority DESC, q.created_at
    LIMIT GREATEST(1, COALESCE(p_batch_size, 1))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ledger_posting_queue q
  SET status = 'CLAIMED',
      locked_by = p_worker_id,
      locked_at = now(),
      lock_expires_at = now() + interval '2 minutes',
      updated_at = now()
  FROM claimable c
  WHERE q.id = c.id
  RETURNING q.*;
END;
$$;


--
-- Name: cleanup_old_competitor_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_competitor_prices() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
    delete from public.competitor_prices
    where scraped_at < now() - interval '90 days';
end;
$$;


--
-- Name: cleanup_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_rate_limits() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  WITH deleted AS (
    DELETE FROM public.rate_limits WHERE reset_at < now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;


--
-- Name: close_accounting_period(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_accounting_period(p_store_id uuid, p_period_start date, p_period_end date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_user record;
  v_tb jsonb;
BEGIN
  SELECT id, role INTO v_user
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user.id IS NULL OR v_user.role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Manager/Admin required');
  END IF;

  v_tb := public.validate_trial_balance(p_store_id, p_period_start, p_period_end);
  IF COALESCE((v_tb->>'is_balanced')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Trial balance mismatch; cannot close period',
      'trial_balance', v_tb
    );
  END IF;

  INSERT INTO public.accounting_periods(
    store_id, period_start, period_end, status, closed_at, closed_by
  )
  VALUES (
    p_store_id, p_period_start, p_period_end, 'CLOSED', now(), v_user.id
  )
  ON CONFLICT (store_id, period_start, period_end)
  DO UPDATE SET
    status = 'CLOSED',
    closed_at = EXCLUDED.closed_at,
    closed_by = EXCLUDED.closed_by;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'trial_balance', v_tb
  );
END;
$$;


--
-- Name: close_pos_session(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_pos_session(p_session_id uuid, p_closing_cash numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_session public.pos_sessions;
  v_expected numeric;
  v_difference numeric;
BEGIN
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
  
  IF v_session.status = 'closed' THEN
    RAISE EXCEPTION 'Session is already closed.';
  END IF;

  -- Get expected drawer from same logic
  SELECT (get_session_summary(p_session_id)->>'expected_drawer')::numeric INTO v_expected;
  
  v_difference := p_closing_cash - v_expected;

  -- Here we can enforce strict validation if we wanted to prevent closing on discrepancy,
  -- but generally POS allows closing with discrepancy and logs it.
  
  UPDATE public.pos_sessions
  SET 
    status = 'closed',
    closed_at = now(),
    closing_cash = p_closing_cash,
    total_sales = (get_session_summary(p_session_id)->>'total_cash_sales')::numeric
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'expected', v_expected,
    'actual', p_closing_cash,
    'difference', v_difference
  );
END;
$$;


--
-- Name: close_session_with_reconciliation(uuid, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_session_with_reconciliation(p_session_id uuid, p_actual_cash numeric, p_variance numeric, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION close_session_with_reconciliation(p_session_id uuid, p_actual_cash numeric, p_variance numeric, p_notes text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.close_session_with_reconciliation(p_session_id uuid, p_actual_cash numeric, p_variance numeric, p_notes text) IS 'Closes POS session with variance tracking. Returns variance details including whether threshold (50 Taka) was exceeded.';


--
-- Name: complete_sale(uuid, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_sale(p_session_id uuid, p_items jsonb, p_payment_method_id uuid, p_sale_type text DEFAULT 'regular'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Implementation would go here - this is placeholder
    v_result := jsonb_build_object(
        'success', true,
        'sale_id', gen_random_uuid(),
        'message', 'Sale completed'
    );
    RETURN v_result;
END;
$$;


--
-- Name: complete_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_sale(p_store_id uuid, p_cashier_id uuid, p_session_id uuid DEFAULT NULL::uuid, p_items jsonb DEFAULT '[]'::jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT 0, p_client_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_snapshot jsonb DEFAULT NULL::jsonb, p_fulfillment_policy text DEFAULT 'STRICT'::text, p_override_token text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: complete_sale_v2(uuid, uuid, uuid, jsonb, jsonb, numeric, numeric, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_sale_v2(p_store_id uuid, p_cashier_id uuid, p_customer_id uuid DEFAULT NULL::uuid, p_items jsonb DEFAULT '[]'::jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_total numeric DEFAULT 0, p_discount numeric DEFAULT 0, p_offline_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_operation_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_sale_id uuid;
    v_item jsonb;
    v_payment jsonb;
BEGIN
    -- 1) Idempotency Check
    IF p_operation_id IS NOT NULL THEN
        SELECT id INTO v_sale_id FROM public.sales WHERE operation_id = p_operation_id;
        IF FOUND THEN
            RETURN jsonb_build_object('status', 'SUCCESS', 'sale_id', v_sale_id, 'is_duplicate', true);
        END IF;
    END IF;

    -- 2) Insert Sale
    INSERT INTO public.sales (
        store_id, 
        cashier_id, 
        customer_id, 
        total, 
        discount, 
        status, 
        offline_created_at, 
        synced_at,
        operation_id
    ) VALUES (
        p_store_id, 
        p_cashier_id, 
        p_customer_id, 
        p_total, 
        p_discount, 
        'completed', 
        COALESCE(p_offline_created_at, now()), 
        now(),
        p_operation_id
    ) RETURNING id INTO v_sale_id;

    -- 3) Insert Sale Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.sale_items (
            sale_id, 
            product_id, 
            qty, 
            unit_price, 
            discount
        ) VALUES (
            v_sale_id, 
            (v_item->>'product_id')::uuid, 
            (v_item->>'qty')::integer, 
            (v_item->>'unit_price')::numeric, 
            COALESCE((v_item->>'discount')::numeric, 0)
        );
        
        -- Deduct stock
        UPDATE public.products 
        SET stock_qty = stock_qty - (v_item->>'qty')::integer 
        WHERE id = (v_item->>'product_id')::uuid;
    END LOOP;

    -- 4) Insert Payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (
            sale_id, 
            method, 
            amount, 
            reference
        ) VALUES (
            v_sale_id, 
            (v_payment->>'method')::text, 
            (v_payment->>'amount')::numeric, 
            (v_payment->>'reference')::text
        );
    END LOOP;

    RETURN jsonb_build_object('status', 'SUCCESS', 'sale_id', v_sale_id);
END;
$$;


--
-- Name: create_order_with_stock(text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_order_with_stock(p_order_number text, p_tenant_id uuid, p_store_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_item jsonb;
  v_id uuid;
  v_qty int;
  v_stock int;
  v_result jsonb;
begin
  -- Validate stock for all items first (SELECT FOR UPDATE on stock_levels)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    select qty into v_stock 
    from public.stock_levels 
    where item_id = v_id and store_id = p_store_id 
    for update;
    
    if not found then
      raise exception 'Item % not found in stock_levels for store %', v_id, p_store_id;
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for item % (available: %, requested: %)', v_id, v_stock, v_qty;
    end if;
  end loop;

  -- Decrement stock in stock_levels
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    update public.stock_levels 
    set qty = qty - v_qty 
    where item_id = v_id and store_id = p_store_id;
  end loop;

  -- Insert order and capture result
  insert into public.orders (
    order_number, tenant_id, store_id, customer_name, customer_phone, customer_address, notes,
    items, subtotal, delivery_fee, total, payment_method
  ) values (
    p_order_number, p_tenant_id, p_store_id,
    p_customer_name, p_customer_phone, p_customer_address, p_notes,
    p_items, p_subtotal, p_delivery_fee, p_total, 'cod'
  ) returning jsonb_build_object('id', id, 'order_number', order_number)
  into v_result;

  return v_result;
end;
$$;


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    reminder_date date NOT NULL,
    reminder_type text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['payment_due'::text, 'follow_up'::text, 'stock_check'::text, 'other'::text])))
);


--
-- Name: create_reminder(uuid, uuid, text, text, date, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_reminder(p_tenant_id uuid, p_store_id uuid, p_title text, p_description text, p_reminder_date date, p_reminder_type text, p_created_by uuid DEFAULT NULL::uuid) RETURNS public.reminders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    new_row reminders%ROWTYPE;
BEGIN
    INSERT INTO reminders (tenant_id, store_id, title, description, reminder_date, reminder_type, created_by)
    VALUES (p_tenant_id, p_store_id, p_title, p_description, p_reminder_date, p_reminder_type, p_created_by)
    RETURNING * INTO new_row;
    RETURN new_row;
END;
$$;


--
-- Name: create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_sale(p_store_id uuid, p_cashier_id uuid, p_session_id uuid DEFAULT NULL::uuid, p_items jsonb DEFAULT '[]'::jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT 0, p_client_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_snapshot jsonb DEFAULT NULL::jsonb, p_fulfillment_policy text DEFAULT 'STRICT'::text, p_override_token text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_existing record;
  v_item record;
  v_live record;
  v_payment record;
  v_sale_id uuid;
  v_sale_number text;
  v_subtotal numeric(12,2) := 0;
  v_fulfilled_subtotal numeric(12,2) := 0;
  v_backordered_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tendered numeric(12,2) := 0;
  v_change numeric(12,2) := 0;
  v_status text := 'SUCCESS';
  v_adjustments jsonb := '[]'::jsonb;
  v_partial jsonb := '[]'::jsonb;
  v_user_id uuid;
  v_user_role text;
  v_override_row record;
  v_override_required boolean := false;
  v_stock_delta jsonb := '[]'::jsonb;
  v_fulfilled_qty integer;
  v_backordered_qty integer;
  v_line_price numeric(12,2);
  v_line_total numeric(12,2);
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Not authenticated');
  END IF;

  IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'client_transaction_id_required',
      'message', 'client_transaction_id is required',
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due, ledger_batch_id
    INTO v_existing
  FROM public.sales
  WHERE store_id = p_store_id
    AND client_transaction_id = p_client_transaction_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'sale_id', v_existing.id,
      'sale_number', v_existing.sale_number,
      'subtotal', COALESCE(v_existing.subtotal, 0),
      'discount', COALESCE(v_existing.discount_amount, 0),
      'total_amount', COALESCE(v_existing.total_amount, 0),
      'tendered', COALESCE(v_existing.amount_tendered, 0),
      'change_due', COALESCE(v_existing.change_due, 0),
      'ledger_batch_id', v_existing.ledger_batch_id,
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    -- FIXED: i.active → i.is_active AS active, sl.qty_on_hand → sl.qty
    SELECT i.id, i.name, i.is_active AS active, i.price, COALESCE(sl.qty, 0) AS qty_on_hand
      INTO v_live
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.id = v_item.item_id;

    IF v_live.id IS NULL OR v_live.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'deleted_or_inactive_product',
        'message', 'Product deleted/inactive',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    IF ROUND(COALESCE(v_item.unit_price, 0), 2) < ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_override_required := true;
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_increase',
        'snapshot_price', v_item.unit_price,
        'server_price', v_live.price
      );
    ELSIF ROUND(COALESCE(v_item.unit_price, 0), 2) > ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_status := 'ADJUSTED';
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_decrease_auto_adjust',
        'snapshot_price', v_item.unit_price,
        'applied_price', v_live.price
      );
    END IF;

    IF COALESCE(v_live.qty_on_hand, 0) < COALESCE(v_item.qty, 0) THEN
      IF UPPER(COALESCE(p_fulfillment_policy, 'STRICT')) = 'PARTIAL_ALLOWED' THEN
        v_fulfilled_qty := GREATEST(COALESCE(v_live.qty_on_hand, 0), 0);
        v_backordered_qty := GREATEST(COALESCE(v_item.qty, 0) - v_fulfilled_qty, 0);
        v_partial := v_partial || jsonb_build_object(
          'item_id', v_item.item_id,
          'requested_qty', v_item.qty,
          'fulfilled_qty', v_fulfilled_qty,
          'backordered_qty', v_backordered_qty,
          'remaining_stock', GREATEST(COALESCE(v_live.qty_on_hand, 0) - v_fulfilled_qty, 0)
        );
      ELSE
        RETURN jsonb_build_object(
          'status', 'REJECTED',
          'conflict_reason', 'insufficient_stock_strict_policy',
          'message', format('Insufficient stock for %s', v_live.name),
          'adjustments', v_adjustments,
          'partial_fulfillment', v_partial
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_partial) > 0 THEN
    RETURN jsonb_build_object(
      'status', 'PARTIAL_FULFILLMENT',
      'conflict_reason', 'partial_fulfillment_required',
      'message', 'Server computed partial fulfillment proposal',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  IF v_override_required THEN
    IF p_override_token IS NULL OR btrim(p_override_token) = '' THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'override_token_required',
        'message', 'Manager override token required for price increase',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    SELECT *
      INTO v_override_row
    FROM public.pos_override_tokens t
    WHERE t.store_id = p_store_id
      AND t.token_hash = encode(digest(p_override_token, 'sha256'), 'hex')
      AND t.used_at IS NULL
      AND t.expires_at > now()
    LIMIT 1;

    IF v_override_row.id IS NULL OR v_user_role NOT IN ('admin', 'manager') THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'invalid_override_token',
        'message', 'Invalid or expired override token',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    UPDATE public.pos_override_tokens
      SET used_at = now(),
          used_by = v_user_id
    WHERE id = v_override_row.id;
  END IF;

  INSERT INTO public.sales (
    store_id, cashier_id, session_id, status, notes, client_transaction_id,
    accounting_posting_status
  ) VALUES (
    p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id,
    'PENDING_POSTING'
  ) RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT i.price INTO v_live
    FROM public.items i
    WHERE i.id = v_item.item_id;

    v_line_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_live.price, 0));
    v_line_total := ROUND((v_line_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_fulfilled_subtotal := v_fulfilled_subtotal + v_line_total;

    INSERT INTO public.sale_items (
      sale_id, item_id, qty, unit_price, cost, discount, line_total
    ) VALUES (
      v_sale_id,
      v_item.item_id,
      v_item.qty,
      v_line_price,
      COALESCE(v_item.cost, 0),
      COALESCE(v_item.discount, 0),
      v_line_total
    );

    PERFORM public.adjust_stock(
      p_store_id,
      v_item.item_id,
      -v_item.qty,
      'sale',
      'Sale: ' || v_sale_number,
      v_user_id
    );

    v_stock_delta := v_stock_delta || jsonb_build_object(
      'item_id', v_item.item_id,
      'delta_qty', -v_item.qty
    );
  END LOOP;

  v_total := GREATEST(ROUND(v_subtotal - COALESCE(p_discount, 0), 2), 0);

  FOR v_payment IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_payments, '[]'::jsonb)) AS x(
      payment_method_id uuid,
      amount numeric,
      reference text
    )
  LOOP
    v_tendered := v_tendered + COALESCE(v_payment.amount, 0);
    INSERT INTO public.sale_payments(sale_id, payment_method_id, amount, reference)
    VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
  END LOOP;

  IF v_tendered < v_total THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'payment_insufficient',
      'message', 'Payment insufficient',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  v_change := GREATEST(ROUND(v_tendered - v_total, 2), 0);
  UPDATE public.sales
    SET subtotal = v_subtotal,
        fulfilled_subtotal = v_fulfilled_subtotal,
        backordered_subtotal = v_backordered_subtotal,
        discount_amount = COALESCE(p_discount, 0),
        total_amount = v_total,
        amount_tendered = v_tendered,
        change_due = v_change
  WHERE id = v_sale_id;

  INSERT INTO public.sale_audit_log (
    sale_id, client_transaction_id, store_id, operator_user_id, status,
    before_state, after_state, override_used, override_user_id, override_reason, stock_delta
  ) VALUES (
    v_sale_id,
    p_client_transaction_id,
    p_store_id,
    v_user_id,
    v_status,
    jsonb_build_object('snapshot', COALESCE(p_snapshot, '{}'::jsonb)),
    jsonb_build_object(
      'sale_id', v_sale_id,
      'subtotal', v_subtotal,
      'discount', COALESCE(p_discount, 0),
      'total_amount', v_total,
      'tendered', v_tendered,
      'change_due', v_change,
      'accounting_posting_status', 'PENDING_POSTING'
    ),
    v_override_required,
    CASE WHEN v_override_required THEN v_user_id ELSE NULL END,
    p_override_reason,
    v_stock_delta
  );

  RETURN jsonb_build_object(
    'status', v_status,
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'total_amount', v_total,
    'tendered', v_tendered,
    'change_due', v_change,
    'accounting_posting_status', 'PENDING_POSTING',
    'adjustments', v_adjustments,
    'partial_fulfillment', v_partial,
    'conflict_reason', NULL
  );
END;
$$;


--
-- Name: create_stock_transfer(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_stock_transfer(p_from_store_id uuid, p_to_store_id uuid, p_notes text, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_transfer_id uuid;
  v_user_id uuid;
  v_item record;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Source and destination stores must be different';
  END IF;

  -- Create transfer record
  INSERT INTO public.stock_transfers (from_store_id, to_store_id, notes, created_by, updated_by)
  VALUES (p_from_store_id, p_to_store_id, p_notes, v_user_id, v_user_id)
  RETURNING id INTO v_transfer_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id uuid, qty integer) 
  LOOP
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Transfer quantity must be > 0 (item %)', v_item.item_id;
    END IF;

    INSERT INTO public.stock_transfer_items (transfer_id, item_id, qty)
    VALUES (v_transfer_id, v_item.item_id, v_item.qty);
  END LOOP;

  RETURN v_transfer_id;
END;
$$;


--
-- Name: create_store_user(text, text, text, text, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_store_user(p_email text, p_full_name text, p_role text, p_pin text, p_store_id uuid, p_tenant_id uuid, p_auth_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_new_user_id uuid;
BEGIN
    -- Only admin/manager can create users
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Only admins or managers can create users';
    END IF;

    -- Insert the user
    INSERT INTO public.users (id, email, full_name, role, pos_pin, store_id, tenant_id, auth_id)
    VALUES (
        p_auth_id,
        p_email,
        p_full_name,
        p_role,
        p_pin,
        p_store_id,
        p_tenant_id,
        p_auth_id
    )
    RETURNING id INTO v_new_user_id;

    RETURN v_new_user_id;
END;
$$;


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  -- In a real app, extract from auth.jwt()
  -- For local dev/testing without full auth, we can mock or rely on service_role.
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
END;
$$;


--
-- Name: deactivate_ledger_worker(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_ledger_worker(p_worker_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.ledger_workers
  SET active = false,
      updated_at = now()
  WHERE worker_id = p_worker_id;
END;
$$;


--
-- Name: decrement_stock(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_stock(p_store_id uuid, p_item_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.stock_levels
  SET qty = qty - p_quantity
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND qty >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;
END;
$$;


--
-- Name: deduct_stock(uuid, uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Get tenant id
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- NEW LEDGER INTEGRATION
    INSERT INTO public.inventory_movements (
      tenant_id,
      store_id,
      product_id,
      movement_type,
      quantity_delta,
      reference_type,
      reference_id,
      previous_quantity,
      new_quantity,
      notes,
      created_by
    ) VALUES (
      v_tenant_id,
      p_store_id,
      p_product_id,
      'sale',
      -p_quantity,
      'sale',
      (p_metadata->>'sale_id')::uuid,
      v_current_quantity,
      v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;


--
-- Name: deduct_stock(uuid, uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb, p_operation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
  v_existing_movement JSONB;
BEGIN
  -- Idempotency check
  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'stock_level_id', (SELECT id FROM stock_levels WHERE store_id = p_store_id AND item_id = p_product_id),
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true,
          'timestamp', created_at
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;

      IF FOUND THEN
          RETURN v_existing_movement;
      END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
      tenant_id, store_id, product_id,
      movement_type, quantity_delta,
      reference_type, reference_id,
      previous_quantity, new_quantity,
      notes, created_by, operation_id
    ) VALUES (
      v_tenant_id, p_store_id, p_product_id,
      'sale', -p_quantity,
      'sale', (p_metadata->>'sale_id')::uuid,
      v_current_quantity, v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;


--
-- Name: deduct_stock(uuid, uuid, integer, jsonb, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb, p_operation_id uuid DEFAULT NULL::uuid, p_expected_quantity integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
  v_existing_movement JSONB;
BEGIN
  SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;

  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'stock_level_id', (SELECT id FROM stock_levels WHERE store_id = p_store_id AND item_id = p_product_id),
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true,
          'timestamp', created_at
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;

      IF FOUND THEN
          RETURN v_existing_movement;
      END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    -- Conflict detection
    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
      tenant_id, store_id, product_id,
      movement_type, quantity_delta,
      reference_type, reference_id,
      previous_quantity, new_quantity,
      notes, created_by, operation_id
    ) VALUES (
      v_tenant_id, p_store_id, p_product_id,
      'sale', -p_quantity,
      'sale', (p_metadata->>'sale_id')::uuid,
      v_current_quantity, v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;


--
-- Name: delete_ledger_transaction(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_ledger_transaction(p_batch_id uuid, p_party_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_user_store_id UUID;
    v_batch_store_id UUID;
    v_deleted_count INTEGER := 0;
BEGIN
    -- Get the current user's store
    SELECT store_id INTO v_user_store_id
    FROM public.users
    WHERE auth_id = auth.uid();
    
    IF v_user_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User not found');
    END IF;
    
    -- Verify the batch belongs to the user's store
    SELECT store_id INTO v_batch_store_id
    FROM public.ledger_batches
    WHERE id = p_batch_id;
    
    IF v_batch_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Transaction not found');
    END IF;
    
    IF v_batch_store_id != v_user_store_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied');
    END IF;
    
    -- Mark batch as deleted instead of actual delete (immutable ledger)
    UPDATE public.ledger_batches
    SET status = 'DELETED',
        deleted_at = NOW(),
        deleted_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    WHERE id = p_batch_id
    AND store_id = v_user_store_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Recalculate party balance (excluding deleted batches)
    UPDATE public.parties
    SET current_balance = COALESCE((
        SELECT SUM(le.debit_amount - le.credit_amount)
        FROM public.ledger_entries le
        JOIN public.ledger_accounts la ON la.id = le.account_id
        JOIN public.ledger_batches lb ON lb.id = le.batch_id
        WHERE le.party_id = p_party_id
        AND la.code = '1300_ACCOUNTS_RECEIVABLE'
        AND lb.status != 'DELETED'
    ), 0)
    WHERE id = p_party_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'deleted_count', v_deleted_count
    );
END;
$$;


--
-- Name: delete_reminder(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_reminder(p_reminder_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
    DELETE FROM reminders r
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id);

    RETURN FOUND;
END;
$$;


--
-- Name: delete_store_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_store_user(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_updater_role text;
    v_target_role text;
BEGIN
    -- Get updater's role
    SELECT role INTO v_updater_role
    FROM public.users WHERE auth_id = auth.uid();

    -- Only admin/manager can delete
    IF v_updater_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins or managers can delete users';
    END IF;

    -- Get target user's role
    SELECT role INTO v_target_role
    FROM public.users WHERE id = p_user_id;

    -- Only admin can delete admin users
    IF v_target_role = 'admin' AND v_updater_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can delete admin users';
    END IF;

    -- Prevent self-deletion
    IF p_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()) THEN
        RAISE EXCEPTION 'Cannot delete yourself';
    END IF;

    DELETE FROM public.users WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;


--
-- Name: enqueue_sale_for_ledger_posting(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_sale_for_ledger_posting(p_sale_id uuid, p_store_id uuid, p_priority integer DEFAULT 100) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_queue_id uuid;
BEGIN
  INSERT INTO public.ledger_posting_queue (
    sale_id, store_id, status, priority, attempt_count, max_attempts, last_error
  )
  VALUES (
    p_sale_id, p_store_id, 'PENDING', COALESCE(p_priority, 100), 0, 8, NULL
  )
  ON CONFLICT (sale_id)
  DO UPDATE SET
    store_id = EXCLUDED.store_id,
    priority = EXCLUDED.priority,
    status = CASE
      WHEN public.ledger_posting_queue.status = 'POSTED' THEN 'POSTED'
      ELSE 'PENDING'
    END,
    locked_by = CASE
      WHEN public.ledger_posting_queue.status = 'POSTED' THEN public.ledger_posting_queue.locked_by
      ELSE NULL
    END,
    locked_at = CASE
      WHEN public.ledger_posting_queue.status = 'POSTED' THEN public.ledger_posting_queue.locked_at
      ELSE NULL
    END,
    lock_expires_at = CASE
      WHEN public.ledger_posting_queue.status = 'POSTED' THEN public.ledger_posting_queue.lock_expires_at
      ELSE NULL
    END,
    last_error = CASE
      WHEN public.ledger_posting_queue.status = 'POSTED' THEN public.ledger_posting_queue.last_error
      ELSE NULL
    END,
    updated_at = now()
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;


--
-- Name: enqueue_sale_for_ledger_posting_from_sales(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_sale_for_ledger_posting_from_sales() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF NEW.accounting_posting_status = 'PENDING_POSTING' THEN
    PERFORM public.enqueue_sale_for_ledger_posting(NEW.id, NEW.store_id, 100);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_expense_ledger_accounts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_expense_ledger_accounts(p_store_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '6000_CAPEX', 'Capital Expenditure', 'ASSET', true), -- CapEx is an asset until depreciated
    (p_store_id, '5200_UTILITIES', 'Utility Expenses', 'EXPENSE', true),
    (p_store_id, '5300_TRANSPORT', 'Transport & Conveyance', 'EXPENSE', true),
    (p_store_id, '5400_SALARY', 'Staff salary', 'EXPENSE', true),
    (p_store_id, '5500_MISC', 'All Other Expenses', 'EXPENSE', true),
    (p_store_id, '3100_PARTNERS_TAKE', 'Partners Take', 'EQUITY', true) -- Equity draw
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;


--
-- Name: ensure_sale_ledger_accounts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_sale_ledger_accounts(p_store_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '1000_CASH', 'Cash on Hand', 'ASSET', true),
    (p_store_id, '1010_BANK', 'Bank / Mobile Settlement', 'ASSET', true),
    (p_store_id, '4000_SALES_REVENUE', 'Sales Revenue (Gross)', 'REVENUE', true),
    (p_store_id, '5000_COGS', 'Cost of Goods Sold', 'EXPENSE', true),
    (p_store_id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true),
    (p_store_id, '5100_DISCOUNT_ABSORPTION', 'Discount Absorption (MRP delta)', 'EXPENSE', true)
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;


--
-- Name: generate_daily_reconciliation(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_daily_reconciliation(p_store_id uuid, p_date date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_start timestamptz := (p_date::timestamptz);
  v_end timestamptz := ((p_date + 1)::timestamptz);
  v_total_sales numeric(14,2) := 0;
  v_total_cash_inflow numeric(14,2) := 0;
  v_inventory_delta_value numeric(14,2) := 0;
  v_expected_inventory_delta numeric(14,2) := 0;
  v_mismatch jsonb := '[]'::jsonb;
  v_risk_overrides integer := 0;
BEGIN
  SELECT COALESCE(SUM(s.total_amount), 0)
    INTO v_total_sales
  FROM public.sales s
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.debit), 0)
    INTO v_total_cash_inflow
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code IN ('1000_CASH', '1010_BANK');

  SELECT COALESCE(SUM(si.qty * si.cost), 0)
    INTO v_expected_inventory_delta
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.credit), 0)
    INTO v_inventory_delta_value
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code = '1200_INVENTORY';

  SELECT COUNT(*)
    INTO v_risk_overrides
  FROM public.ledger_batches lb
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND lb.risk_flag = true;

  IF ROUND(v_total_sales, 2) <> ROUND(v_total_cash_inflow, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'cash_vs_sales_mismatch',
      'total_sales', v_total_sales,
      'total_cash_inflow', v_total_cash_inflow
    );
  END IF;

  IF ROUND(v_expected_inventory_delta, 2) <> ROUND(v_inventory_delta_value, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'inventory_vs_cogs_mismatch',
      'expected_inventory_delta', v_expected_inventory_delta,
      'ledger_inventory_delta', v_inventory_delta_value
    );
  END IF;

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'date', p_date,
    'total_sales', ROUND(v_total_sales, 2),
    'total_cash_inflow', ROUND(v_total_cash_inflow, 2),
    'inventory_movement_vs_sales_delta', jsonb_build_object(
      'expected_inventory_delta', ROUND(v_expected_inventory_delta, 2),
      'ledger_inventory_delta', ROUND(v_inventory_delta_value, 2)
    ),
    'risk_override_count', v_risk_overrides,
    'mismatches', v_mismatch,
    'is_balanced', (jsonb_array_length(v_mismatch) = 0)
  );
END;
$$;


--
-- Name: generate_po_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_po_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('public.po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_sale_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_sale_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'SALE-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                       || LPAD(nextval('public.sale_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_session_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_session_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF NEW.session_number IS NULL OR NEW.session_number = '' THEN
    NEW.session_number := 'SES-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                          || LPAD(nextval('public.session_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_cashflow_data(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cashflow_data(p_store_id uuid, p_days integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  result json;
BEGIN
  WITH date_series AS (
    SELECT generate_series(current_date - (p_days - 1) * interval '1 day', current_date, '1 day'::interval)::date as date
  ),
  daily_stats AS (
    SELECT 
      sale_date as date,
      COALESCE(total_sales, 0) as money_in,
      COALESCE(stock_purchase, 0) + COALESCE(daily_expense, 0) as money_out
    FROM public.daily_sales
    WHERE store_id = p_store_id
  )
  SELECT json_agg(
    json_build_object(
      'day', to_char(ds.date, 'Mon DD'),
      'income', COALESCE(s.money_in, 0),
      'outcome', COALESCE(s.money_out, 0)
    ) ORDER BY ds.date
  ) INTO result
  FROM date_series ds
  LEFT JOIN daily_stats s ON ds.date = s.date;

  RETURN COALESCE(result, '[]'::json);
END;
$$;


--
-- Name: get_close_risk_analytics(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_close_risk_analytics(p_store_id uuid DEFAULT NULL::uuid, p_manager_user_id uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_total_closes integer := 0;
  v_red_closes integer := 0;
  v_red_close_pct numeric(8,2) := 0;
  v_avg_queue_pending numeric(12,2) := 0;
  v_repeated_conflict_stores jsonb := '[]'::jsonb;
  v_risky_managers jsonb := '[]'::jsonb;
  v_override_total integer := 0;
  v_weak_reason_count integer := 0;
  v_overrides_by_user jsonb := '[]'::jsonb;
  v_overrides_by_store jsonb := '[]'::jsonb;
  v_overrides_by_reason_category jsonb := '[]'::jsonb;
  v_override_frequency_trend jsonb := '[]'::jsonb;
  v_repeat_offenders jsonb := jsonb_build_object('users', '[]'::jsonb, 'stores', '[]'::jsonb);
  v_anomalies jsonb := jsonb_build_object(
    'admins_over_monthly_threshold', '[]'::jsonb,
    'stores_over_monthly_threshold', '[]'::jsonb,
    'blank_or_weak_reasons', '[]'::jsonb
  );
BEGIN
  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE close_status = 'red'),
    COALESCE(AVG(queue_pending_count), 0)
  INTO v_total_closes, v_red_closes, v_avg_queue_pending
  FROM filtered;

  IF v_total_closes > 0 THEN
    v_red_close_pct := ROUND((v_red_closes::numeric / v_total_closes::numeric) * 100, 2);
  END IF;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'conflict_close_count', s.conflict_close_count
      )
      ORDER BY s.conflict_close_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_repeated_conflict_stores
  FROM (
    SELECT
      f.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) FILTER (WHERE f.conflict_count > 0) AS conflict_close_count
    FROM filtered f
    LEFT JOIN public.stores st ON st.id = f.store_id
    GROUP BY f.store_id, st.name
    HAVING COUNT(*) FILTER (WHERE f.conflict_count > 0) >= 2
    ORDER BY conflict_close_count DESC
    LIMIT 10
  ) s;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', r.reviewer_user_id,
        'reviewer_name', r.reviewer_name,
        'risky_close_count', r.risky_close_count,
        'red_close_count', r.red_close_count
      )
      ORDER BY r.risky_close_count DESC, r.red_close_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_risky_managers
  FROM (
    SELECT
      f.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) AS risky_close_count,
      COUNT(*) FILTER (WHERE f.close_status = 'red') AS red_close_count
    FROM filtered f
    LEFT JOIN public.users u ON u.id = f.reviewer_user_id
    GROUP BY f.reviewer_user_id, u.full_name, u.name
    ORDER BY risky_close_count DESC, red_close_count DESC
    LIMIT 10
  ) r;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE
        l.override_reason IS NULL
        OR btrim(l.override_reason) = ''
        OR char_length(btrim(l.override_reason)) < 12
        OR lower(btrim(l.override_reason)) IN ('override', 'ok', 'na', 'n/a', 'urgent', 'approved', 'needed')
    )
  INTO v_override_total, v_weak_reason_count
  FROM filtered l;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_user
  FROM (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    ORDER BY override_count DESC
    LIMIT 20
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', x.store_id,
        'store_name', x.store_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_store
  FROM (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name
    ORDER BY override_count DESC
    LIMIT 20
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reason_category', x.reason_category,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_reason_category
  FROM (
    SELECT
      CASE
        WHEN o.override_reason IS NULL OR btrim(o.override_reason) = '' THEN 'blank'
        WHEN char_length(btrim(o.override_reason)) < 12 THEN 'weak'
        WHEN lower(o.override_reason) LIKE '%sync%' OR lower(o.override_reason) LIKE '%network%' OR lower(o.override_reason) LIKE '%offline%' THEN 'sync_or_connectivity'
        WHEN lower(o.override_reason) LIKE '%conflict%' OR lower(o.override_reason) LIKE '%stock%' OR lower(o.override_reason) LIKE '%inventory%' THEN 'inventory_or_conflict'
        WHEN lower(o.override_reason) LIKE '%cash%' OR lower(o.override_reason) LIKE '%drawer%' OR lower(o.override_reason) LIKE '%difference%' THEN 'cash_reconciliation'
        WHEN lower(o.override_reason) LIKE '%system%' OR lower(o.override_reason) LIKE '%bug%' OR lower(o.override_reason) LIKE '%error%' THEN 'system_issue'
        ELSE 'other'
      END AS reason_category,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY reason_category
    ORDER BY override_count DESC
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', x.period,
        'override_count', x.override_count
      )
      ORDER BY x.period
    ),
    '[]'::jsonb
  )
  INTO v_override_frequency_trend
  FROM (
    SELECT
      to_char(date_trunc('day', o.reviewed_at), 'YYYY-MM-DD') AS period,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY date_trunc('day', o.reviewed_at)
    ORDER BY period
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  ),
  offenders_by_user AS (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) >= 3
    ORDER BY override_count DESC
  ),
  offenders_by_store AS (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name
    HAVING COUNT(*) >= 3
    ORDER BY override_count DESC
  )
  SELECT jsonb_build_object(
    'users',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'reviewer_user_id', a.reviewer_user_id,
        'reviewer_name', a.reviewer_name,
        'override_count', a.override_count
      )) FROM offenders_by_user a),
      '[]'::jsonb
    ),
    'stores',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'override_count', s.override_count
      )) FROM offenders_by_store s),
      '[]'::jsonb
    )
  )
  INTO v_repeat_offenders;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  ),
  admin_monthly AS (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      to_char(date_trunc('month', o.reviewed_at), 'YYYY-MM') AS month,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name, date_trunc('month', o.reviewed_at)
    HAVING COUNT(*) > 5
  ),
  store_monthly AS (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      to_char(date_trunc('month', o.reviewed_at), 'YYYY-MM') AS month,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name, date_trunc('month', o.reviewed_at)
    HAVING COUNT(*) > 3
  ),
  weak_reason_rows AS (
    SELECT
      o.id,
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      o.override_reason,
      o.reviewed_at
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    LEFT JOIN public.stores st ON st.id = o.store_id
    WHERE
      o.override_reason IS NULL
      OR btrim(o.override_reason) = ''
      OR char_length(btrim(o.override_reason)) < 12
      OR lower(btrim(o.override_reason)) IN ('override', 'ok', 'na', 'n/a', 'urgent', 'approved', 'needed')
  )
  SELECT jsonb_build_object(
    'admins_over_monthly_threshold',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'reviewer_user_id', a.reviewer_user_id,
        'reviewer_name', a.reviewer_name,
        'month', a.month,
        'override_count', a.override_count,
        'threshold', 5
      )) FROM admin_monthly a),
      '[]'::jsonb
    ),
    'stores_over_monthly_threshold',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'month', s.month,
        'override_count', s.override_count,
        'threshold', 3
      )) FROM store_monthly s),
      '[]'::jsonb
    ),
    'blank_or_weak_reasons',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'close_review_id', w.id,
        'reviewer_user_id', w.reviewer_user_id,
        'reviewer_name', w.reviewer_name,
        'store_id', w.store_id,
        'store_name', w.store_name,
        'override_reason', w.override_reason,
        'reviewed_at', w.reviewed_at
      )) FROM weak_reason_rows w),
      '[]'::jsonb
    )
  )
  INTO v_anomalies;

  RETURN jsonb_build_object(
    'red_closes_percent', v_red_close_pct,
    'average_pending_queue_at_close', ROUND(v_avg_queue_pending, 2),
    'repeated_conflict_stores', v_repeated_conflict_stores,
    'managers_with_most_risky_closes', v_risky_managers,
    'override_total', v_override_total,
    'weak_reason_count', v_weak_reason_count,
    'overrides_by_user', v_overrides_by_user,
    'overrides_by_store', v_overrides_by_store,
    'overrides_by_reason_category', v_overrides_by_reason_category,
    'override_frequency_trend', v_override_frequency_trend,
    'repeat_offenders', v_repeat_offenders,
    'anomalies', v_anomalies
  );
END;
$$;


--
-- Name: get_current_user_store_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_store_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT store_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;


--
-- Name: get_current_user_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;


--
-- Name: get_customer_analytics(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_analytics(p_store_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(party_id uuid, customer_name text, phone text, total_spent numeric, purchase_count bigint, avg_order_value numeric, last_purchase_date timestamp with time zone, days_since_last integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  WITH customer_sales AS (
    SELECT
      p.id               AS party_id,
      p.name             AS customer_name,
      p.phone,
      COUNT(DISTINCT s.id)                   AS purchase_count,
      COALESCE(SUM(le.credit), 0) AS total_spent,
      MAX(s.created_at)                      AS last_purchase_date
    FROM public.parties p
    LEFT JOIN public.ledger_entries le ON le.annotation->>'party_id' = p.id::text
    LEFT JOIN public.sales s ON s.id = le.sale_id AND s.store_id = p_store_id AND s.status = 'completed'
    WHERE p.type = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.stores st
        JOIN public.users u ON u.tenant_id = st.tenant_id
        WHERE st.id = p_store_id
          AND u.auth_id = auth.uid()
      )
    GROUP BY p.id, p.name, p.phone
  )
  SELECT
    cs.party_id,
    cs.customer_name,
    cs.phone,
    cs.total_spent,
    cs.purchase_count,
    CASE WHEN cs.purchase_count > 0
      THEN cs.total_spent / cs.purchase_count
      ELSE 0
    END AS avg_order_value,
    cs.last_purchase_date,
    CASE WHEN cs.last_purchase_date IS NOT NULL
      THEN (EXTRACT(EPOCH FROM now() - cs.last_purchase_date) / 86400)::integer
      ELSE NULL
    END AS days_since_last
  FROM customer_sales cs
  WHERE cs.purchase_count > 0
  ORDER BY cs.total_spent DESC
  LIMIT p_limit;
$$;


--
-- Name: get_daily_movement_trend(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_movement_trend(p_store_id uuid, p_days integer DEFAULT 14) RETURNS TABLE(trend_date date, total_in bigint, total_out bigint, net_delta bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT
    DATE(sm.created_at AT TIME ZONE 'UTC')         AS trend_date,
    SUM(CASE WHEN sm.delta > 0 THEN  sm.delta ELSE 0 END) AS total_in,
    SUM(CASE WHEN sm.delta < 0 THEN -sm.delta ELSE 0 END) AS total_out,
    SUM(sm.delta)                                   AS net_delta
  FROM public.stock_movements sm
  WHERE sm.store_id = p_store_id
    AND sm.created_at >= now() - (p_days || ' days')::interval
  GROUP BY trend_date
  ORDER BY trend_date ASC;
$$;


--
-- Name: get_dashboard_missing_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_missing_metrics(p_store_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result json;
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  SELECT json_build_object(
    'toReceive', COALESCE((
       SELECT SUM(current_balance) FROM public.parties 
       WHERE tenant_id = v_tenant_id AND type = 'customer' AND current_balance > 0
    ), 0),
    'toGive', COALESCE((
       SELECT SUM(current_balance) FROM public.parties 
       WHERE tenant_id = v_tenant_id AND type = 'supplier' AND current_balance > 0
    ), 0),
    'totalBalance', COALESCE((
      SELECT SUM(debit_amount - credit_amount) FROM public.ledger_entries le
      JOIN public.ledger_accounts la ON la.id = le.account_id
      WHERE le.store_id = p_store_id AND (la.name ILIKE '%cash%' OR la.name ILIKE '%bank%' OR la.name ILIKE '%bkash%')
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;


--
-- Name: get_expected_cash(uuid, uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_expected_cash(p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
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
$$;


--
-- Name: get_expiring_batches(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_expiring_batches(p_store_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(batch_id uuid, batch_number text, item_id uuid, item_name text, sku text, qty integer, expires_at date, days_left integer, status text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT
    b.id            AS batch_id,
    b.batch_number,
    i.id            AS item_id,
    i.name          AS item_name,
    i.sku,
    b.qty,
    b.expires_at,
    (b.expires_at - CURRENT_DATE)::integer AS days_left,
    b.status
  FROM public.item_batches b
  JOIN public.items i ON i.id = b.item_id
  WHERE b.store_id = p_store_id
    AND b.status   = 'active'
    AND b.qty > 0
    AND b.expires_at IS NOT NULL
    AND b.expires_at <= (CURRENT_DATE + p_days)
  ORDER BY b.expires_at ASC;
$$;


--
-- Name: get_inventory_list(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_inventory_list(p_store_id uuid) RETURNS TABLE(id uuid, name text, sku text, barcode text, category_id uuid, category_name text, price numeric, mrp numeric, cost numeric, active boolean, current_qty integer, min_qty integer, reorder_status text, last_updated timestamp with time zone, stock integer, image_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        i.id,
        i.name,
        i.sku,
        i.barcode,
        i.category_id,
        c.name AS category_name,
        i.price,
        i.mrp,
        i.cost,
        i.is_active AS active,
        COALESCE(sl.qty, 0)::integer AS current_qty,
        COALESCE(sat.min_qty, 5)::integer AS min_qty,
        CASE
            WHEN COALESCE(sl.qty, 0) = 0 THEN 'OUT'::text
            WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'::text
            ELSE 'OK'::text
        END AS reorder_status,
        i.updated_at AS last_updated,
        COALESCE(sl.qty, 0)::integer AS stock,
        i.image_url
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
    WHERE EXISTS (
        SELECT 1 FROM users u 
        WHERE u.auth_id = auth.uid() 
        AND u.tenant_id = i.tenant_id
    );
$$;


--
-- Name: get_inventory_movements(uuid, uuid, public.movement_type, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_inventory_movements(p_store_id uuid, p_product_id uuid DEFAULT NULL::uuid, p_movement_type public.movement_type DEFAULT NULL::public.movement_type, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, product_id uuid, product_name text, product_sku text, movement_type public.movement_type, quantity_delta integer, reference_type public.reference_type, reference_id uuid, previous_quantity integer, new_quantity integer, notes text, created_at timestamp with time zone, created_by uuid, performer_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Basic store auth check
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid() AND u.store_id = p_store_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        im.id,
        im.product_id,
        i.name AS product_name,
        i.sku AS product_sku,
        im.movement_type,
        im.quantity_delta,
        im.reference_type,
        im.reference_id,
        im.previous_quantity,
        im.new_quantity,
        im.notes,
        im.created_at,
        im.created_by,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'System') AS performer_name
    FROM public.inventory_movements im
    JOIN public.inventory_items i ON i.id = im.product_id
    LEFT JOIN auth.users u ON u.id = im.created_by
    WHERE im.store_id = p_store_id
      AND (p_product_id IS NULL OR im.product_id = p_product_id)
      AND (p_movement_type IS NULL OR im.movement_type = p_movement_type)
    ORDER BY im.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_inventory_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_inventory_summary(p_store_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_total_skus bigint;
  v_out_of_stock bigint;
  v_total_value numeric;
  v_total_cost numeric;
BEGIN
  SELECT 
    COUNT(DISTINCT i.id),
    SUM(CASE WHEN sl.qty = 0 THEN 1 ELSE 0 END),
    COALESCE(SUM(sl.qty * i.price), 0),
    COALESCE(SUM(sl.qty * i.cost), 0)
  INTO 
    v_total_skus, 
    v_out_of_stock, 
    v_total_value, 
    v_total_cost
  FROM public.items i
  JOIN public.stock_levels sl ON sl.item_id = i.id
  WHERE sl.store_id = p_store_id
    AND i.active = true;

  RETURN jsonb_build_object(
    'total_skus', COALESCE(v_total_skus, 0),
    'out_of_stock_count', COALESCE(v_out_of_stock, 0),
    'total_value', v_total_value,
    'total_cost', v_total_cost
  );
END;
$$;


--
-- Name: get_low_stock_items(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_low_stock_items(p_store_id uuid) RETURNS TABLE(item_id uuid, item_name text, sku text, image_url text, category_name text, current_qty integer, min_qty integer, reorder_qty integer)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT 
    i.id as item_id,
    i.name as item_name,
    i.sku as sku,
    i.image_url as image_url,
    c.name as category_name,
    COALESCE(sl.qty, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    COALESCE(sat.reorder_qty, 20) as reorder_qty
  FROM public.items i
  LEFT JOIN public.categories c ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
    AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty, 0) ASC, i.name ASC
  LIMIT 50;
$$;


--
-- Name: get_manager_dashboard_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_manager_dashboard_stats(p_store_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_today_sales numeric(12,2) := 0;
  v_total_orders integer := 0;
  v_active_sessions integer := 0;
  v_low_stock_count integer := 0;
  v_recent_sessions jsonb;
  v_start_of_day timestamptz := CURRENT_DATE;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0), COUNT(id)
  INTO v_today_sales, v_total_orders
  FROM public.sales
  WHERE store_id = p_store_id AND status = 'completed' AND created_at >= v_start_of_day;

  SELECT COUNT(id) INTO v_active_sessions
  FROM public.pos_sessions
  WHERE store_id = p_store_id AND status = 'open';

  SELECT COUNT(s.item_id) INTO v_low_stock_count
  FROM (
    SELECT i.id AS item_id
    FROM public.items i
    LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
    WHERE i.is_active = true
      AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ) s;

  SELECT jsonb_agg(row_to_json(rs)) INTO v_recent_sessions
  FROM (
    SELECT ps.id, ps.session_number, ps.status, ps.opened_at, ps.total_sales, u.name as cashier_name
    FROM public.pos_sessions ps
    LEFT JOIN public.users u ON u.id = ps.cashier_id
    WHERE ps.store_id = p_store_id
    ORDER BY ps.opened_at DESC LIMIT 10
  ) rs;

  RETURN jsonb_build_object(
    'today_sales', v_today_sales,
    'total_orders', v_total_orders,
    'active_sessions', v_active_sessions,
    'low_stock_count', v_low_stock_count,
    'recent_sessions', COALESCE(v_recent_sessions, '[]'::jsonb)
  );
END;
$$;


--
-- Name: get_monthly_governance_scorecard(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_monthly_governance_scorecard(p_store_id uuid DEFAULT NULL::uuid, p_manager_user_id uuid DEFAULT NULL::uuid, p_month date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_month_start date := date_trunc('month', COALESCE(p_month, CURRENT_DATE))::date;
  v_next_month_start date := (date_trunc('month', COALESCE(p_month, CURRENT_DATE)) + INTERVAL '1 month')::date;
  v_prev_month_start date := (date_trunc('month', COALESCE(p_month, CURRENT_DATE)) - INTERVAL '1 month')::date;
  v_curr_red_pct numeric(8,2) := 0;
  v_prev_red_pct numeric(8,2) := 0;
  v_risk_trend_improvement numeric(8,2) := 0;
  v_stores_with_most_overrides jsonb := '[]'::jsonb;
  v_managers_needing_coaching jsonb := '[]'::jsonb;
  v_admins_overriding_too_often jsonb := '[]'::jsonb;
  v_reasons_breakdown jsonb := '[]'::jsonb;
BEGIN
  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    ROUND(
      (
        COUNT(*) FILTER (WHERE close_status = 'red')::numeric /
        NULLIF(COUNT(*)::numeric, 0)
      ) * 100,
      2
    ),
    0
  )
  INTO v_curr_red_pct
  FROM filtered;

  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_prev_month_start::timestamptz
      AND l.reviewed_at < v_month_start::timestamptz
  )
  SELECT COALESCE(
    ROUND(
      (
        COUNT(*) FILTER (WHERE close_status = 'red')::numeric /
        NULLIF(COUNT(*)::numeric, 0)
      ) * 100,
      2
    ),
    0
  )
  INTO v_prev_red_pct
  FROM filtered;

  v_risk_trend_improvement := ROUND(v_prev_red_pct - v_curr_red_pct, 2);

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', x.store_id,
        'store_name', x.store_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_stores_with_most_overrides
  FROM (
    SELECT
      o.store_id,
      COALESCE(s.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores s ON s.id = o.store_id
    GROUP BY o.store_id, s.name
    ORDER BY override_count DESC
    LIMIT 10
  ) x;

  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'risky_close_count', x.risky_close_count,
        'override_count', x.override_count
      )
      ORDER BY x.risky_close_count DESC, x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_managers_needing_coaching
  FROM (
    SELECT
      f.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) AS risky_close_count,
      COUNT(*) FILTER (WHERE f.admin_override = true) AS override_count
    FROM filtered f
    LEFT JOIN public.users u ON u.id = f.reviewer_user_id
    GROUP BY f.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) >= 3
    ORDER BY risky_close_count DESC, override_count DESC
    LIMIT 10
  ) x;

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'override_count', x.override_count,
        'threshold', 5
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_admins_overriding_too_often
  FROM (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    WHERE o.reviewer_role = 'admin'
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) > 5
    ORDER BY override_count DESC
  ) x;

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reason_category', x.reason_category,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_reasons_breakdown
  FROM (
    SELECT
      COALESCE(
        NULLIF(btrim(o.override_reason_category), ''),
        NULLIF(btrim(o.override_reason), ''),
        'unspecified'
      ) AS reason_category,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY 1
    ORDER BY override_count DESC
  ) x;

  RETURN jsonb_build_object(
    'month', to_char(v_month_start, 'YYYY-MM'),
    'stores_with_most_overrides', v_stores_with_most_overrides,
    'managers_needing_coaching', v_managers_needing_coaching,
    'admins_overriding_too_often', v_admins_overriding_too_often,
    'reasons_breakdown', v_reasons_breakdown,
    'risk_trend_improvement', jsonb_build_object(
      'current_red_close_percent', v_curr_red_pct,
      'previous_red_close_percent', v_prev_red_pct,
      'improvement_percent_points', v_risk_trend_improvement
    )
  );
END;
$$;


--
-- Name: get_monthly_trend_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_monthly_trend_metrics(p_store_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result json;
BEGIN
  WITH monthly_stats AS (
    SELECT
      DATE_TRUNC('month', sale_date) as month,
      SUM(total_sales) as sales,
      COALESCE(SUM(stock_purchase), 0) as purchase,
      COALESCE(SUM(daily_expense), 0) as expense
    FROM public.daily_sales
    WHERE store_id = p_store_id
      AND sale_date >= DATE_TRUNC('month', current_date - interval '1 month')
    GROUP BY DATE_TRUNC('month', sale_date)
  ),
  comparison AS (
    SELECT 
      sales as current_month_sales,
      purchase as current_month_purchase,
      expense as current_month_expense,
      LAG(sales) OVER (ORDER BY month) as prev_month_sales,
      LAG(purchase) OVER (ORDER BY month) as prev_month_purchase,
      LAG(expense) OVER (ORDER BY month) as prev_month_expense
    FROM monthly_stats
    ORDER BY month DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'sales', json_build_object(
      'amount', COALESCE(current_month_sales, 0),
      'trend', CASE WHEN COALESCE(prev_month_sales, 0) > 0 
        THEN ROUND(((COALESCE(current_month_sales, 0) - prev_month_sales) / prev_month_sales) * 100, 1)
        ELSE 0 END
    ),
    'purchase', json_build_object(
      'amount', COALESCE(current_month_purchase, 0),
      'trend', CASE WHEN COALESCE(prev_month_purchase, 0) > 0 
        THEN ROUND(((COALESCE(current_month_purchase, 0) - prev_month_purchase) / prev_month_purchase) * 100, 1)
        ELSE 0 END
    ),
    'expense', json_build_object(
      'amount', COALESCE(current_month_expense, 0),
      'trend', CASE WHEN COALESCE(prev_month_expense, 0) > 0 
        THEN ROUND(((COALESCE(current_month_expense, 0) - prev_month_expense) / prev_month_expense) * 100, 1)
        ELSE 0 END
    )
  ) INTO result
  FROM comparison;
  
  RETURN result;
END;
$$;


--
-- Name: get_new_receipt(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_new_receipt(store uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare
  today date := current_date;
  new_counter integer;
  receipt text;
begin
  insert into receipt_counters(store_id, date, counter)
  values (store, today, 1)
  on conflict (store_id, date)
  do update set counter = receipt_counters.counter + 1
  returning counter into new_counter;

  receipt := concat(store, '-', today, '-', lpad(new_counter::text, 5, '0'));
  return receipt;
end;
$$;


--
-- Name: get_offline_sync_status(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_offline_sync_status(p_order_ids uuid[]) RETURNS TABLE(order_id uuid, is_synced boolean, synced_at timestamp without time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as order_id,
    s.synced_at IS NOT NULL as is_synced,
    s.synced_at
  FROM public.sales s
  WHERE s.id = ANY(p_order_ids)
    AND s.store_id = (
      SELECT store_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1
    );
END;
$$;


--
-- Name: get_or_create_ar_account(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_ar_account(p_tenant_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_account_id UUID;
    v_store_id UUID;
BEGIN
    -- Find AR ledger account for any store in this tenant
    SELECT la.id INTO v_account_id
    FROM public.ledger_accounts la
    JOIN public.stores s ON s.id = la.store_id
    WHERE s.tenant_id = p_tenant_id AND la.code = '1300_ACCOUNTS_RECEIVABLE'
    LIMIT 1;

    IF v_account_id IS NULL THEN
        SELECT id INTO v_store_id FROM public.stores WHERE tenant_id = p_tenant_id LIMIT 1;
        IF v_store_id IS NOT NULL THEN
            INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
            VALUES (v_store_id, '1300_ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'ASSET', true)
            RETURNING id INTO v_account_id;
        END IF;
    END IF;

    RETURN v_account_id;
END;
$$;


--
-- Name: get_party_ledger(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_party_ledger(p_party_id uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date) RETURNS TABLE(id uuid, batch_id uuid, account_id uuid, party_id uuid, debit_amount numeric, credit_amount numeric, reference_type text, reference_id uuid, notes text, effective_date date, created_at timestamp with time zone, store_id uuid, tenant_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        le.id,
        le.batch_id,
        le.account_id,
        le.party_id,
        le.debit_amount,
        le.credit_amount,
        le.reference_type,
        le.reference_id,
        le.notes,
        le.effective_date,
        le.created_at,
        le.store_id,
        le.tenant_id
    FROM public.ledger_entries le
    JOIN public.ledger_batches lb ON lb.id = le.batch_id
    WHERE le.party_id = p_party_id
    AND lb.status != 'DELETED'
    AND (p_date_from IS NULL OR le.effective_date >= p_date_from)
    AND (p_date_to IS NULL OR le.effective_date <= p_date_to)
    ORDER BY le.effective_date DESC, le.created_at DESC;
END;
$$;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    type public.payment_type DEFAULT 'cash'::public.payment_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: get_payment_methods(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_payment_methods(p_store_id uuid) RETURNS SETOF public.payment_methods
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT * FROM public.payment_methods WHERE store_id = p_store_id ORDER BY sort_order ASC;
$$;


--
-- Name: get_pos_categories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pos_categories(p_store_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.name), '[]'::jsonb)
  FROM (
    SELECT
      c.id,
      c.name,
      c.image_url,
      c.color,
      c.icon,
      COUNT(i.id) AS item_count
    FROM public.categories c
    JOIN public.items i ON i.category_id = c.id AND i.is_active = true
    GROUP BY c.id, c.name, c.image_url, c.color, c.icon
    HAVING COUNT(i.id) > 0
  ) r;
$$;


--
-- Name: get_price_history(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_price_history(p_store_id uuid, p_item_id uuid, p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, changed_at timestamp with time zone, old_price numeric, new_price numeric, old_mrp numeric, new_mrp numeric, changed_by text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Query from items.updated_at and user metadata
  -- Note: For complete audit trail with old values, add triggers to items table
  RETURN QUERY
  SELECT 
    p_item_id,
    i.updated_at,
    i.price,
    i.price,
    i.mrp,
    i.mrp,
    COALESCE(i.updated_by::text, i.created_by::text, 'System')
  FROM items i
  WHERE i.id = p_item_id
    AND i.store_id = p_store_id
  ORDER BY i.updated_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: receipt_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_config (
    store_id uuid NOT NULL,
    store_name text,
    header_text text,
    footer_text text,
    logo_url text,
    currency_symbol text DEFAULT '৳'::text NOT NULL,
    show_tax boolean DEFAULT false NOT NULL,
    receipt_printer_type text DEFAULT 'bluetooth_escpos'::text,
    receipt_printer_name text,
    label_printer_type text DEFAULT 'tspl_bluetooth'::text,
    label_printer_name text,
    label_width_mm integer DEFAULT 40,
    label_height_mm integer DEFAULT 30,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: get_receipt_config_simple(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_receipt_config_simple(p_store_id uuid) RETURNS public.receipt_config
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT * FROM public.receipt_config WHERE store_id = p_store_id;
$$;


--
-- Name: get_receivables_aging(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_receivables_aging(p_tenant_id uuid, p_store_id uuid, p_search text DEFAULT NULL::text) RETURNS TABLE(party_id uuid, customer_name text, phone text, balance_due numeric, days_overdue integer, last_note text, promise_to_pay_date date)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_ar_account_id UUID;
BEGIN
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);
    IF v_ar_account_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH party_balances AS (
        SELECT
            le.party_id,
            SUM(le.debit_amount - le.credit_amount) AS balance_due,
            MAX(le.effective_date) FILTER (WHERE le.debit_amount > 0) AS last_credit_sale_date
        FROM public.ledger_entries le
        WHERE le.store_id = p_store_id
          AND le.account_id = v_ar_account_id
          AND le.party_id IS NOT NULL
        GROUP BY le.party_id
        HAVING SUM(le.debit_amount - le.credit_amount) > 0
    ),
    latest_notes AS (
        SELECT DISTINCT ON (fn.party_id)
            fn.party_id,
            fn.note_text,
            fn.promise_to_pay_date
        FROM public.followup_notes fn
        WHERE fn.store_id = p_store_id
        ORDER BY fn.party_id, fn.created_at DESC
    )
    SELECT
        pb.party_id,
        p.name AS customer_name,
        p.phone,
        pb.balance_due,
        COALESCE(CURRENT_DATE - pb.last_credit_sale_date, 0)::INTEGER AS days_overdue,
        ln.note_text AS last_note,
        ln.promise_to_pay_date
    FROM party_balances pb
    JOIN public.parties p ON p.id = pb.party_id
    LEFT JOIN latest_notes ln ON ln.party_id = pb.party_id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY pb.balance_due DESC, pb.last_credit_sale_date ASC;
END;
$$;


--
-- Name: get_retail_kpis(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_retail_kpis(p_store_id uuid, p_days integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  result json;
BEGIN
  WITH daily_stats AS (
    SELECT 
      total_sales,
      cash_amount + bkash_amount as realized_sales,
      credit_amount,
      daily_expense,
      stock_purchase
    FROM public.daily_sales
    WHERE store_id = p_store_id
      AND sale_date >= (current_date - p_days)
  )
  SELECT json_build_object(
    'atv', CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(total_sales), 2) ELSE 0 END,
    'upt', 0,
    'gross_margin_pct', CASE WHEN SUM(total_sales) > 0 
      THEN ROUND(((SUM(total_sales) - SUM(daily_expense) - SUM(stock_purchase)) / SUM(total_sales)) * 100, 1)
      ELSE 0 
    END,
    'total_transactions', COUNT(*)
  ) INTO result
  FROM daily_stats;
  
  RETURN result;
END;
$$;


--
-- Name: get_sale_details(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sale_details(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_sale_info jsonb;
  v_items jsonb;
  v_payments jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'sale_number', s.sale_number,
    'subtotal', s.subtotal,
    'discount_amount', s.discount_amount,
    'total_amount', s.total_amount,
    'amount_tendered', s.amount_tendered,
    'change_due', s.change_due,
    'status', s.status,
    'notes', s.notes,
    'created_at', s.created_at,
    'cashier_name', u.full_name,
    'voided_at', s.voided_at,
    'void_reason', s.void_reason,
    'voided_by_name', v.full_name
  ) INTO v_sale_info
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  LEFT JOIN public.users v ON v.id = s.voided_by
  WHERE s.id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'item_name', i.name,
    'qty', si.qty,
    'unit_price', si.price,
    'line_total', si.line_total,
    'sku', i.sku
  )) INTO v_items
  FROM public.sale_items si
  JOIN public.items i ON i.id = si.item_id
  WHERE si.sale_id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'method_name', pm.name,
    'amount', sp.amount,
    'reference', sp.reference
  )) INTO v_payments
  FROM public.sale_payments sp
  JOIN public.payment_methods pm ON pm.id = sp.payment_method_id
  WHERE sp.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'sale', v_sale_info,
    'items', COALESCE(v_items, '[]'::jsonb),
    'payments', COALESCE(v_payments, '[]'::jsonb)
  );
END;
$$;


--
-- Name: get_sales_history(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sales_history(p_store_id uuid, p_search_query text DEFAULT NULL::text, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, sale_number text, total_amount numeric, status text, cashier_name text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sale_number,
    s.total_amount,
    s.status::text,
    u.full_name as cashier_name,
    s.created_at
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  WHERE s.store_id = p_store_id
    AND (p_search_query IS NULL OR s.sale_number ILIKE '%' || p_search_query || '%')
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: get_session_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_session_summary(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_session public.pos_sessions;
  v_cashier_name text;
  v_total_cash_sales numeric := 0;
  v_expected_drawer numeric := 0;
BEGIN
  -- Get session details
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  SELECT name INTO v_cashier_name FROM public.users WHERE id = v_session.cashier_id;

  -- Calculate exact cash taken in this session
  -- This resolves the complex change math by letting the DB sum up the exact amounts.
  -- For a real POS, we sum (amount_tendered - change_due) for cash payments
  -- Here we assume total_amount is what went into the drawer.
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_cash_sales
  FROM public.sales
  WHERE session_id = p_session_id AND status = 'completed';

  v_expected_drawer := v_session.opening_cash + v_total_cash_sales;

  -- If it's already closed, it might already have the expected calculated.
  -- But we return current calculation.
  
  RETURN jsonb_build_object(
    'session', row_to_json(v_session),
    'cashier_name', v_cashier_name,
    'total_cash_sales', v_total_cash_sales,
    'expected_drawer', v_expected_drawer
  );
END;
$$;


--
-- Name: get_slow_moving_items(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_slow_moving_items(p_store_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 50) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, qty_on_hand bigint, total_cost numeric, last_sold_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    i.id                                        AS item_id,
    i.name                                      AS item_name,
    i.sku,
    c.name                                      AS category_name,
    COALESCE(sl.qty, 0)                         AS qty_on_hand,
    COALESCE(sl.qty, 0) * i.cost                AS total_cost,
    MAX(sa.created_at)                          AS last_sold_at
  FROM public.items i
  LEFT JOIN public.categories c    ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl  ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.sale_items si    ON si.item_id = i.id
  LEFT JOIN public.sales sa         ON sa.id = si.sale_id
                                    AND sa.store_id = p_store_id
                                    AND sa.status = 'completed'
                                    AND sa.created_at >= now() - (p_days || ' days')::interval
  WHERE i.is_active = true
    AND COALESCE(sl.qty, 0) > 0
  GROUP BY i.id, i.name, i.sku, c.name, sl.qty, i.cost
  HAVING COUNT(si.item_id) = 0
  ORDER BY total_cost DESC
  LIMIT p_limit;
$$;


--
-- Name: get_staff_performance(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_staff_performance(p_store_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(user_id uuid, staff_name text, role text, total_sales bigint, total_revenue numeric, avg_ticket numeric, total_discounts numeric, active_days bigint, revenue_per_day numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    u.id                                              AS user_id,
    COALESCE(u.full_name, u.name, u.email)            AS staff_name,
    u.role                                            AS role,
    COUNT(s.id)                                       AS total_sales,
    COALESCE(SUM(s.total_amount), 0)                  AS total_revenue,
    CASE WHEN COUNT(s.id) > 0
      THEN COALESCE(SUM(s.total_amount), 0) / COUNT(s.id)
      ELSE 0
    END                                               AS avg_ticket,
    COALESCE(SUM(s.discount_amount), 0)               AS total_discounts,
    COUNT(DISTINCT DATE(s.created_at))                AS active_days,
    CASE
      WHEN COUNT(DISTINCT DATE(s.created_at)) > 0
      THEN COALESCE(SUM(s.total_amount), 0) / COUNT(DISTINCT DATE(s.created_at))
      ELSE 0
    END                                               AS revenue_per_day
  FROM public.users u
  INNER JOIN public.sales s ON s.cashier_id = u.id
    AND s.store_id = p_store_id
    AND s.status = 'completed'
    AND s.created_at >= now() - (p_days || ' days')::interval
  WHERE EXISTS (
    SELECT 1 FROM public.stores st
    JOIN public.users cu ON cu.tenant_id = st.tenant_id
    WHERE st.id = p_store_id
      AND cu.auth_id = auth.uid()
  )
  GROUP BY u.id, u.full_name, u.name, u.email, u.role
  ORDER BY total_revenue DESC;
$$;


--
-- Name: get_stock_history_simple(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stock_history_simple(p_store_id uuid, p_item_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, item_name text, delta integer, reason text, notes text, performer_name text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    i.name as item_name,
    sm.delta,
    sm.reason,
    COALESCE(sm.meta->>'notes', '') as notes,
    u.full_name as performer_name,
    sm.created_at
  FROM public.stock_movements sm
  JOIN public.items i ON i.id = sm.item_id
  LEFT JOIN public.users u ON u.id = sm.performed_by
  WHERE sm.store_id = p_store_id
    AND (p_item_id IS NULL OR sm.item_id = p_item_id)
  ORDER BY sm.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_stock_level_by_id(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stock_level_by_id(p_store_id uuid, p_item_id uuid) RETURNS TABLE(store_id uuid, item_id uuid, quantity integer, recent_movements jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    sl.store_id,
    sl.item_id,
    sl.qty,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', im.id,
        'delta', im.quantity_delta,
        'reason', im.movement_type,
        'created_at', im.created_at
      ))
      FROM (
        SELECT * FROM public.inventory_movements
        WHERE store_id = sl.store_id AND product_id = sl.item_id
        ORDER BY created_at DESC
        LIMIT 10
      ) im
    ) AS recent_movements
  FROM public.stock_levels sl
  WHERE sl.store_id = p_store_id AND sl.item_id = p_item_id;
$$;


--
-- Name: get_stock_movements(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stock_movements(p_store_id uuid DEFAULT NULL::uuid, p_item_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, store_id uuid, item_id uuid, delta integer, reason text, notes text, meta jsonb, performed_by uuid, performer_name text, item_name text, store_code text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.store_id,
    sm.item_id,
    sm.delta,
    sm.reason,
    (sm.meta ->> 'notes')::text AS notes,
    sm.meta,
    sm.performed_by,
    u.full_name AS performer_name,
    i.name AS item_name,
    s.code AS store_code,
    sm.created_at
  FROM public.stock_movements sm
  LEFT JOIN public.users u ON u.id = sm.performed_by
  LEFT JOIN public.items i ON i.id = sm.item_id
  LEFT JOIN public.stores s ON s.id = sm.store_id
  WHERE (p_store_id IS NULL OR sm.store_id = p_store_id)
    AND (p_item_id IS NULL OR sm.item_id = p_item_id)
  ORDER BY sm.created_at DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset;
END;
$$;


--
-- Name: get_stock_valuation(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stock_valuation(p_store_id uuid, p_limit integer DEFAULT 100) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, qty_on_hand bigint, unit_cost numeric, unit_price numeric, total_cost numeric, total_value numeric, margin_pct numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT
    i.id                                          AS item_id,
    i.name                                        AS item_name,
    i.sku,
    c.name                                        AS category_name,
    COALESCE(sl.qty, 0)                           AS qty_on_hand,
    i.cost                                        AS unit_cost,
    i.price                                       AS unit_price,
    COALESCE(sl.qty, 0) * i.cost                  AS total_cost,
    COALESCE(sl.qty, 0) * i.price                 AS total_value,
    CASE
      WHEN i.price > 0
      THEN ROUND(((i.price - i.cost) / i.price) * 100, 2)
      ELSE 0
    END                                           AS margin_pct
  FROM public.items i
  LEFT JOIN public.categories c   ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  WHERE i.active = true
  ORDER BY total_value DESC
  LIMIT p_limit;
$$;


--
-- Name: get_store_users(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_store_users(p_store_id uuid) RETURNS TABLE(id uuid, full_name text, role text, email text, last_login timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT id, full_name, role, email, last_login_at
  FROM public.users
  WHERE store_id = p_store_id OR role = 'admin'
  ORDER BY role ASC, full_name ASC;
$$;


--
-- Name: get_top_selling_items(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_selling_items(p_store_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, total_qty bigint, total_revenue numeric, total_profit numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT
    i.id                     AS item_id,
    i.name                   AS item_name,
    i.sku,
    c.name                   AS category_name,
    SUM(si.qty)              AS total_qty,
    SUM(si.line_total)       AS total_revenue,
    SUM(si.line_total - (si.cost * si.qty)) AS total_profit
  FROM public.sale_items si
  JOIN public.sales    sa ON sa.id = si.sale_id
  JOIN public.items    i  ON i.id  = si.item_id
  LEFT JOIN public.categories c ON c.id = i.category_id
  WHERE sa.store_id = p_store_id
    AND sa.created_at >= now() - (p_days || ' days')::interval
    AND sa.status = 'completed'
  GROUP BY i.id, i.name, i.sku, c.name
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;


--
-- Name: get_upcoming_reminders(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_upcoming_reminders(p_store_id uuid, p_include_completed boolean DEFAULT false) RETURNS SETOF public.reminders
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
    SELECT r.*
    FROM reminders r
    WHERE r.store_id = p_store_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
      AND (p_include_completed OR r.is_completed = false)
    ORDER BY r.reminder_date ASC, r.created_at ASC;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: heartbeat_ledger_worker(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.heartbeat_ledger_worker(p_worker_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.ledger_workers
  SET last_heartbeat = now(), active = true
  WHERE worker_id = p_worker_id;
  RETURN FOUND;
END;
$$;


--
-- Name: import_apply_stock_delta(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_apply_stock_delta(p_store_id uuid, p_item_id uuid, p_delta integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be > 0';
  END IF;

  WITH upserted AS (
    INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (p_store_id, p_item_id, p_delta)
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET qty = public.stock_levels.qty + EXCLUDED.qty
    RETURNING (xmax = 0) AS inserted
  )
  SELECT inserted INTO v_inserted FROM upserted;

  RETURN COALESCE(v_inserted, false);
END;
$$;


--
-- Name: import_historical_daily_sale(uuid, date, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_historical_daily_sale(p_store_id uuid, p_date date, p_cash_amount numeric, p_bkash_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_batch_id uuid;
  v_user_id uuid;
  v_cash_account uuid;
  v_bank_account uuid;
  v_revenue_account uuid;
  v_total_amount numeric := ROUND(p_cash_amount + p_bkash_amount, 2);
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Ensure accounts exist
  PERFORM public.ensure_sale_ledger_accounts(p_store_id);

  SELECT id INTO v_cash_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  SELECT id INTO v_bank_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '4000_SALES_REVENUE';

  -- Create Ledger Batch for the Historical Daily Sale
  INSERT INTO public.ledger_batches (store_id, source_type, source_ref, status, created_by, posted_at)
  VALUES (p_store_id, 'historical_sale', 'Sheets Import: ' || p_date::text, 'POSTED', v_user_id, p_date::timestamptz)
  RETURNING id INTO v_batch_id;

  -- Debit Cash
  IF p_cash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_cash_account, 'Historical Cash Sale', ROUND(p_cash_amount, 2), 0);
  END IF;

  -- Debit Bank/bKash
  IF p_bkash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_bank_account, 'Historical bKash Sale', ROUND(p_bkash_amount, 2), 0);
  END IF;

  -- Credit Revenue
  IF v_total_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_revenue_account, 'Historical Gross Revenue', 0, v_total_amount);
  END IF;

  RETURN jsonb_build_object('status', 'SUCCESS', 'batch_id', v_batch_id, 'total_imported', v_total_amount);
END;
$$;


--
-- Name: is_admin_in_tenant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_in_tenant(p_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('admin', 'manager', 'advisor')
      AND tenant_id = p_tenant_id
  );
$$;


--
-- Name: is_ledger_worker_alive(text, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ledger_worker_alive(p_worker_id text, p_max_staleness interval DEFAULT '00:01:00'::interval) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ledger_workers w
    WHERE w.worker_id = p_worker_id
      AND w.active = true
      AND w.last_heartbeat >= now() - COALESCE(p_max_staleness, interval '60 seconds')
  );
$$;


--
-- Name: is_period_closed(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_period_closed(p_store_id uuid, p_posted_at timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.store_id = p_store_id
      AND ap.status = 'CLOSED'
      AND p_posted_at::date >= ap.period_start
      AND p_posted_at::date < ap.period_end
  );
$$;


--
-- Name: is_within_delivery_range(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_within_delivery_range(p_store_id uuid, p_customer_lat numeric, p_customer_lng numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_store_location geography(point);
    v_radius_km numeric;
    v_distance_meters numeric;
BEGIN
    -- Get store location
    SELECT location INTO v_store_location FROM public.stores WHERE id = p_store_id;
    
    -- Get store radius (default to 5km if not specified in delivery_zones)
    SELECT radius_km INTO v_radius_km FROM public.delivery_zones WHERE store_id = p_store_id;
    IF v_radius_km IS NULL THEN v_radius_km := 5; END IF;

    -- If store has no location, we can't check, so we assume out of range or return true?
    -- For safety, if no store location is set, we return false.
    IF v_store_location IS NULL THEN RETURN false; END IF;

    -- Calculate distance
    v_distance_meters := ST_Distance(
        v_store_location,
        ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography
    );

    RETURN v_distance_meters <= (v_radius_km * 1000);
END;
$$;


--
-- Name: issue_pos_override_token(uuid, text, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_pos_override_token(p_store_id uuid, p_reason text, p_affected_items jsonb DEFAULT '[]'::jsonb, p_ttl_minutes integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_plain_token text;
BEGIN
  SELECT id, role INTO v_user_id, v_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Manager/Admin role required'
    );
  END IF;

  v_plain_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.pos_override_tokens (
    store_id, issued_by, token_hash, reason, affected_items, expires_at
  ) VALUES (
    p_store_id,
    v_user_id,
    encode(digest(v_plain_token, 'sha256'), 'hex'),
    p_reason,
    COALESCE(p_affected_items, '[]'::jsonb),
    now() + make_interval(mins => GREATEST(1, p_ttl_minutes))
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'override_token', v_plain_token,
    'expires_at', (now() + make_interval(mins => GREATEST(1, p_ttl_minutes)))
  );
END;
$$;


--
-- Name: log_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Resolve the performing user (service_role calls may not have auth.uid())
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();

  INSERT INTO public.audit_logs (
    table_name,
    operation,
    primary_key,
    old_row,
    new_row,
    performed_by,
    performed_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
        WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) 
        ELSE to_jsonb(NEW) 
    END, -- Simplified primary key capture (entire row)
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_user_id,
    now()
  );
  RETURN NULL; -- trigger is AFTER, result ignored
END;
$$;


--
-- Name: log_customer_reminder(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_customer_reminder(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_type text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO customer_reminders (tenant_id, store_id, party_id, reminder_type, sent_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_type, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


--
-- Name: log_price_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_price_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Only log if price-related fields changed
    IF (OLD.price IS DISTINCT FROM NEW.price) OR 
       (OLD.mrp IS DISTINCT FROM NEW.mrp) OR 
       (OLD.cost IS DISTINCT FROM NEW.cost) THEN
        INSERT INTO price_audit_log (
            item_id,
            store_id,
            old_price,
            new_price,
            old_mrp,
            new_mrp,
            old_cost,
            new_cost,
            changed_by,
            source
        ) VALUES (
            NEW.id,
            public.get_current_user_store_id(),
            OLD.price,
            NEW.price,
            OLD.mrp,
            NEW.mrp,
            OLD.cost,
            NEW.cost,
            auth.uid(),
            'manual'
        );
    END IF;
    
    -- Always return NEW for AFTER triggers
    RETURN NEW;
END;
$$;


--
-- Name: log_sale_sync_conflict(uuid, text, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_sale_sync_conflict(p_store_id uuid, p_client_transaction_id text, p_conflict_type text, p_details jsonb DEFAULT '{}'::jsonb, p_requires_manager_review boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.sale_sync_conflicts (
    store_id,
    client_transaction_id,
    conflict_type,
    details,
    requires_manager_review
  )
  VALUES (
    p_store_id,
    p_client_transaction_id,
    p_conflict_type,
    COALESCE(p_details, '{}'::jsonb),
    p_requires_manager_review
  )
  ON CONFLICT (store_id, client_transaction_id, conflict_type)
  DO UPDATE SET
    details = EXCLUDED.details,
    requires_manager_review = EXCLUDED.requires_manager_review,
    status = CASE
      WHEN public.sale_sync_conflicts.status = 'resolved' THEN 'resolved'
      ELSE 'pending_review'
    END;
END;
$$;


--
-- Name: log_stock_ledger_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_stock_ledger_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Bypass trigger if the 'luckystore.bypass_trigger' config is set
  IF current_setting('luckystore.bypass_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Only log if quantity actually changed
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    INSERT INTO public.stock_ledger (
      store_id,
      product_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      transaction_type,
      reason,
      movement_id,
      metadata,
      performed_by
    ) VALUES (
      NEW.store_id,
      NEW.item_id,
      OLD.qty,
      NEW.qty,
      NEW.qty - OLD.qty,
      'system_adjustment',
      'Stock level adjusted via system',
      gen_random_uuid(),
      jsonb_build_object('update_type', CASE 
        WHEN NEW.qty > OLD.qty THEN 'restock'
        ELSE 'removal'
      END)
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: lookup_item_by_scan(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lookup_item_by_scan(p_barcode text, p_store_id uuid) RETURNS TABLE(item_id uuid, name text, price numeric, mrp numeric, stock integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        i.id AS item_id,
        i.name,
        i.price,
        i.mrp,
        COALESCE(sl.qty, 0)::integer AS stock
    FROM items i
    LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.barcode = p_barcode
    AND i.is_active = true
    LIMIT 1;
$$;


--
-- Name: mark_followup_resolved(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_followup_resolved(p_note_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
    UPDATE followup_notes
    SET status = 'resolved'
    WHERE id = p_note_id;
    RETURN FOUND;
END;
$$;


--
-- Name: pgrst_schema_cache_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pgrst_schema_cache_refresh() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_sleep(0);
END;
$$;


--
-- Name: ping(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ping() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN 'pong-' || extract(epoch from now())::text;
END;
$$;


--
-- Name: place_online_order(uuid, text, text, text, jsonb, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_online_order(p_store_id uuid, p_customer_name text, p_whatsapp text, p_address text, p_items jsonb, p_subtotal integer, p_delivery_fee integer, p_total integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_order_id uuid;
    v_order_number text;
    v_item jsonb;
    v_tenant_id uuid;
    v_available integer;
BEGIN
    -- Get tenant
    SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Store not found'; END IF;

    -- Generate order number
    v_order_number := 'LSO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    -- Insert order
    INSERT INTO public.online_orders (tenant_id, store_id, order_number, customer_name, customer_whatsapp, delivery_address, subtotal, delivery_fee, total)
    VALUES (v_tenant_id, p_store_id, v_order_number, p_customer_name, p_whatsapp, p_address, p_subtotal, p_delivery_fee, p_total)
    RETURNING id INTO v_order_id;

    -- Process items & reserve stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Check stock
        SELECT (qty - COALESCE(qty_reserved_online, 0)) INTO v_available 
        FROM public.stock_levels 
        WHERE store_id = p_store_id AND item_id = (v_item->>'product_id')::uuid FOR UPDATE;

        IF v_available IS NULL OR v_available < (v_item->>'quantity')::integer THEN
            RAISE EXCEPTION 'Insufficient stock for item %', v_item->>'product_id';
        END IF;

        -- Update reserved
        UPDATE public.stock_levels 
        SET qty_reserved_online = COALESCE(qty_reserved_online, 0) + (v_item->>'quantity')::integer
        WHERE store_id = p_store_id AND item_id = (v_item->>'product_id')::uuid;

        -- Insert item
        INSERT INTO public.online_order_items (order_id, item_id, quantity, unit_price, total_price)
        VALUES (
            v_order_id, 
            (v_item->>'product_id')::uuid, 
            (v_item->>'quantity')::integer, 
            (v_item->>'unit_price')::integer, 
            (v_item->>'quantity')::integer * (v_item->>'unit_price')::integer
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number);
END;
$$;


--
-- Name: post_draft_purchase_receipt(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.post_draft_purchase_receipt(p_receipt_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_receipt   RECORD;
  v_items     JSONB;
  v_result    JSONB;
BEGIN
  SELECT * INTO v_receipt
  FROM public.purchase_receipts
  WHERE id = p_receipt_id
  FOR UPDATE;

  IF v_receipt.id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  IF v_receipt.status <> 'draft' THEN
    RAISE EXCEPTION 'Receipt is already % (not draft)', v_receipt.status;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'item_id', pri.item_id,
      'quantity', pri.quantity,
      'unit_cost', pri.unit_cost
    )
  ) INTO v_items
  FROM public.purchase_receipt_items pri
  WHERE pri.receipt_id = p_receipt_id;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'No items found for this receipt';
  END IF;

  SELECT public.record_purchase_v2(
    'post_draft_' || p_receipt_id::TEXT || '_' || NOW()::TEXT,
    v_receipt.tenant_id,
    v_receipt.store_id,
    v_receipt.supplier_id,
    v_receipt.invoice_number,
    v_receipt.invoice_total,
    v_items,
    v_receipt.amount_paid,
    NULL,
    NULL,
    'posted',
    v_receipt.notes
  ) INTO v_result;

  UPDATE public.purchase_receipts
  SET status = 'posted',
      updated_at = NOW()
  WHERE id = p_receipt_id;

  RETURN v_result;
END;
$$;


--
-- Name: post_sale_to_ledger(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.post_sale_to_ledger(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_sale record;
  v_item record;
  v_payment record;
  v_batch_id uuid;
  v_revenue_account uuid;
  v_inventory_account uuid;
  v_cogs_account uuid;
  v_discount_account uuid;
  v_payment_account uuid;
  v_discount_absorption numeric(12,2) := 0;
  v_cogs_total numeric(12,2) := 0;
  v_gross_revenue numeric(12,2) := 0;
  v_existing_entries integer := 0;
  v_idem record;
BEGIN
  SELECT * INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id
  FOR UPDATE;

  IF v_sale.id IS NULL THEN
    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Sale not found');
  END IF;

  IF v_sale.accounting_posting_status = 'POSTED' AND v_sale.ledger_batch_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_sale.ledger_batch_id
    );
  END IF;

  IF public.is_period_closed(v_sale.store_id, COALESCE(v_sale.created_at, now())) THEN
    UPDATE public.sales
    SET accounting_posting_status = 'FAILED_POSTING',
        accounting_posting_error = 'period_closed'
    WHERE id = v_sale.id;

    INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_error, last_attempt_at)
    VALUES (v_sale.id, 'FAILED', 1, 'period_closed', now())
    ON CONFLICT (sale_id)
    DO UPDATE SET
      posting_state = 'FAILED',
      attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
      last_error = 'period_closed',
      last_attempt_at = now();

    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Accounting period is closed');
  END IF;

  INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_attempt_at)
  VALUES (v_sale.id, 'IN_PROGRESS', 1, now())
  ON CONFLICT (sale_id)
  DO UPDATE SET
    posting_state = CASE
      WHEN public.ledger_posting_idempotency.posting_state = 'POSTED' THEN 'POSTED'
      ELSE 'IN_PROGRESS'
    END,
    attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
    last_attempt_at = now()
  RETURNING * INTO v_idem;

  SELECT * INTO v_idem
  FROM public.ledger_posting_idempotency
  WHERE sale_id = v_sale.id
  FOR UPDATE;

  IF v_idem.posting_state = 'POSTED' AND v_idem.ledger_batch_id IS NOT NULL THEN
    UPDATE public.sales
    SET ledger_batch_id = COALESCE(v_sale.ledger_batch_id, v_idem.ledger_batch_id),
        accounting_posting_status = 'POSTED',
        accounting_posted_at = COALESCE(v_sale.accounting_posted_at, now()),
        accounting_posting_error = NULL
    WHERE id = v_sale.id;

    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_idem.ledger_batch_id
    );
  END IF;

  PERFORM public.ensure_sale_ledger_accounts(v_sale.store_id);

  SELECT id INTO v_batch_id
  FROM public.ledger_batches
  WHERE source_type = 'sale'
    AND source_id = v_sale.id
  LIMIT 1
  FOR UPDATE;

  IF v_batch_id IS NULL THEN
    INSERT INTO public.ledger_batches (
      store_id, source_type, source_id, source_ref, status, override_used, risk_flag, risk_note, created_by
    )
    VALUES (
      v_sale.store_id,
      'sale',
      v_sale.id,
      v_sale.client_transaction_id,
      'POSTED',
      false,
      false,
      NULL,
      v_sale.cashier_id
    )
    RETURNING id INTO v_batch_id;
  END IF;

  SELECT COUNT(*) INTO v_existing_entries
  FROM public.ledger_entries
  WHERE batch_id = v_batch_id;

  IF v_existing_entries > 0 THEN
    UPDATE public.sales
    SET ledger_batch_id = v_batch_id,
        accounting_posting_status = 'POSTED',
        accounting_posted_at = COALESCE(v_sale.accounting_posted_at, now()),
        accounting_posting_error = NULL
    WHERE id = v_sale.id;

    UPDATE public.ledger_posting_idempotency
    SET posting_state = 'POSTED',
        ledger_batch_id = v_batch_id,
        completed_at = now(),
        last_error = NULL,
        last_attempt_at = now()
    WHERE sale_id = v_sale.id;

    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_batch_id
    );
  END IF;

  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '4000_SALES_REVENUE';
  SELECT id INTO v_inventory_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '1200_INVENTORY';
  SELECT id INTO v_cogs_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5000_COGS';
  SELECT id INTO v_discount_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5100_DISCOUNT_ABSORPTION';

  FOR v_item IN
    SELECT si.*, i.mrp
    FROM public.sale_items si
    JOIN public.items i ON i.id = si.item_id
    WHERE si.sale_id = v_sale.id
  LOOP
    v_discount_absorption := v_discount_absorption + GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty;
    v_cogs_total := v_cogs_total + (v_item.cost * v_item.qty);
    v_gross_revenue := v_gross_revenue + v_item.line_total + (GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty);
  END LOOP;

  FOR v_payment IN
    SELECT row_number() OVER (ORDER BY sp.id) AS line_no, sp.*
    FROM public.sale_payments sp
    WHERE sp.sale_id = v_sale.id
  LOOP
    v_payment_account := public.resolve_payment_ledger_account(v_sale.store_id, v_payment.payment_method_id);
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id,
      v_payment_account,
      v_sale.id,
      format('payment_%s', v_payment.line_no),
      ROUND(v_payment.amount, 2),
      0,
      jsonb_build_object('payment_method_id', v_payment.payment_method_id, 'reference', v_payment.reference)
    );
  END LOOP;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_revenue_account, v_sale.id, 'gross_revenue', 0, ROUND(v_gross_revenue, 2),
    jsonb_build_object('recognized_from_fulfilled_qty_only', true)
  );

  IF ROUND(v_discount_absorption, 2) > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id, v_discount_account, v_sale.id, 'discount_absorption', ROUND(v_discount_absorption, 2), 0,
      jsonb_build_object('basis', 'mrp_minus_selling_price')
    );
  END IF;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_cogs_account, v_sale.id, 'cogs', ROUND(v_cogs_total, 2), 0,
    jsonb_build_object('source', 'sale_items.cost')
  );

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_inventory_account, v_sale.id, 'inventory_reduction', 0, ROUND(v_cogs_total, 2),
    jsonb_build_object('source', 'sale_items.cost')
  );

  UPDATE public.sales
  SET ledger_batch_id = v_batch_id,
      accounting_posting_status = 'POSTED',
      accounting_posted_at = now(),
      accounting_posting_error = NULL
  WHERE id = v_sale.id;

  UPDATE public.ledger_posting_idempotency
  SET posting_state = 'POSTED',
      ledger_batch_id = v_batch_id,
      completed_at = now(),
      last_error = NULL,
      last_attempt_at = now()
  WHERE sale_id = v_sale.id;

  RETURN jsonb_build_object(
    'status', 'POSTED',
    'sale_id', v_sale.id,
    'ledger_batch_id', v_batch_id
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.sales
  SET accounting_posting_status = 'FAILED_POSTING',
      accounting_posting_error = SQLERRM
  WHERE id = p_sale_id;

  INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_error, last_attempt_at)
  VALUES (p_sale_id, 'FAILED', 1, SQLERRM, now())
  ON CONFLICT (sale_id)
  DO UPDATE SET
    posting_state = 'FAILED',
    attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
    last_error = SQLERRM,
    last_attempt_at = now();

  RETURN jsonb_build_object(
    'status', 'FAILED_POSTING',
    'sale_id', p_sale_id,
    'message', SQLERRM
  );
END;
$$;


--
-- Name: prevent_inventory_movement_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_inventory_movement_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements is an append-only table. Updates are not allowed.';
END;
$$;


--
-- Name: prevent_ledger_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;


--
-- Name: prevent_sale_audit_log_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_sale_audit_log_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RAISE EXCEPTION 'sale_audit_log is immutable';
END;
$$;


--
-- Name: process_ledger_posting_batch(text, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_ledger_posting_batch(p_worker_id text, p_batch_size integer DEFAULT 50, p_store_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_job public.ledger_posting_queue%ROWTYPE;
  v_sale record;
  v_result jsonb;
  v_status text;
  v_processed integer := 0;
  v_posted integer := 0;
  v_retry integer := 0;
  v_failed integer := 0;
BEGIN
  PERFORM public.register_ledger_worker(p_worker_id);
  PERFORM public.heartbeat_ledger_worker(p_worker_id);
  PERFORM public.reclaim_stale_ledger_locks();

  FOR v_job IN
    SELECT *
    FROM public.claim_ledger_posting_jobs(
      p_worker_id,
      GREATEST(1, COALESCE(p_batch_size, 1)),
      p_store_id
    )
  LOOP
    v_processed := v_processed + 1;

    BEGIN
      PERFORM public.heartbeat_ledger_worker(p_worker_id);
      PERFORM public.renew_ledger_job_lease(p_worker_id, v_job.id);

      SELECT s.id, s.store_id, s.accounting_posting_status, s.ledger_batch_id, s.created_at
      INTO v_sale
      FROM public.sales s
      WHERE s.id = v_job.sale_id
      FOR UPDATE;

      IF v_sale.id IS NULL THEN
        UPDATE public.ledger_posting_queue
        SET status = 'FAILED',
            attempt_count = attempt_count + 1,
            next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
            last_error = 'sale_not_found',
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_failed := v_failed + 1;
        CONTINUE;
      END IF;

      IF v_sale.accounting_posting_status = 'POSTED' OR v_sale.ledger_batch_id IS NOT NULL THEN
        UPDATE public.ledger_posting_queue
        SET status = 'POSTED',
            last_error = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_posted := v_posted + 1;
        CONTINUE;
      END IF;

      v_result := public.post_sale_to_ledger(v_sale.id);
      v_status := COALESCE(v_result->>'status', 'FAILED_POSTING');

      IF v_status = 'POSTED' THEN
        UPDATE public.ledger_posting_queue
        SET status = 'POSTED',
            last_error = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_posted := v_posted + 1;
      ELSE
        UPDATE public.ledger_posting_queue
        SET status = CASE
              WHEN attempt_count + 1 >= max_attempts THEN 'FAILED'
              ELSE 'PENDING'
            END,
            attempt_count = attempt_count + 1,
            next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
            last_error = COALESCE(v_result->>'message', 'posting_failed'),
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;

        IF (SELECT status FROM public.ledger_posting_queue WHERE id = v_job.id) = 'FAILED' THEN
          v_failed := v_failed + 1;
        ELSE
          v_retry := v_retry + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.ledger_posting_queue
      SET status = CASE
            WHEN attempt_count + 1 >= max_attempts THEN 'FAILED'
            ELSE 'PENDING'
          END,
          attempt_count = attempt_count + 1,
          next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
          last_error = SQLERRM,
          locked_by = NULL,
          locked_at = NULL,
          lock_expires_at = NULL,
          updated_at = now()
      WHERE id = v_job.id;

      IF (SELECT status FROM public.ledger_posting_queue WHERE id = v_job.id) = 'FAILED' THEN
        v_failed := v_failed + 1;
      ELSE
        v_retry := v_retry + 1;
      END IF;
    END;
  END LOOP;

  PERFORM public.heartbeat_ledger_worker(p_worker_id);

  RETURN jsonb_build_object(
    'worker_id', p_worker_id,
    'processed', v_processed,
    'posted', v_posted,
    'retry_scheduled', v_retry,
    'failed', v_failed
  );
END;
$$;


--
-- Name: process_pending_ledger_postings(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_pending_ledger_postings(p_store_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_worker_id text := format('compat-worker-%s', replace(gen_random_uuid()::text, '-', ''));
BEGIN
  RETURN public.process_ledger_posting_batch(
    v_worker_id,
    GREATEST(1, COALESCE(p_limit, 1)),
    p_store_id
  );
END;
$$;


--
-- Name: receive_purchase_order(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receive_purchase_order(p_po_id uuid, p_received_items jsonb, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_po            public.purchase_orders%ROWTYPE;
  v_user_id       uuid;
  v_poi           public.purchase_order_items%ROWTYPE;
  v_recv_item     record;
  v_all_received  boolean;
  v_any_received  boolean := false;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock PO
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF v_po.id IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot receive a % purchase order', v_po.status;
  END IF;

  -- Process each received item
  FOR v_recv_item IN
    SELECT * FROM jsonb_to_recordset(p_received_items) AS x(po_item_id uuid, qty_received integer)
  LOOP
    IF v_recv_item.qty_received <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_poi FROM public.purchase_order_items WHERE id = v_recv_item.po_item_id AND po_id = p_po_id FOR UPDATE;
    IF v_poi.id IS NULL THEN RAISE EXCEPTION 'PO item not found: %', v_recv_item.po_item_id; END IF;

    -- Guard: can't receive more than ordered (minus already received)
    IF v_recv_item.qty_received > (v_poi.qty_ordered - v_poi.qty_received) THEN
      RAISE EXCEPTION 'Receiving % units exceeds remaining qty for item %', v_recv_item.qty_received, v_poi.item_id;
    END IF;

    -- Increment stock at destination store
    PERFORM public.adjust_stock(
      v_po.store_id,
      v_poi.item_id,
      v_recv_item.qty_received,
      'received',
      COALESCE(p_notes, 'PO Receipt: ' || v_po.po_number),
      v_user_id
    );

    -- Update po_item received qty
    UPDATE public.purchase_order_items
      SET qty_received = qty_received + v_recv_item.qty_received
      WHERE id = v_poi.id;

    v_any_received := true;
  END LOOP;

  IF NOT v_any_received THEN
    RAISE EXCEPTION 'No items were received';
  END IF;

  -- Recompute PO status
  SELECT bool_and(qty_received >= qty_ordered)
  INTO v_all_received
  FROM public.purchase_order_items
  WHERE po_id = p_po_id;

  UPDATE public.purchase_orders
    SET status = CASE WHEN v_all_received THEN 'received'::public.po_status ELSE 'partially_received'::public.po_status END,
        updated_by = v_user_id
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'new_status', CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END
  );
END;
$$;


--
-- Name: reclaim_stale_ledger_locks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reclaim_stale_ledger_locks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_reclaimed integer := 0;
BEGIN
  UPDATE public.ledger_posting_queue q
  SET status = 'PENDING',
      attempt_count = q.attempt_count + 1,
      next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(q.attempt_count, 6)), 300)),
      locked_by = NULL,
      locked_at = NULL,
      lock_expires_at = NULL,
      last_error = COALESCE(q.last_error, 'stale_lease_reclaimed'),
      updated_at = now()
  WHERE q.status = 'CLAIMED'
    AND q.lock_expires_at IS NOT NULL
    AND q.lock_expires_at < now()
    AND q.attempt_count < q.max_attempts
    AND (
      q.locked_by IS NULL
      OR public.is_ledger_worker_alive(q.locked_by, interval '60 seconds') IS NOT TRUE
    );

  GET DIAGNOSTICS v_reclaimed = ROW_COUNT;
  RETURN v_reclaimed;
END;
$$;


--
-- Name: record_cash_closing(text, uuid, uuid, uuid, numeric, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_cash_closing(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_actual_cash numeric, p_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
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
$$;


--
-- Name: record_customer_payment(uuid, numeric, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_customer_payment(p_party_id uuid, p_amount numeric, p_payment_method text, p_reference text DEFAULT NULL::text, p_collected_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_user_store_id UUID;
    v_party_store_id UUID;
    v_user_id UUID;
    v_ar_account_id UUID;
    v_payment_account_id UUID;
    v_batch_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Validate user session
    SELECT store_id, id INTO v_user_store_id, v_user_id
    FROM public.users
    WHERE auth_id = auth.uid();
    
    IF v_user_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User not authenticated');
    END IF;
    
    -- Verify party belongs to user's store
    SELECT store_id INTO v_party_store_id
    FROM public.parties
    WHERE id = p_party_id;
    
    IF v_party_store_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Party not found');
    END IF;
    
    IF v_party_store_id != v_user_store_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Permission denied: party does not belong to your store');
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Payment amount must be greater than zero');
    END IF;
    
    -- Get the Accounts Receivable ledger account (1300_ACCOUNTS_RECEIVABLE)
    SELECT id INTO v_ar_account_id
    FROM public.ledger_accounts
    WHERE code = '1300_ACCOUNTS_RECEIVABLE' 
    AND store_id = v_user_store_id;
    
    IF v_ar_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Accounts Receivable account not configured');
    END IF;
    
    -- Get the payment method ledger account (1000_CASH, 1110_BANK_MOBILE, etc.)
    SELECT la.id INTO v_payment_account_id
    FROM public.ledger_accounts la
    JOIN public.ledger_account_mappings lam ON lam.account_id = la.id
    JOIN public.payment_methods pm ON pm.id = lam.payment_method_id
    WHERE pm.store_id = v_user_store_id
    AND pm.type = p_payment_method
    LIMIT 1;
    
    -- Default to Cash (1000) if not found for the specific method
    IF v_payment_account_id IS NULL THEN
        SELECT id INTO v_payment_account_id
        FROM public.ledger_accounts
        WHERE code = '1000_CASH'
        AND store_id = v_user_store_id;
    END IF;
    
    IF v_payment_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Payment account not configured');
    END IF;
    
    -- Create a ledger batch for this collection
    INSERT INTO public.ledger_batches (
        store_id,
        transaction_date,
        description,
        status,
        created_by
    ) VALUES (
        v_user_store_id,
        CURRENT_DATE,
        'Payment collection - ' || COALESCE(p_reference, 'Cash payment'),
        'POSTED',
        COALESCE(p_collected_by, v_user_id)
    ) RETURNING id INTO v_batch_id;
    
    -- Create ledger entries
    -- Entry 1: Debit A/R (reducing receivable)
    INSERT INTO public.ledger_entries (
        batch_id,
        account_id,
        party_id,
        debit_amount,
        credit_amount,
        description,
        created_by
    ) VALUES (
        v_batch_id,
        v_ar_account_id,
        p_party_id,
        p_amount,
        0,
        'Payment received - ' || p_payment_method || COALESCE(' - Ref: ' || p_reference, ''),
        COALESCE(p_collected_by, v_user_id)
    );
    
    -- Entry 2: Credit Payment Account (increasing cash/bank)
    INSERT INTO public.ledger_entries (
        batch_id,
        account_id,
        party_id,
        debit_amount,
        credit_amount,
        description,
        created_by
    ) VALUES (
        v_batch_id,
        v_payment_account_id,
        NULL,
        0,
        p_amount,
        'Payment received - ' || p_payment_method || COALESCE(' - Ref: ' || p_reference, ''),
        COALESCE(p_collected_by, v_user_id)
    );
    
    -- Update party balance
    UPDATE public.parties
    SET current_balance = COALESCE((
        SELECT SUM(le.debit_amount - le.credit_amount)
        FROM public.ledger_entries le
        JOIN public.ledger_accounts la ON la.id = le.account_id
        JOIN public.ledger_batches lb ON lb.id = le.batch_id
        WHERE le.party_id = p_party_id
        AND la.code = '1300_ACCOUNTS_RECEIVABLE'
        AND lb.status != 'DELETED'
    ), 0)
    WHERE id = p_party_id
    RETURNING current_balance INTO v_new_balance;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'batch_id', v_batch_id,
        'payment_amount', p_amount,
        'new_balance', v_new_balance,
        'party_id', p_party_id,
        'payment_method', p_payment_method,
        'reference', p_reference
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$;


--
-- Name: FUNCTION record_customer_payment(p_party_id uuid, p_amount numeric, p_payment_method text, p_reference text, p_collected_by uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.record_customer_payment(p_party_id uuid, p_amount numeric, p_payment_method text, p_reference text, p_collected_by uuid) IS 'Records a customer payment and updates their account balance.
Parameters:
- p_party_id: UUID of the customer party
- p_amount: Payment amount (must be > 0)
- p_payment_method: Type of payment (cash, mobile_banking, card)
- p_reference: Optional reference number for non-cash payments
- p_collected_by: Optional UUID of the user collecting the payment';


--
-- Name: record_customer_payment(text, uuid, uuid, uuid, numeric, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_customer_payment(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_amount numeric, p_payment_account_id uuid, p_client_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_user_id UUID := auth.uid();
    v_new_balance NUMERIC;
BEGIN
    -- Idempotency check
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);
    IF v_ar_account_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'AR account not found');
    END IF;

    -- Create ledger batch (posting engine schema)
    INSERT INTO public.ledger_batches (store_id, source_type, source_id, source_ref, status, created_by)
    VALUES (p_store_id, 'customer_payment', p_party_id, COALESCE(p_client_transaction_id, p_idempotency_key), 'POSTED', v_user_id)
    RETURNING id INTO v_batch_id;

    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, p_payment_account_id, p_party_id,
        p_amount, 0, p_amount, 0,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_user_id, CURRENT_DATE
    );

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO public.ledger_entries (
        store_id, batch_id, account_id, party_id,
        debit, credit, debit_amount, credit_amount,
        reference_type, reference_id, notes, created_by, effective_date
    ) VALUES (
        p_store_id, v_batch_id, v_ar_account_id, p_party_id,
        0, p_amount, 0, p_amount,
        'CUSTOMER_PAYMENT', v_batch_id, p_notes, v_user_id, CURRENT_DATE
    );

    -- Calculate new balance from AR ledger
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_new_balance
    FROM public.ledger_entries
    WHERE store_id = p_store_id AND account_id = v_ar_account_id AND party_id = p_party_id;

    -- Update party balance
    UPDATE public.parties
    SET current_balance = v_new_balance
    WHERE id = p_party_id;

    -- Idempotency response
    v_response := jsonb_build_object(
        'status', 'success',
        'ledger_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );
    UPDATE public.idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM public.idempotency_keys
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;


--
-- Name: record_expense(uuid, date, text, text, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_expense(p_store_id uuid, p_date date, p_vendor text, p_description text, p_amount numeric, p_payment_type text, p_category text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_expense_id uuid;
  v_batch_id uuid;
  v_user_id uuid;
  v_debit_account uuid;
  v_credit_account uuid;
  v_account_code text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  PERFORM public.ensure_expense_ledger_accounts(p_store_id);

  -- Determine Debit Account based on Category
  CASE p_category
    WHEN 'Capital Expenditure' THEN v_account_code := '6000_CAPEX';
    WHEN 'Utility Expenses' THEN v_account_code := '5200_UTILITIES';
    WHEN 'Transport & Conveyance' THEN v_account_code := '5300_TRANSPORT';
    WHEN 'Staff salary' THEN v_account_code := '5400_SALARY';
    WHEN 'Partners Take' THEN v_account_code := '3100_PARTNERS_TAKE';
    ELSE v_account_code := '5500_MISC';
  END CASE;

  SELECT id INTO v_debit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = v_account_code;

  -- Determine Credit Account (Payment Source)
  IF p_payment_type = 'Cash' THEN
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  END IF;

  -- Insert Expense Record
  INSERT INTO public.expenses (store_id, expense_date, vendor_name, description, amount, payment_type, category, created_by)
  VALUES (p_store_id, p_date, p_vendor, p_description, p_amount, p_payment_type, p_category, v_user_id)
  RETURNING id INTO v_expense_id;

  -- Create Ledger Batch (Atomic Transaction)
  INSERT INTO public.ledger_batches (store_id, source_type, source_id, source_ref, status, created_by)
  VALUES (p_store_id, 'expense', v_expense_id, 'Expense to ' || p_vendor, 'POSTED', v_user_id)
  RETURNING id INTO v_batch_id;

  -- Post Debit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_debit_account, 'Expense Debit', ROUND(p_amount, 2), 0);

  -- Post Credit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_credit_account, 'Payment Credit', 0, ROUND(p_amount, 2));

  -- Link Batch to Expense
  UPDATE public.expenses SET ledger_batch_id = v_batch_id WHERE id = v_expense_id;

  RETURN jsonb_build_object('status', 'SUCCESS', 'expense_id', v_expense_id, 'batch_id', v_batch_id);
END;
$$;


--
-- Name: record_purchase(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_purchase(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text DEFAULT NULL::text, p_invoice_total numeric DEFAULT NULL::numeric, p_items jsonb DEFAULT '[]'::jsonb, p_amount_paid numeric DEFAULT 0, p_payment_account_id uuid DEFAULT NULL::uuid, p_payable_account_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'posted'::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: record_purchase_v2(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_purchase_v2(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text DEFAULT NULL::text, p_invoice_total numeric DEFAULT NULL::numeric, p_items jsonb DEFAULT '[]'::jsonb, p_amount_paid numeric DEFAULT 0, p_payment_account_id uuid DEFAULT NULL::uuid, p_payable_account_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'posted'::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_response            JSONB;
  v_receipt_id          UUID;
  v_batch_id            UUID;
  v_item                RECORD;
  v_total_cost          NUMERIC := 0;
  v_current_qty         NUMERIC;
  v_current_avg_cost    NUMERIC;
  v_new_avg_cost        NUMERIC;
  v_inventory_account_id UUID;
  v_user_id             UUID := auth.uid();
  v_supplier_type       TEXT;
  v_payable_amount      NUMERIC;
BEGIN
  -- 1. Idempotency check
  SELECT response_body INTO v_response
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key
    AND tenant_id = p_tenant_id
    AND completed_at IS NOT NULL;
  IF v_response IS NOT NULL THEN
    RETURN v_response;
  END IF;

  -- 2. Validate status
  IF p_status NOT IN ('draft', 'posted') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft or posted.', p_status;
  END IF;

  -- 3. Validate supplier
  SELECT type INTO v_supplier_type
  FROM public.parties
  WHERE id = p_supplier_id AND tenant_id = p_tenant_id;
  IF v_supplier_type IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  IF v_supplier_type <> 'supplier' THEN
    RAISE EXCEPTION 'Party is not a supplier (type: %)', v_supplier_type;
  END IF;

  -- 4. Duplicate invoice protection
  IF p_invoice_number IS NOT NULL AND p_invoice_number <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.purchase_receipts
      WHERE tenant_id = p_tenant_id
        AND supplier_id = p_supplier_id
        AND invoice_number = p_invoice_number
        AND status = 'posted'
    ) THEN
      RAISE EXCEPTION 'Duplicate invoice number % for this supplier', p_invoice_number;
    END IF;
  END IF;

  -- 5. Get inventory account
  SELECT id INTO v_inventory_account_id
  FROM public.accounts
  WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset'
  LIMIT 1;
  IF v_inventory_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory Asset account not configured';
  END IF;

  -- 6. Validate items
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided for purchase';
  END IF;

  -- 7. Calculate total cost
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  -- 8. Invoice validation
  IF p_invoice_total IS NOT NULL AND p_invoice_total > 0 THEN
    IF ABS(v_total_cost - p_invoice_total) > 1.00 THEN
      RAISE EXCEPTION 'Invoice total mismatch: calculated % but invoice says %', v_total_cost, p_invoice_total;
    END IF;
  END IF;

  -- 9. Validate payment
  IF p_amount_paid < 0 THEN
    RAISE EXCEPTION 'Amount paid cannot be negative';
  END IF;
  IF p_amount_paid > v_total_cost THEN
    RAISE EXCEPTION 'Amount paid exceeds total cost';
  END IF;

  -- 10. Create receipt
  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number,
    invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number,
    v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  -- 11. Draft early return
  IF p_status = 'draft' THEN
    v_response := jsonb_build_object(
      'status', 'success',
      'receipt_id', v_receipt_id,
      'total_cost', v_total_cost,
      'state', 'draft'
    );
    INSERT INTO public.idempotency_keys (idempotency_key, tenant_id, response_body, completed_at)
    VALUES (p_idempotency_key, p_tenant_id, v_response, NOW());
    RETURN v_response;
  END IF;

  -- 12. Create journal batch
  INSERT INTO public.journal_batches (tenant_id, store_id, created_by, status)
  VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
  RETURNING id INTO v_batch_id;

  -- 13. Process items and update cost
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    -- Validate item belongs to tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = v_item.item_id 
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Item % not found in tenant', v_item.item_id;
    END IF;

    -- Calculate weighted average
    SELECT COALESCE(SUM(quantity_change), 0) INTO v_current_qty
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id;

    SELECT weighted_average_cost INTO v_current_avg_cost
    FROM public.stock_movements
    WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;

    v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

    IF (v_current_qty + v_item.quantity) > 0 THEN
      v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost)
                      / (v_current_qty + v_item.quantity);
    ELSE
      v_new_avg_cost := v_item.unit_cost;
    END IF;

    -- Record stock movement
    INSERT INTO public.stock_movements (
      tenant_id, store_id, item_id, quantity_change,
      weighted_average_cost, reference_type, reference_id, created_by
    ) VALUES (
      p_tenant_id, p_store_id, v_item.item_id, v_item.quantity,
      v_new_avg_cost, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id
    );

    -- Record receipt item
    INSERT INTO public.purchase_receipt_items (receipt_id, item_id, quantity, unit_cost)
    VALUES (v_receipt_id, v_item.item_id, v_item.quantity, v_item.unit_cost);

    -- UPDATE ITEM COST (NEW)
    UPDATE public.items
    SET cost = v_new_avg_cost,
        updated_at = NOW()
    WHERE id = v_item.item_id;
  END LOOP;

  -- 14. Ledger entries
  INSERT INTO public.ledger_entries (
    tenant_id, store_id, journal_batch_id, account_id,
    debit_amount, party_id, reference_type, reference_id, created_by, notes
  ) VALUES (
    p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id,
    v_total_cost, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
    'Inventory from purchase receipt'
  );

  v_payable_amount := v_total_cost - p_amount_paid;

  -- Payment entry
  IF p_amount_paid > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      credit_amount, party_id, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payment_account_id,
      p_amount_paid, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Cash payment on purchase'
    );
  END IF;

  -- Payable entry
  IF v_payable_amount > 0 THEN
    INSERT INTO public.ledger_entries (
      tenant_id, store_id, journal_batch_id, account_id,
      credit_amount, party_id, reference_type, reference_id, created_by, notes
    ) VALUES (
      p_tenant_id, p_store_id, v_batch_id, p_payable_account_id,
      v_payable_amount, p_supplier_id, 'PURCHASE_RECEIPT', v_receipt_id, v_user_id,
      'Payable from purchase receipt'
    );
  END IF;

  -- 15. Build response
  v_response := jsonb_build_object(
    'status', 'success',
    'receipt_id', v_receipt_id,
    'batch_id', v_batch_id,
    'total_cost', v_total_cost,
    'amount_paid', p_amount_paid,
    'payable_amount', v_payable_amount,
    'state', 'posted'
  );

  INSERT INTO public.idempotency_keys (idempotency_key, tenant_id, response_body, completed_at)
  VALUES (p_idempotency_key, p_tenant_id, v_response, NOW());

  RETURN v_response;

EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
  RAISE;
END;
$$;


--
-- Name: FUNCTION record_purchase_v2(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text, p_invoice_total numeric, p_items jsonb, p_amount_paid numeric, p_payment_account_id uuid, p_payable_account_id uuid, p_status text, p_notes text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.record_purchase_v2(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text, p_invoice_total numeric, p_items jsonb, p_amount_paid numeric, p_payment_account_id uuid, p_payable_account_id uuid, p_status text, p_notes text) IS 'Record purchase receipt, update stock, and update item cost with weighted average';


--
-- Name: record_supplier_payment(uuid, numeric, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_supplier_payment(p_supplier_id uuid, p_amount numeric, p_payment_method text, p_reference text DEFAULT NULL::text, p_store_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_supplier record;
  v_current_outstanding numeric(12,2);
  v_store_id uuid;
  v_user_id uuid;
BEGIN
  -- Auth check
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Get supplier details and lock the row
  SELECT id, name, outstanding_balance, store_id
  INTO v_supplier
  FROM public.parties
  WHERE id = p_supplier_id AND type = 'supplier'
  FOR UPDATE;

  IF v_supplier IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  -- Validate store context
  IF p_store_id IS NOT NULL AND v_supplier.store_id != p_store_id THEN
    RAISE EXCEPTION 'Supplier does not belong to the current store';
  END IF;

  v_store_id := v_supplier.store_id;

  -- Validate amount
  v_current_outstanding := COALESCE(v_supplier.outstanding_balance, 0);
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  IF p_amount > v_current_outstanding THEN
    RAISE EXCEPTION 'Payment amount (৳%) exceeds outstanding balance (৳%)', 
      p_amount::text, v_current_outstanding::text;
  END IF;

  -- Validate reference for non-cash payments
  IF p_payment_method NOT IN ('cash') AND (p_reference IS NULL OR TRIM(p_reference) = '') THEN
    RAISE EXCEPTION 'Reference/transaction ID is required for % payments', p_payment_method;
  END IF;

  -- Create ledger transaction for the payment
  INSERT INTO public.ledger_accounts (
    store_id,
    transaction_type,
    transaction_date,
    description,
    debit_amount,
    credit_amount,
    party_id,
    party_type,
    payment_method,
    reference_number,
    created_by,
    created_at
  ) VALUES (
    v_store_id,
    'supplier_payment',
    CURRENT_DATE,
    'Payment to ' || v_supplier.name || ' - ' || COALESCE(p_payment_method, 'cash'),
    p_amount,  -- Debit: Payable is being reduced (liability decreased)
    0,         -- Credit: 0
    p_supplier_id,
    'supplier',
    COALESCE(p_payment_method, 'cash'),
    p_reference,
    v_user_id,
    NOW()
  ) RETURNING id INTO v_transaction_id;

  -- Update supplier outstanding balance (decreasing the payable)
  UPDATE public.parties
  SET 
    outstanding_balance = outstanding_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_supplier_id;

  RETURN v_transaction_id;
END;
$$;


--
-- Name: FUNCTION record_supplier_payment(p_supplier_id uuid, p_amount numeric, p_payment_method text, p_reference text, p_store_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.record_supplier_payment(p_supplier_id uuid, p_amount numeric, p_payment_method text, p_reference text, p_store_id uuid, p_user_id uuid) IS 'Records a payment to a supplier. Validates amount against outstanding balance, 
creates a ledger transaction, and updates supplier payable balance.';


--
-- Name: register_ledger_worker(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_ledger_worker(p_worker_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat)
  VALUES (p_worker_id, true, now())
  ON CONFLICT (worker_id) DO UPDATE
  SET active = true, last_heartbeat = now();
END;
$$;


--
-- Name: release_online_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_online_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_item record;
BEGIN
  -- Only trigger on status change to 'cancelled' or 'delivered'
  IF (NEW.status = 'cancelled' OR NEW.status = 'delivered') AND (OLD.status != 'cancelled' AND OLD.status != 'delivered') THEN
    FOR v_item IN SELECT * FROM public.online_order_items WHERE order_id = NEW.id
    LOOP
      -- Release products reservation
      UPDATE public.products 
      SET reserved_online = GREATEST(0, reserved_online - v_item.quantity)
      WHERE id = v_item.item_id;

      -- Release stock_levels reservation
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_levels' AND column_name='qty_reserved_online') THEN
        UPDATE public.stock_levels
        SET qty_reserved_online = GREATEST(0, COALESCE(qty_reserved_online, 0) - v_item.quantity)
        WHERE item_id = v_item.item_id
        AND store_id = NEW.store_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: renew_ledger_job_lease(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.renew_ledger_job_lease(p_worker_id text, p_queue_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF public.is_ledger_worker_alive(p_worker_id, interval '60 seconds') IS NOT TRUE THEN
    RETURN false;
  END IF;

  UPDATE public.ledger_posting_queue
  SET lock_expires_at = now() + interval '2 minutes',
      updated_at = now()
  WHERE id = p_queue_id
    AND status = 'CLAIMED'
    AND locked_by = p_worker_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;


--
-- Name: replay_sale_ledger_chain(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.replay_sale_ledger_chain(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_sale jsonb;
  v_items jsonb;
  v_payments jsonb;
  v_audit jsonb;
  v_batch jsonb;
  v_entries jsonb;
BEGIN
  SELECT to_jsonb(s.*) INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id;

  IF v_sale IS NULL THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND', 'message', 'Sale not found');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(si.*) ORDER BY si.id), '[]'::jsonb) INTO v_items
  FROM public.sale_items si
  WHERE si.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sp.*) ORDER BY sp.id), '[]'::jsonb) INTO v_payments
  FROM public.sale_payments sp
  WHERE sp.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sa.*) ORDER BY sa.created_at), '[]'::jsonb) INTO v_audit
  FROM public.sale_audit_log sa
  WHERE sa.sale_id = p_sale_id;

  SELECT to_jsonb(lb.*) INTO v_batch
  FROM public.ledger_batches lb
  WHERE lb.source_type = 'sale'
    AND lb.source_id = p_sale_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(le.*) ORDER BY le.id), '[]'::jsonb) INTO v_entries
  FROM public.ledger_entries le
  WHERE le.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'sale', v_sale,
    'sale_items', v_items,
    'sale_payments', v_payments,
    'sale_audit_log', v_audit,
    'ledger_batch', v_batch,
    'ledger_entries', v_entries
  );
END;
$$;


--
-- Name: reserve_online_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_online_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update the products table reservation counter
  UPDATE public.products 
  SET reserved_online = reserved_online + NEW.quantity
  WHERE id = NEW.item_id;
  
  -- Also update stock_levels if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_levels' AND column_name='qty_reserved_online') THEN
    UPDATE public.stock_levels
    SET qty_reserved_online = COALESCE(qty_reserved_online, 0) + NEW.quantity
    WHERE item_id = NEW.item_id
    AND store_id = (SELECT store_id FROM public.online_orders WHERE id = NEW.order_id);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: resolve_payment_ledger_account(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_payment_ledger_account(p_store_id uuid, p_payment_method_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_type public.payment_type;
  v_account uuid;
BEGIN
  SELECT pm.type INTO v_type
  FROM public.payment_methods pm
  WHERE pm.id = p_payment_method_id
    AND pm.store_id = p_store_id
  LIMIT 1;

  IF v_type = 'cash' THEN
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1010_BANK';
  END IF;

  RETURN v_account;
END;
$$;


--
-- Name: search_items_pos(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_items_pos(p_query text, p_store_id uuid) RETURNS TABLE(item_id uuid, name text, price numeric, stock integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        i.id AS item_id,
        i.name,
        i.price,
        COALESCE(sl.qty, 0)::integer AS stock
    FROM items i
    LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.is_active = true
    AND (i.name ILIKE '%' || p_query || '%' OR i.barcode = p_query OR i.sku = p_query)
    LIMIT 20;
$$;


--
-- Name: search_items_pos(uuid, text, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_items_pos(p_store_id uuid, p_query text DEFAULT ''::text, p_category_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT jsonb_agg(row_to_json(r))
  FROM (
    SELECT
      i.id,
      i.sku,
      i.barcode,
      i.short_code,
      i.name,
      i.brand,
      COALESCE(i.mrp, i.price) AS mrp,
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.category AS category,
      c.id AS category_id,
      COALESCE(sl.qty, 0) AS qty_on_hand
    FROM public.items i
    LEFT JOIN public.stock_levels sl
           ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.categories c
           ON c.id = i.category_id
    WHERE i.is_active = true
      AND (
        p_query = '' OR
        i.name        ILIKE '%' || p_query || '%' OR
        i.brand       ILIKE '%' || p_query || '%' OR
        i.sku         ILIKE '%' || p_query || '%' OR
        i.short_code  ILIKE '%' || p_query || '%' OR
        i.barcode     ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    ORDER BY i.name ASC
    LIMIT p_limit OFFSET p_offset
  ) r;
$$;


--
-- Name: search_products(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_products(search_query text, result_limit integer DEFAULT 20) RETURNS TABLE(id uuid, sku text, barcode text, name text, category_id text, cost numeric, price numeric, mrp numeric, image_url text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT 
    i.id, i.sku, i.barcode, i.name, i.category_id,
    i.cost, i.price, i.mrp, i.image_url, i.is_active
  FROM public.items i
  WHERE i.is_active = true
    AND (
      i.name ILIKE '%' || search_query || '%'
      OR i.sku ILIKE '%' || search_query || '%'
      OR i.barcode ILIKE '%' || search_query || '%'
    )
  ORDER BY i.created_at DESC
  LIMIT result_limit;
$$;


--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: set_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_new_quantity integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.stores s ON s.id = u.store_id
        WHERE u.auth_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        -- Create it (default 0)
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    -- If no change, just return success without logging
    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    -- Update the stock level
    UPDATE public.stock_levels
    SET qty = p_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Insert authoritative ledger entry
    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity
    );
END;
$$;


--
-- Name: set_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_new_quantity integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_operation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.stores s ON s.id = u.store_id
        WHERE u.auth_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    UPDATE public.stock_levels
    SET qty = p_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity
    );
END;
$$;


--
-- Name: set_stock(uuid, uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_stock(p_store_id uuid, p_item_id uuid, p_new_qty integer, p_reason text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_current_qty integer;
  v_delta integer;
  v_user_id uuid;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Get current qty
  SELECT COALESCE(qty, 0) INTO v_current_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  v_delta := p_new_qty - v_current_qty;

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('status', 'no_change', 'qty', v_current_qty);
  END IF;

  RETURN public.adjust_stock(
    p_store_id,
    p_item_id,
    v_delta,
    p_reason,
    p_notes,
    v_user_id
  );
END;
$$;


--
-- Name: set_updated_at_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: sync_offline_orders(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_offline_orders(p_orders jsonb) RETURNS TABLE(order_id uuid, status text, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_order JSONB;
  v_order_id UUID;
  v_store_id UUID;
  v_user_id UUID;
  v_idempotency_key TEXT;
  v_order_total DECIMAL(15,2);
  v_item JSONB;
  v_payment JSONB;
  v_conflict_exists BOOLEAN;
BEGIN
  -- Get current user's store_id
  SELECT store_id, id INTO v_store_id, v_user_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a store';
  END IF;

  -- Process each order
  FOR v_order IN SELECT * FROM jsonb_array_elements(p_orders) LOOP
    BEGIN
      -- Extract order data
      v_order_id := (v_order->>'id')::UUID;
      v_idempotency_key := v_order->>'idempotency_key';
      v_order_total := (v_order->>'total')::DECIMAL;
      
      -- Check if order already exists (idempotency check)
      SELECT EXISTS (
        SELECT 1 FROM public.sales WHERE id = v_order_id
      ) INTO v_conflict_exists;
      
      IF v_conflict_exists THEN
        -- Order already synced, return success
        RETURN QUERY SELECT v_order_id, 'success'::TEXT, 'Order already synchronized'::TEXT;
        CONTINUE;
      END IF;
      
      -- Validate that the order belongs to the user's store
      IF (v_order->>'store_id')::UUID != v_store_id THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Order does not belong to user store'::TEXT;
        CONTINUE;
      END IF;
      
      -- Validate that the order was created by this user
      IF (v_order->>'created_by')::UUID != v_user_id THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Order not created by current user'::TEXT;
        CONTINUE;
      END IF;
      
      -- Start transaction for this order
      BEGIN
        -- Insert the order
        INSERT INTO public.sales (
          id,
          store_id,
          total,
          subtotal,
          discount,
          tax,
          payment_type,
          status,
          notes,
          created_by,
          created_at,
          updated_at,
          synced_at
        ) VALUES (
          v_order_id,
          (v_order->>'store_id')::UUID,
          (v_order->>'total')::DECIMAL,
          (v_order->>'subtotal')::DECIMAL,
          COALESCE((v_order->>'discount')::DECIMAL, 0),
          COALESCE((v_order->>'tax')::DECIMAL, 0),
          (v_order->>'payment_type')::payment_type,
          COALESCE(v_order->>'status', 'completed'),
          v_order->>'notes',
          v_user_id,
          (v_order->>'created_at')::TIMESTAMP,
          (v_order->>'created_at')::TIMESTAMP,
          NOW()
        );
        
        -- Insert order items
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_order->'items') LOOP
          INSERT INTO public.sale_items (
            id,
            sale_id,
            item_id,
            quantity,
            unit_price,
            total_price,
            discount,
            created_at
          ) VALUES (
            (v_item->>'id')::UUID,
            v_order_id,
            (v_item->>'item_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'discount')::DECIMAL, 0),
            (v_item->>'created_at')::TIMESTAMP
          );
        END LOOP;
        
        -- Insert payments
        FOR v_payment IN SELECT * FROM jsonb_array_elements(v_order->'payments') LOOP
          INSERT INTO public.sale_payments (
            id,
            sale_id,
            amount,
            payment_type,
            reference_number,
            created_at
          ) VALUES (
            (v_payment->>'id')::UUID,
            v_order_id,
            (v_payment->>'amount')::DECIMAL,
            (v_payment->>'payment_type')::payment_type,
            v_payment->>'reference_number',
            (v_payment->>'created_at')::TIMESTAMP
          );
        END LOOP;
        
        -- Insert idempotency key
        INSERT INTO public.idempotency_keys (key, created_at)
        VALUES (v_idempotency_key, NOW())
        ON CONFLICT (key) DO NOTHING;
        
        -- Return success
        RETURN QUERY SELECT v_order_id, 'success'::TEXT, 'Order synchronized successfully'::TEXT;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Rollback this order and return error
          RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Failed to synchronize: ' || SQLERRM::TEXT;
      END;
      
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT v_order_id, 'error'::TEXT, 'Unexpected error: ' || SQLERRM::TEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;


--
-- Name: sync_user_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_name() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.name := NEW.full_name;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_cleanup_competitor_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_cleanup_competitor_prices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    row_count int;
begin
    select count(*) into row_count from public.competitor_prices;
    
    if row_count % 1000 = 0 then
        perform public.cleanup_old_competitor_prices();
    end if;
    
    return new;
end;
$$;


--
-- Name: update_competitor_price_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_competitor_price_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
begin
  new.last_updated = now();
  return new;
end;
$$;


--
-- Name: update_item_prices(uuid, uuid, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_item_prices(p_item_id uuid, p_tenant_id uuid, p_price numeric, p_mrp numeric DEFAULT NULL::numeric, p_cost numeric DEFAULT NULL::numeric) RETURNS TABLE(item_id uuid, item_name text, item_sku text, item_price numeric, item_mrp numeric, item_cost numeric, item_updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_new_id UUID;
    v_new_name TEXT;
    v_new_sku TEXT;
    v_new_price NUMERIC;
    v_new_mrp NUMERIC;
    v_new_cost NUMERIC;
    v_new_updated_at TIMESTAMPTZ;
BEGIN
    -- Verify item belongs to tenant (handle NULL tenant_id for legacy items)
    PERFORM 1 FROM items 
    WHERE id = p_item_id AND (tenant_id = p_tenant_id OR tenant_id IS NULL);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found or access denied';
    END IF;
    
    -- Also update NULL tenant_id to current user's tenant
    UPDATE items SET tenant_id = p_tenant_id 
    WHERE id = p_item_id AND tenant_id IS NULL;
    
    -- Perform update
    UPDATE items 
    SET 
        price = p_price,
        mrp = COALESCE(p_mrp, items.mrp),
        cost = COALESCE(p_cost, items.cost),
        updated_at = NOW()
    WHERE id = p_item_id 
      AND tenant_id = p_tenant_id
    RETURNING 
        items.id,
        items.name,
        items.sku,
        items.price,
        items.mrp,
        items.cost,
        items.updated_at
    INTO v_new_id, v_new_name, v_new_sku, v_new_price, v_new_mrp, v_new_cost, v_new_updated_at;
    
    RETURN QUERY SELECT 
        v_new_id,
        v_new_name,
        v_new_sku,
        v_new_price,
        v_new_mrp,
        v_new_cost,
        v_new_updated_at;
END;
$$;


--
-- Name: FUNCTION update_item_prices(p_item_id uuid, p_tenant_id uuid, p_price numeric, p_mrp numeric, p_cost numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_item_prices(p_item_id uuid, p_tenant_id uuid, p_price numeric, p_mrp numeric, p_cost numeric) IS 'Update item prices with audit logging. Returns updated item row.';


--
-- Name: update_online_order_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_online_order_status(p_order_id uuid, p_new_status text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_order record;
    v_item record;
BEGIN
    SELECT * INTO v_order FROM public.online_orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Releasing reservations on cancel
    IF p_new_status = 'cancelled' AND v_order.status IN ('pending', 'preparing', 'out_for_delivery') THEN
        FOR v_item IN SELECT * FROM public.online_order_items WHERE order_id = p_order_id
        LOOP
            UPDATE public.stock_levels 
            SET qty_reserved_online = GREATEST(0, COALESCE(qty_reserved_online, 0) - v_item.quantity)
            WHERE store_id = v_order.store_id AND item_id = v_item.item_id;
        END LOOP;
    
    -- Fulfillment: free reservation and permanently deduct actual stock via secure ledger RPC
    ELSIF p_new_status = 'delivered' AND v_order.status != 'delivered' THEN
        FOR v_item IN SELECT * FROM public.online_order_items WHERE order_id = p_order_id
        LOOP
            UPDATE public.stock_levels 
            SET qty_reserved_online = GREATEST(0, COALESCE(qty_reserved_online, 0) - v_item.quantity)
            WHERE store_id = v_order.store_id AND item_id = v_item.item_id;

            -- Deduct stock securely via the core ledger RPC!
            PERFORM public.deduct_stock(
                v_order.store_id, 
                v_item.item_id, 
                v_item.quantity, 
                jsonb_build_object('order_id', p_order_id, 'source', 'online_delivery')
            );
        END LOOP;
    END IF;

    UPDATE public.online_orders 
    SET status = p_new_status, cancellation_reason = COALESCE(p_reason, cancellation_reason), updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_receipt_config_simple(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_receipt_config_simple(p_store_id uuid, p_store_name text, p_header_text text, p_footer_text text) RETURNS public.receipt_config
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.receipt_config (store_id, store_name, header_text, footer_text)
  VALUES (p_store_id, p_store_name, p_header_text, p_footer_text)
  ON CONFLICT (store_id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    header_text = EXCLUDED.header_text,
    footer_text = EXCLUDED.footer_text;

  RETURN (SELECT * FROM public.receipt_config WHERE store_id = p_store_id);
END;
$$;


--
-- Name: update_reminder(uuid, text, text, date, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reminder(p_reminder_id uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_reminder_date date DEFAULT NULL::date, p_reminder_type text DEFAULT NULL::text, p_is_completed boolean DEFAULT NULL::boolean) RETURNS public.reminders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    updated_row reminders%ROWTYPE;
BEGIN
    UPDATE reminders r
    SET
        title = COALESCE(p_title, r.title),
        description = COALESCE(p_description, r.description),
        reminder_date = COALESCE(p_reminder_date, r.reminder_date),
        reminder_type = COALESCE(p_reminder_type, r.reminder_type),
        is_completed = COALESCE(p_is_completed, r.is_completed),
        updated_at = now()
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
    RETURNING * INTO updated_row;

    IF updated_row.id IS NULL THEN
        RAISE EXCEPTION 'Reminder not found or access denied';
    END IF;

    RETURN updated_row;
END;
$$;


--
-- Name: update_staff_pin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_staff_pin(p_user_id uuid, p_pin text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_caller_tenant_id uuid;
  v_target_tenant_id uuid;
BEGIN
  -- 1) Validate pin input format (exactly 4 digits)
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 numeric digits';
  END IF;

  -- 2) Resolve caller's tenant isolation context
  SELECT tenant_id INTO v_caller_tenant_id 
  FROM public.users 
  WHERE auth_id = auth.uid();

  -- 3) Resolve target user's tenant isolation context
  SELECT tenant_id INTO v_target_tenant_id 
  FROM public.users 
  WHERE id = p_user_id;

  -- 4) Security assertion: tenant matching or caller is super-admin
  IF v_caller_tenant_id IS NULL OR v_target_tenant_id IS NULL OR v_caller_tenant_id <> v_target_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant mismatch';
  END IF;

  -- 5) Update the PIN hashes
  UPDATE public.users
  SET pos_pin_hash = crypt(p_pin, gen_salt('bf')),
      pos_pin = p_pin -- Keep backward compatibility
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$_$;


--
-- Name: FUNCTION update_staff_pin(p_user_id uuid, p_pin text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_staff_pin(p_user_id uuid, p_pin text) IS 'Securely updates a store staff member PIN with isolation check.';


--
-- Name: update_stock_transfer_status(uuid, public.stock_transfer_status, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stock_transfer_status(p_transfer_id uuid, p_new_status public.stock_transfer_status, p_notes text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_transfer public.stock_transfers%ROWTYPE;
  v_user_id uuid;
  v_item record;
  v_from_store_name text;
  v_to_store_name text;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock row
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF v_transfer.id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  -- Validate state transition
  IF v_transfer.status = 'completed' OR v_transfer.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update a completed or cancelled transfer';
  END IF;

  IF v_transfer.status = 'pending' AND p_new_status = 'completed' THEN
    RAISE EXCEPTION 'Transfer must be in_transit before being completed';
  END IF;

  IF v_transfer.status = p_new_status THEN
    RETURN true; -- No-op
  END IF;

  -- Get store names for logs
  SELECT name INTO v_from_store_name FROM public.stores WHERE id = v_transfer.from_store_id;
  SELECT name INTO v_to_store_name FROM public.stores WHERE id = v_transfer.to_store_id;

  -- TRANSITION: pending -> in_transit
  IF v_transfer.status = 'pending' AND p_new_status = 'in_transit' THEN
    -- Decrement stock from source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        -v_item.qty, 
        'transfer_out', 
        COALESCE(p_notes, 'Transfer to ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> completed
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'completed' THEN
    -- Increment stock at destination
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.to_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'transfer_in', 
        COALESCE(p_notes, 'Transfer from ' || v_from_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> cancelled
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'cancelled' THEN
    -- Rollback stock to source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'correction', 
        'Cancelled transfer recovery from ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')', 
        v_user_id
      );
    END LOOP;
  END IF;

  -- Save status update
  UPDATE public.stock_transfers 
  SET 
    status = p_new_status, 
    updated_by = v_user_id,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END
  WHERE id = p_transfer_id;

  RETURN true;
END;
$$;


--
-- Name: update_store_user(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_store_user(p_user_id uuid, p_updates jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_updater_role text;
    v_target_role text;
    v_result jsonb;
BEGIN
    -- Get updater's role
    SELECT role INTO v_updater_role
    FROM public.users WHERE auth_id = auth.uid();

    -- Only admin/manager can update
    IF v_updater_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins or managers can update users';
    END IF;

    -- Get target user's role
    SELECT role INTO v_target_role
    FROM public.users WHERE id = p_user_id;

    -- Only admin can update admin users
    IF v_target_role = 'admin' AND v_updater_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can modify admin users';
    END IF;

    -- Build dynamic update
    UPDATE public.users SET
        full_name = COALESCE((p_updates->>'name')::text, full_name),
        role = COALESCE((p_updates->>'role')::text, role),
        pos_pin = COALESCE((p_updates->>'pos_pin')::text, pos_pin)
    WHERE id = p_user_id
    RETURNING to_jsonb(users.*) INTO v_result;

    RETURN v_result;
END;
$$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: update_user_last_login(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_last_login() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE auth_id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: upsert_stock_level(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_stock_level(p_store_id uuid, p_item_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, p_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = public.stock_levels.qty + p_quantity;
END;
$$;


--
-- Name: validate_sale_intent(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_sale_intent(p_snapshot jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_store_id uuid;
  v_trace_id text;
  v_item record;
  v_live_item record;
BEGIN
  v_store_id := NULLIF(p_snapshot->>'store_id', '')::uuid;
  v_trace_id := p_snapshot->>'transaction_trace_id';

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object(
      'validation_status', 'INSUFFICIENT_STOCK',
      'message', 'Missing store_id in snapshot',
      'transaction_trace_id', v_trace_id
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_snapshot->'items', '[]'::jsonb)) AS x(
      product_id uuid,
      quantity integer,
      unit_price_snapshot numeric,
      stock_snapshot integer
    )
  LOOP
    SELECT
      i.id,
      i.active,
      i.name,
      i.price,
      COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
    INTO v_live_item
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = v_store_id
    WHERE i.id = v_item.product_id;

    IF v_live_item.id IS NULL OR v_live_item.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'validation_status', 'INSUFFICIENT_STOCK',
        'message', 'Item is missing or inactive',
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF v_live_item.qty_on_hand < COALESCE(v_item.quantity, 0) THEN
      RETURN jsonb_build_object(
        'validation_status', 'INSUFFICIENT_STOCK',
        'message', format('Insufficient stock for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF ROUND(COALESCE(v_live_item.price, 0), 2) >
       ROUND(COALESCE(v_item.unit_price_snapshot, 0), 2) THEN
      RETURN jsonb_build_object(
        'validation_status', 'REQUIRES_OVERRIDE',
        'message', format('Price increased for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF ROUND(COALESCE(v_live_item.price, 0), 2) <>
       ROUND(COALESCE(v_item.unit_price_snapshot, 0), 2) THEN
      RETURN jsonb_build_object(
        'validation_status', 'PRICE_CHANGED',
        'message', format('Price changed for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'validation_status', 'VALID',
    'message', 'Sale intent is valid',
    'transaction_trace_id', v_trace_id
  );
END;
$$;


--
-- Name: validate_trial_balance(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_trial_balance(p_store_id uuid, p_period_start date, p_period_end date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_debits numeric(14,2) := 0;
  v_credits numeric(14,2) := 0;
BEGIN
  SELECT COALESCE(SUM(le.debit), 0), COALESCE(SUM(le.credit), 0)
  INTO v_debits, v_credits
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at::date >= p_period_start
    AND lb.posted_at::date < p_period_end
    AND lb.status = 'POSTED';

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_debits', ROUND(v_debits, 2),
    'total_credits', ROUND(v_credits, 2),
    'is_balanced', ROUND(v_debits, 2) = ROUND(v_credits, 2)
  );
END;
$$;


--
-- Name: void_sale(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.void_sale(p_sale_id uuid, p_reason text DEFAULT 'Voided by manager'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_sale    public.sales%ROWTYPE;
  v_item    record;
BEGIN
  -- Auth: manager/admin only
  SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = (SELECT auth.uid()) AND role IN ('admin','manager');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Only managers and admins can void sales';
  END IF;

  -- Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot void a sale with status: %', v_sale.status;
  END IF;

  -- Restore stock for each line item
  FOR v_item IN
    SELECT item_id, qty FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.adjust_stock(
      v_sale.store_id,
      v_item.item_id,
      v_item.qty,          -- positive = restore
      'void',
      'Void: ' || v_sale.sale_number,
      v_user_id
    );
  END LOOP;

  -- Mark sale voided
  UPDATE public.sales
    SET status      = 'voided',
        voided_by   = v_user_id,
        voided_at   = now(),
        void_reason = p_reason
    WHERE id = p_sale_id;

  -- Adjust session totals
  IF v_sale.session_id IS NOT NULL THEN
    UPDATE public.pos_sessions
      SET total_sales = total_sales - v_sale.total_amount
      WHERE id = v_sale.session_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',     p_sale_id,
    'sale_number', v_sale.sale_number,
    'status',      'voided'
  );
END;
$$;


--
-- Name: _schema_refresh_trigger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._schema_refresh_trigger (
    id integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: _schema_refresh_trigger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._schema_refresh_trigger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _schema_refresh_trigger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._schema_refresh_trigger_id_seq OWNED BY public._schema_refresh_trigger.id;


--
-- Name: accounting_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounting_periods_check CHECK ((period_end > period_start)),
    CONSTRAINT accounting_periods_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text])))
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    operation text NOT NULL,
    primary_key jsonb NOT NULL,
    old_row jsonb,
    new_row jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_operation_check CHECK ((operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batches (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    item_id uuid,
    batch_code text,
    supplier text,
    qty integer DEFAULT 0 NOT NULL,
    expiry_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cart_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb,
    store_id uuid,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    category text NOT NULL,
    tenant_id uuid,
    store_id uuid,
    name text,
    image_url text,
    color text,
    icon text,
    slug text,
    emoji text,
    display_order integer DEFAULT 0,
    active boolean DEFAULT true
);


--
-- Name: close_review_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_review_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    session_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL,
    reviewer_role text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    queue_pending_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    conflict_count integer DEFAULT 0 NOT NULL,
    last_sync_success_at timestamp with time zone,
    close_status text NOT NULL,
    acknowledgement_confirmed boolean DEFAULT false NOT NULL,
    notes text,
    admin_override boolean DEFAULT false NOT NULL,
    override_reason text,
    override_reason_category text,
    override_notes text,
    dual_approval_required boolean DEFAULT false NOT NULL,
    secondary_approver_user_id uuid,
    secondary_approver_role text,
    opening_cash numeric(15,2) DEFAULT 0,
    cash_sales numeric(15,2) DEFAULT 0,
    expected_drawer numeric(15,2) DEFAULT 0,
    actual_cash numeric(15,2) DEFAULT 0,
    variance_amount numeric(15,2) DEFAULT 0,
    variance_status text DEFAULT 'balanced'::text,
    variance_threshold_exceeded boolean DEFAULT false,
    manager_override_required boolean DEFAULT false,
    manager_override_pin_verified boolean DEFAULT false,
    variance_notes text,
    CONSTRAINT close_review_log_admin_override_requires_category_check CHECK (((admin_override = false) OR ((override_reason_category IS NOT NULL) AND (btrim(override_reason_category) <> ''::text)))),
    CONSTRAINT close_review_log_close_status_check CHECK ((close_status = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text]))),
    CONSTRAINT close_review_log_conflict_count_check CHECK ((conflict_count >= 0)),
    CONSTRAINT close_review_log_dual_approval_requires_secondary_check CHECK (((dual_approval_required = false) OR ((secondary_approver_user_id IS NOT NULL) AND (secondary_approver_role IS NOT NULL)))),
    CONSTRAINT close_review_log_failed_count_check CHECK ((failed_count >= 0)),
    CONSTRAINT close_review_log_override_reason_category_check CHECK (((override_reason_category IS NULL) OR (override_reason_category = ANY (ARRAY['internet outage'::text, 'queue corruption'::text, 'emergency close'::text, 'manager absence'::text, 'system incident'::text, 'other'::text])))),
    CONSTRAINT close_review_log_queue_pending_count_check CHECK ((queue_pending_count >= 0)),
    CONSTRAINT close_review_log_reviewer_role_check CHECK ((reviewer_role = ANY (ARRAY['manager'::text, 'admin'::text, 'owner'::text]))),
    CONSTRAINT close_review_log_secondary_approver_role_check CHECK (((secondary_approver_role IS NULL) OR (secondary_approver_role = ANY (ARRAY['admin'::text, 'owner'::text])))),
    CONSTRAINT close_review_log_variance_requires_override_check CHECK (((variance_threshold_exceeded = false) OR ((variance_threshold_exceeded = true) AND (manager_override_required = true) AND (admin_override = true)))),
    CONSTRAINT close_review_log_variance_status_check CHECK ((variance_status = ANY (ARRAY['balanced'::text, 'over'::text, 'short'::text])))
);


--
-- Name: COLUMN close_review_log.opening_cash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.opening_cash IS 'Opening cash amount at session start';


--
-- Name: COLUMN close_review_log.cash_sales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.cash_sales IS 'Total cash sales during the session';


--
-- Name: COLUMN close_review_log.expected_drawer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.expected_drawer IS 'Expected drawer amount (opening + cash sales)';


--
-- Name: COLUMN close_review_log.actual_cash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.actual_cash IS 'Actual cash count by cashier';


--
-- Name: COLUMN close_review_log.variance_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.variance_amount IS 'Difference between expected and actual (actual - expected)';


--
-- Name: COLUMN close_review_log.variance_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.variance_status IS 'balanced, over, or short';


--
-- Name: COLUMN close_review_log.variance_threshold_exceeded; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.variance_threshold_exceeded IS 'True if variance exceeds threshold (50 Taka)';


--
-- Name: COLUMN close_review_log.manager_override_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.manager_override_required IS 'True if manager override is required for this variance';


--
-- Name: COLUMN close_review_log.manager_override_pin_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.manager_override_pin_verified IS 'True if manager PIN was verified for override';


--
-- Name: COLUMN close_review_log.variance_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.close_review_log.variance_notes IS 'Additional notes about the variance explanation';


--
-- Name: competitor_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitor_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    item_id uuid,
    product_name text NOT NULL,
    product_sku text,
    competitor_name text NOT NULL,
    competitor_product_id text,
    competitor_product_url text,
    competitor_price numeric(12,2) NOT NULL,
    competitor_original_price numeric(12,2),
    currency text DEFAULT 'BDT'::text,
    our_price numeric(12,2),
    price_gap_percent numeric(5,2),
    scraped_at timestamp with time zone DEFAULT now() NOT NULL,
    scrape_batch_id uuid DEFAULT gen_random_uuid(),
    scrape_status text DEFAULT 'success'::text,
    error_message text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credit_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    sale_id uuid,
    amount numeric(12,2) NOT NULL,
    type text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    party_id uuid NOT NULL,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['whatsapp'::text, 'call'::text, 'manual'::text])))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    phone_whatsapp text,
    credit_limit numeric(12,2) DEFAULT 0,
    balance numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    sale_date date NOT NULL,
    cash_amount numeric(12,2) DEFAULT 0,
    bkash_amount numeric(12,2) DEFAULT 0,
    credit_amount numeric(12,2) DEFAULT 0,
    total_sales numeric(12,2) DEFAULT 0,
    stock_purchase numeric(12,2) DEFAULT 0,
    daily_expense numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE daily_sales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_sales IS 'Daily sales summary data imported from historical records';


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    store_lat numeric(10,8) NOT NULL,
    store_lng numeric(11,8) NOT NULL,
    radius_km numeric(5,2) DEFAULT 5.0 NOT NULL,
    delivery_fee numeric(12,2) DEFAULT 40 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    type public.discount_type DEFAULT 'percentage'::public.discount_type NOT NULL,
    value numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_value_check CHECK ((value >= (0)::numeric))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    expense_date date NOT NULL,
    vendor_name text NOT NULL,
    description text NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_type text NOT NULL,
    category text NOT NULL,
    ledger_batch_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_payment_type_check CHECK ((payment_type = ANY (ARRAY['Cash'::text, 'Bank transfer'::text, 'Bkash'::text, 'Card'::text])))
);


--
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expenses IS 'Expenses - deduplicated on store_id+date+vendor+description+amount';


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sku text,
    barcode text,
    name text NOT NULL,
    category_id uuid,
    description text,
    cost numeric(15,2) DEFAULT 0,
    price numeric(15,2) DEFAULT 0,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    short_code text,
    brand text,
    group_tag text,
    mrp numeric,
    tenant_id uuid
);


--
-- Name: TABLE items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.items IS 'Products/items - deduplicated on barcode+tenant OR name+tenant if no barcode';


--
-- Name: featured_products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.featured_products AS
 SELECT id,
    sku,
    barcode,
    name,
    category_id,
    cost,
    price,
    mrp,
    image_url,
    is_active,
    created_at
   FROM public.items
  WHERE (is_active = true)
  ORDER BY created_at DESC
 LIMIT 20;


--
-- Name: followup_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.followup_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    party_id uuid NOT NULL,
    note_text text NOT NULL,
    promise_to_pay_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT followup_notes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: homepage_categories; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.homepage_categories AS
 SELECT DISTINCT ON (category_id) category_id AS id,
    (category_id)::text AS name,
    count(*) OVER (PARTITION BY category_id) AS product_count
   FROM public.items
  WHERE ((is_active = true) AND (category_id IS NOT NULL));


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    idempotency_key text NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    completed_at timestamp with time zone,
    response_body jsonb
);


--
-- Name: import_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    initiated_by uuid,
    row_count integer DEFAULT 0 NOT NULL,
    rows_succeeded integer DEFAULT 0 NOT NULL,
    rows_failed integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT import_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    delta integer NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    barcode text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    movement_type public.movement_type NOT NULL,
    quantity_delta integer NOT NULL,
    reference_type public.reference_type NOT NULL,
    reference_id uuid,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operation_id uuid,
    CONSTRAINT chk_inventory_movements_new_qty_non_negative CHECK ((new_quantity >= 0)),
    CONSTRAINT chk_inventory_movements_qty_math CHECK (((previous_quantity + quantity_delta) = new_quantity))
);


--
-- Name: inventory_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    expected_quantity integer NOT NULL,
    counted_quantity integer NOT NULL,
    difference integer NOT NULL,
    status public.reconciliation_status DEFAULT 'pending'::public.reconciliation_status NOT NULL,
    notes text,
    counted_by uuid NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone
);


--
-- Name: item_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    store_id uuid NOT NULL,
    batch_number text NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    manufactured_at date,
    expires_at date,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    po_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT item_batches_qty_check CHECK ((qty >= 0)),
    CONSTRAINT item_batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'consumed'::text, 'recalled'::text])))
);


--
-- Name: journal_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    created_by uuid,
    approved_by uuid,
    status text DEFAULT 'posted'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text,
    source_id uuid,
    source_ref text,
    CONSTRAINT journal_batches_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'reversed'::text])))
);


--
-- Name: kv_store_5fa4635f; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kv_store_5fa4635f (
    key text NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    account_type text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_account_id uuid,
    CONSTRAINT ledger_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['ASSET'::text, 'LIABILITY'::text, 'EQUITY'::text, 'REVENUE'::text, 'EXPENSE'::text, 'CONTRA_REVENUE'::text])))
);


--
-- Name: ledger_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    source_ref text,
    status text DEFAULT 'POSTED'::text NOT NULL,
    override_used boolean DEFAULT false NOT NULL,
    risk_flag boolean DEFAULT false NOT NULL,
    risk_note text,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reverses_batch_id uuid,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    CONSTRAINT ledger_batches_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'POSTED'::text, 'VOIDED'::text, 'DELETED'::text])))
);


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid,
    account_id uuid NOT NULL,
    sale_id uuid,
    line_ref text,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    annotation jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    store_id uuid,
    party_id uuid,
    debit_amount numeric(14,2) DEFAULT 0 NOT NULL,
    credit_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    notes text,
    effective_date date DEFAULT CURRENT_DATE,
    reference_type text,
    reference_id uuid,
    CONSTRAINT ledger_entries_check CHECK ((((debit = (0)::numeric) AND (credit > (0)::numeric)) OR ((credit = (0)::numeric) AND (debit > (0)::numeric)))),
    CONSTRAINT ledger_entries_credit_check CHECK ((credit >= (0)::numeric)),
    CONSTRAINT ledger_entries_debit_check CHECK ((debit >= (0)::numeric))
);


--
-- Name: ledger_posting_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_posting_idempotency (
    sale_id uuid NOT NULL,
    posting_state text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    ledger_batch_id uuid,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    first_started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT ledger_posting_idempotency_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT ledger_posting_idempotency_posting_state_check CHECK ((posting_state = ANY (ARRAY['IN_PROGRESS'::text, 'POSTED'::text, 'FAILED'::text])))
);


--
-- Name: ledger_workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_workers (
    worker_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_heartbeat timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: online_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    total_price integer NOT NULL,
    CONSTRAINT online_order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: online_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    order_number text NOT NULL,
    customer_name text NOT NULL,
    customer_whatsapp text NOT NULL,
    delivery_address text NOT NULL,
    subtotal integer NOT NULL,
    delivery_fee integer DEFAULT 4000,
    total integer NOT NULL,
    status text DEFAULT 'pending'::text,
    payment_method text DEFAULT 'cod'::text,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT online_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid DEFAULT '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_address text NOT NULL,
    notes text,
    items jsonb NOT NULL,
    subtotal numeric NOT NULL,
    delivery_fee numeric NOT NULL,
    total numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'preparing'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: other_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.other_income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    category public.other_income_category NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method public.other_income_payment_method NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT other_income_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    current_balance numeric(15,4) DEFAULT 0,
    CONSTRAINT parties_type_check CHECK ((type = ANY (ARRAY['customer'::text, 'supplier'::text, 'employee'::text])))
);


--
-- Name: TABLE parties; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.parties IS 'Parties - deduplicated on phone+tenant';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: po_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_override_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_override_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    token_hash text NOT NULL,
    reason text NOT NULL,
    affected_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    used_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pos_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_number text NOT NULL,
    store_id uuid NOT NULL,
    cashier_id uuid NOT NULL,
    status public.session_status DEFAULT 'open'::public.session_status NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    opening_cash numeric(12,2) DEFAULT 0 NOT NULL,
    closing_cash numeric(12,2),
    total_sales numeric(12,2) DEFAULT 0 NOT NULL,
    total_cash numeric(12,2) DEFAULT 0 NOT NULL,
    notes text
);


--
-- Name: price_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    store_id uuid NOT NULL,
    old_price numeric,
    new_price numeric,
    old_mrp numeric,
    new_mrp numeric,
    old_cost numeric,
    new_cost numeric,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    source text
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category_id uuid,
    name_en text NOT NULL,
    name_bn text,
    sku text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    cost numeric(12,2) DEFAULT 0,
    stock_qty integer DEFAULT 0,
    reorder_point integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reserved_online integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    image_url text
);


--
-- Name: promos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    image_url text,
    city_scope text DEFAULT 'Chittagong'::text,
    discount_pct integer,
    starts_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promos_discount_pct_check CHECK (((discount_pct >= 0) AND (discount_pct <= 100)))
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty_ordered integer NOT NULL,
    qty_received integer DEFAULT 0 NOT NULL,
    unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT purchase_order_items_qty_ordered_check CHECK ((qty_ordered > 0)),
    CONSTRAINT purchase_order_items_qty_received_check CHECK ((qty_received >= 0))
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_number text NOT NULL,
    supplier_id uuid,
    store_id uuid NOT NULL,
    status public.po_status DEFAULT 'draft'::public.po_status NOT NULL,
    order_date date,
    expected_date date,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit_cost numeric(15,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    supplier_id uuid,
    invoice_number text,
    invoice_total numeric(15,4) DEFAULT 0,
    amount_paid numeric(15,4) DEFAULT 0,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text])))
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    key text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    reset_at timestamp with time zone NOT NULL
);


--
-- Name: receipt_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_counters (
    store_id uuid NOT NULL,
    date date NOT NULL,
    counter integer DEFAULT 0
);


--
-- Name: returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.returns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sale_id uuid,
    store_id uuid,
    processed_by uuid,
    refund_amount numeric(15,2),
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sale_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    client_transaction_id text NOT NULL,
    store_id uuid NOT NULL,
    operator_user_id uuid,
    status text NOT NULL,
    before_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    after_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    override_used boolean DEFAULT false NOT NULL,
    override_user_id uuid,
    override_reason text,
    stock_delta jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sale_id uuid,
    item_id uuid,
    batch_id uuid,
    price numeric(15,2),
    cost numeric(15,2),
    qty integer,
    line_total numeric(15,2)
);


--
-- Name: sale_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    payment_method_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sale_payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: sale_sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_sync_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    client_transaction_id text NOT NULL,
    conflict_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending_review'::text NOT NULL,
    requires_manager_review boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT sale_sync_conflicts_conflict_type_check CHECK ((conflict_type = ANY (ARRAY['insufficient_stock'::text, 'deleted_product'::text, 'changed_price'::text, 'duplicate_sale'::text]))),
    CONSTRAINT sale_sync_conflicts_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    store_id uuid,
    cashier_id uuid,
    sale_number text NOT NULL,
    subtotal numeric(15,2),
    discount_amount numeric(15,2),
    total_amount numeric(15,2),
    payment_method text,
    payment_meta jsonb,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    session_id uuid,
    voided_by uuid,
    voided_at timestamp with time zone,
    void_reason text,
    amount_tendered numeric(12,2),
    change_due numeric(12,2),
    notes text,
    client_transaction_id text,
    ledger_batch_id uuid,
    fulfilled_subtotal numeric(12,2),
    backordered_subtotal numeric(12,2),
    accounting_posting_status text DEFAULT 'PENDING_POSTING'::text NOT NULL,
    accounting_posting_error text,
    accounting_posted_at timestamp with time zone,
    customer_id uuid,
    total numeric(12,2),
    discount numeric(12,2),
    invoice_sent_via text,
    invoice_sent_at timestamp with time zone,
    offline_created_at timestamp with time zone,
    synced_at timestamp with time zone,
    operation_id text,
    CONSTRAINT sales_accounting_posting_status_check CHECK ((accounting_posting_status = ANY (ARRAY['PENDING_POSTING'::text, 'POSTED'::text, 'FAILED_POSTING'::text])))
);


--
-- Name: session_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    user_id uuid,
    platform public.social_platform DEFAULT 'facebook'::public.social_platform NOT NULL,
    content text NOT NULL,
    post_id text,
    status text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    link text,
    CONSTRAINT social_posts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'published'::text, 'failed'::text])))
);


--
-- Name: stock_alert_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_alert_thresholds (
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    min_qty integer DEFAULT 5 NOT NULL,
    reorder_qty integer DEFAULT 20 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    previous_quantity integer DEFAULT 0 NOT NULL,
    new_quantity integer DEFAULT 0 NOT NULL,
    quantity_change integer NOT NULL,
    transaction_type text NOT NULL,
    reason text NOT NULL,
    movement_id uuid,
    performed_by uuid,
    reference_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_ledger_quantity_change_check CHECK ((quantity_change <> 0))
);


--
-- Name: stock_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_levels (
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer DEFAULT 0,
    reserved integer DEFAULT 0,
    qty_reserved_online integer DEFAULT 0,
    tenant_id uuid
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    store_id uuid,
    item_id uuid,
    batch_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    meta jsonb,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    tenant_id uuid,
    quantity_change integer,
    weighted_average_cost numeric(15,4),
    reference_type text,
    reference_id uuid,
    created_by uuid
);


--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfer_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer NOT NULL,
    CONSTRAINT stock_transfer_items_qty_check CHECK ((qty > 0))
);


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_store_id uuid NOT NULL,
    to_store_id uuid NOT NULL,
    status public.stock_transfer_status DEFAULT 'pending'::public.stock_transfer_status NOT NULL,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT diff_stores CHECK ((from_store_id <> to_store_id))
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    address text,
    timezone text DEFAULT 'Asia/Dhaka'::text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    location public.geography(Point,4326)
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    email text,
    address text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auth_id uuid,
    email text NOT NULL,
    full_name text,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    store_id uuid,
    pos_pin text,
    pos_pin_hash text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    last_login_at timestamp with time zone,
    name text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text])))
);


--
-- Name: COLUMN users.pos_pin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.pos_pin IS '4-digit PIN for POS cashier login (e.g., 1234)';


--
-- Name: COLUMN users.pos_pin_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.pos_pin_hash IS 'bcrypt hash of 4-digit POS PIN used by authenticate_staff_pin';


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    customer_fingerprint text NOT NULL,
    customer_phone text,
    product_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: _schema_refresh_trigger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._schema_refresh_trigger ALTER COLUMN id SET DEFAULT nextval('public._schema_refresh_trigger_id_seq'::regclass);


--
-- Name: _schema_refresh_trigger _schema_refresh_trigger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._schema_refresh_trigger
    ADD CONSTRAINT _schema_refresh_trigger_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods accounting_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods accounting_periods_store_id_period_start_period_end_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_store_id_period_start_period_end_key UNIQUE (store_id, period_start, period_end);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: cart_sessions cart_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_sessions
    ADD CONSTRAINT cart_sessions_pkey PRIMARY KEY (id);


--
-- Name: cart_sessions cart_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_sessions
    ADD CONSTRAINT cart_sessions_session_id_key UNIQUE (session_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (category);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: close_review_log close_review_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_pkey PRIMARY KEY (id);


--
-- Name: close_review_log close_review_log_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_session_id_key UNIQUE (session_id);


--
-- Name: competitor_prices competitor_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_pkey PRIMARY KEY (id);


--
-- Name: credit_ledger credit_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (id);


--
-- Name: customer_reminders customer_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_sales daily_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales
    ADD CONSTRAINT daily_sales_pkey PRIMARY KEY (id);


--
-- Name: daily_sales daily_sales_store_id_sale_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales
    ADD CONSTRAINT daily_sales_store_id_sale_date_key UNIQUE (store_id, sale_date);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_tenant_id_key UNIQUE (tenant_id);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: followup_notes followup_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (idempotency_key);


--
-- Name: import_runs import_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustments inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_operation_id_key UNIQUE (operation_id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_reconciliations inventory_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: item_batches item_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: items items_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_sku_key UNIQUE (sku);


--
-- Name: journal_batches journal_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_pkey PRIMARY KEY (id);


--
-- Name: kv_store_5fa4635f kv_store_5fa4635f_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kv_store_5fa4635f
    ADD CONSTRAINT kv_store_5fa4635f_pkey PRIMARY KEY (key);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: ledger_accounts ledger_accounts_store_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_store_id_code_key UNIQUE (store_id, code);


--
-- Name: ledger_batches ledger_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_pkey PRIMARY KEY (sale_id);


--
-- Name: ledger_posting_queue ledger_posting_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_pkey PRIMARY KEY (id);


--
-- Name: ledger_posting_queue ledger_posting_queue_sale_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_sale_id_key UNIQUE (sale_id);


--
-- Name: ledger_workers ledger_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_workers
    ADD CONSTRAINT ledger_workers_pkey PRIMARY KEY (worker_id);


--
-- Name: online_order_items online_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_order_items
    ADD CONSTRAINT online_order_items_pkey PRIMARY KEY (id);


--
-- Name: online_orders online_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_orders
    ADD CONSTRAINT online_orders_order_number_key UNIQUE (order_number);


--
-- Name: online_orders online_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_orders
    ADD CONSTRAINT online_orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: other_income other_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_income
    ADD CONSTRAINT other_income_pkey PRIMARY KEY (id);


--
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pos_override_tokens pos_override_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_pkey PRIMARY KEY (id);


--
-- Name: pos_override_tokens pos_override_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: pos_sessions pos_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_pkey PRIMARY KEY (id);


--
-- Name: pos_sessions pos_sessions_session_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_session_number_key UNIQUE (session_number);


--
-- Name: price_audit_log price_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_audit_log
    ADD CONSTRAINT price_audit_log_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_tenant_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_sku_key UNIQUE (tenant_id, sku);


--
-- Name: promos promos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT promos_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_po_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_item_id_key UNIQUE (po_id, item_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: purchase_receipt_items purchase_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_receipts purchase_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key);


--
-- Name: receipt_config receipt_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_config
    ADD CONSTRAINT receipt_config_pkey PRIMARY KEY (store_id);


--
-- Name: receipt_counters receipt_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_counters
    ADD CONSTRAINT receipt_counters_pkey PRIMARY KEY (store_id, date);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: sale_audit_log sale_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_store_id_client_transaction_id_conflict_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_store_id_client_transaction_id_conflict_key UNIQUE (store_id, client_transaction_id, conflict_type);


--
-- Name: sales sales_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_operation_id_key UNIQUE (operation_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_receipt_number_key UNIQUE (sale_number);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: stock_alert_thresholds stock_alert_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_pkey PRIMARY KEY (store_id, item_id);


--
-- Name: stock_ledger stock_ledger_movement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_movement_id_key UNIQUE (movement_id);


--
-- Name: stock_ledger stock_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_pkey PRIMARY KEY (store_id, item_id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_item_id_key UNIQUE (transfer_id, item_id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stores stores_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_code_key UNIQUE (code);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_auth_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_product_id_customer_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_customer_fingerprint_key UNIQUE (product_id, customer_fingerprint);


--
-- Name: competitor_prices_store_product_competitor_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX competitor_prices_store_product_competitor_uk ON public.competitor_prices USING btree (store_id, item_id, competitor_name);


--
-- Name: idx_cart_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_session_id ON public.cart_sessions USING btree (session_id);


--
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_name ON public.categories USING btree (category);


--
-- Name: idx_categories_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_categories_name_unique ON public.categories USING btree (name);


--
-- Name: idx_close_review_log_reviewer_reviewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_close_review_log_reviewer_reviewed_at ON public.close_review_log USING btree (reviewer_user_id, reviewed_at DESC);


--
-- Name: idx_close_review_log_status_reviewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_close_review_log_status_reviewed_at ON public.close_review_log USING btree (close_status, reviewed_at DESC);


--
-- Name: idx_close_review_log_store_reviewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_close_review_log_store_reviewed_at ON public.close_review_log USING btree (store_id, reviewed_at DESC);


--
-- Name: idx_competitor_prices_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_batch ON public.competitor_prices USING btree (scrape_batch_id);


--
-- Name: idx_competitor_prices_competitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_competitor ON public.competitor_prices USING btree (competitor_name);


--
-- Name: idx_competitor_prices_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_item_id ON public.competitor_prices USING btree (item_id);


--
-- Name: idx_competitor_prices_scraped_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_scraped_at ON public.competitor_prices USING btree (scraped_at DESC);


--
-- Name: idx_competitor_prices_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_store_id ON public.competitor_prices USING btree (store_id);


--
-- Name: idx_competitor_prices_store_product_scraped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_prices_store_product_scraped ON public.competitor_prices USING btree (store_id, item_id, scraped_at DESC);


--
-- Name: idx_customer_reminders_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_reminders_party ON public.customer_reminders USING btree (party_id);


--
-- Name: idx_customer_reminders_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_reminders_sent_at ON public.customer_reminders USING btree (sent_at DESC);


--
-- Name: idx_customer_reminders_tenant_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_reminders_tenant_store ON public.customer_reminders USING btree (tenant_id, store_id);


--
-- Name: idx_daily_sales_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_sales_date ON public.daily_sales USING btree (sale_date DESC);


--
-- Name: idx_daily_sales_store_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_sales_store_date ON public.daily_sales USING btree (store_id, sale_date DESC);


--
-- Name: idx_followup_notes_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_notes_party ON public.followup_notes USING btree (party_id);


--
-- Name: idx_followup_notes_promise_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_notes_promise_date ON public.followup_notes USING btree (promise_to_pay_date);


--
-- Name: idx_followup_notes_tenant_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_notes_tenant_store ON public.followup_notes USING btree (tenant_id, store_id);


--
-- Name: idx_import_runs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_runs_created_at ON public.import_runs USING btree (created_at DESC);


--
-- Name: idx_import_runs_initiated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_runs_initiated_by ON public.import_runs USING btree (initiated_by);


--
-- Name: idx_import_runs_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_runs_status_created_at ON public.import_runs USING btree (status, created_at DESC);


--
-- Name: idx_inv_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_movements_created_at ON public.inventory_movements USING btree (created_at DESC);


--
-- Name: idx_inv_movements_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_movements_product ON public.inventory_movements USING btree (product_id);


--
-- Name: idx_inv_movements_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_movements_reference ON public.inventory_movements USING btree (reference_type, reference_id);


--
-- Name: idx_inv_movements_tenant_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_movements_tenant_store ON public.inventory_movements USING btree (tenant_id, store_id);


--
-- Name: idx_item_batches_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_batches_expires_at ON public.item_batches USING btree (expires_at) WHERE (status = 'active'::text);


--
-- Name: idx_item_batches_item_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_batches_item_store ON public.item_batches USING btree (item_id, store_id);


--
-- Name: idx_items_barcode_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_barcode_trgm ON public.items USING gin (barcode extensions.gin_trgm_ops) WHERE (barcode IS NOT NULL);


--
-- Name: idx_items_barcode_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_items_barcode_unique ON public.items USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_items_brand_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_brand_trgm ON public.items USING gin (brand extensions.gin_trgm_ops) WHERE (brand IS NOT NULL);


--
-- Name: idx_items_group_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_group_tag ON public.items USING btree (group_tag) WHERE (group_tag IS NOT NULL);


--
-- Name: idx_items_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_name_trgm ON public.items USING gin (name extensions.gin_trgm_ops);


--
-- Name: idx_items_short_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_short_code ON public.items USING btree (short_code) WHERE (short_code IS NOT NULL);


--
-- Name: idx_items_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_sku ON public.items USING btree (sku);


--
-- Name: idx_items_sku_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_sku_trgm ON public.items USING gin (sku extensions.gin_trgm_ops) WHERE (sku IS NOT NULL);


--
-- Name: idx_items_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_tenant_id ON public.items USING btree (tenant_id);


--
-- Name: idx_items_unique_barcode_non_empty; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_items_unique_barcode_non_empty ON public.items USING btree (NULLIF(TRIM(BOTH FROM barcode), ''::text)) WHERE (NULLIF(TRIM(BOTH FROM barcode), ''::text) IS NOT NULL);


--
-- Name: idx_items_unique_sku_non_empty; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_items_unique_sku_non_empty ON public.items USING btree (NULLIF(TRIM(BOTH FROM sku), ''::text)) WHERE (NULLIF(TRIM(BOTH FROM sku), ''::text) IS NOT NULL);


--
-- Name: idx_ledger_batches_store_posted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_batches_store_posted ON public.ledger_batches USING btree (store_id, posted_at DESC);


--
-- Name: idx_ledger_entries_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_entries_batch ON public.ledger_entries USING btree (batch_id);


--
-- Name: idx_ledger_sale_batch_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ledger_sale_batch_unique ON public.ledger_batches USING btree (source_type, source_id) WHERE ((source_type = 'sale'::text) AND (source_id IS NOT NULL));


--
-- Name: idx_lpq_claimed_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lpq_claimed_expiry ON public.ledger_posting_queue USING btree (lock_expires_at) WHERE (status = 'CLAIMED'::text);


--
-- Name: idx_lpq_pending_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lpq_pending_claim ON public.ledger_posting_queue USING btree (priority DESC, created_at) WHERE (status = 'PENDING'::text);


--
-- Name: idx_lpq_retry_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lpq_retry_schedule ON public.ledger_posting_queue USING btree (status, next_retry_at, priority DESC, created_at);


--
-- Name: idx_lpq_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lpq_store_status ON public.ledger_posting_queue USING btree (store_id, status, created_at);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_tenant_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tenant_store_created ON public.orders USING btree (tenant_id, store_id, created_at DESC);


--
-- Name: idx_price_audit_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_audit_changed_at ON public.price_audit_log USING btree (changed_at DESC);


--
-- Name: idx_price_audit_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_audit_item ON public.price_audit_log USING btree (item_id);


--
-- Name: idx_price_audit_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_audit_store ON public.price_audit_log USING btree (store_id);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- Name: idx_purchase_receipt_items_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_receipt_items_receipt ON public.purchase_receipt_items USING btree (receipt_id);


--
-- Name: idx_purchase_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_receipts_status ON public.purchase_receipts USING btree (status);


--
-- Name: idx_purchase_receipts_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_receipts_store ON public.purchase_receipts USING btree (store_id);


--
-- Name: idx_purchase_receipts_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_receipts_supplier ON public.purchase_receipts USING btree (supplier_id);


--
-- Name: idx_purchase_receipts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_receipts_tenant ON public.purchase_receipts USING btree (tenant_id);


--
-- Name: idx_reconciliations_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliations_product ON public.inventory_reconciliations USING btree (product_id);


--
-- Name: idx_reconciliations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliations_status ON public.inventory_reconciliations USING btree (status);


--
-- Name: idx_reconciliations_tenant_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliations_tenant_store ON public.inventory_reconciliations USING btree (tenant_id, store_id);


--
-- Name: idx_reminders_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_completed ON public.reminders USING btree (is_completed);


--
-- Name: idx_reminders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_date ON public.reminders USING btree (reminder_date);


--
-- Name: idx_reminders_tenant_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_tenant_store ON public.reminders USING btree (tenant_id, store_id);


--
-- Name: idx_reminders_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_type ON public.reminders USING btree (reminder_type);


--
-- Name: idx_sale_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item_id ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sale_payments_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_payments_sale ON public.sale_payments USING btree (sale_id);


--
-- Name: idx_sales_cashier_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_cashier_created ON public.sales USING btree (cashier_id, created_at DESC);


--
-- Name: idx_sales_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_created_at ON public.sales USING btree (created_at);


--
-- Name: idx_sales_ledger_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_ledger_batch ON public.sales USING btree (ledger_batch_id);


--
-- Name: idx_sales_receipt_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_receipt_number ON public.sales USING btree (sale_number);


--
-- Name: idx_sales_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_session ON public.sales USING btree (session_id);


--
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_status ON public.sales USING btree (status);


--
-- Name: idx_sales_store_client_txn; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sales_store_client_txn ON public.sales USING btree (store_id, client_transaction_id) WHERE (client_transaction_id IS NOT NULL);


--
-- Name: idx_sales_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_store_created ON public.sales USING btree (store_id, created_at DESC);


--
-- Name: idx_sales_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_store_id ON public.sales USING btree (store_id);


--
-- Name: idx_social_posts_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_store_created ON public.social_posts USING btree (store_id, created_at DESC);


--
-- Name: idx_stock_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_created_at ON public.stock_ledger USING btree (created_at DESC);


--
-- Name: idx_stock_ledger_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_metadata ON public.stock_ledger USING gin (metadata);


--
-- Name: idx_stock_ledger_movement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_movement_id ON public.stock_ledger USING btree (movement_id) WHERE (movement_id IS NOT NULL);


--
-- Name: idx_stock_ledger_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_stock_ledger_operation_id ON public.stock_ledger USING btree ((((metadata ->> 'operation_id'::text))::uuid)) WHERE ((metadata ->> 'operation_id'::text) IS NOT NULL);


--
-- Name: idx_stock_ledger_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_product_id ON public.stock_ledger USING btree (product_id);


--
-- Name: idx_stock_ledger_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_store_id ON public.stock_ledger USING btree (store_id);


--
-- Name: idx_stock_ledger_store_product_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_store_product_date ON public.stock_ledger USING btree (store_id, product_id, created_at DESC);


--
-- Name: idx_stock_ledger_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_ledger_transaction_type ON public.stock_ledger USING btree (transaction_type);


--
-- Name: idx_stock_levels_store_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_levels_store_item ON public.stock_levels USING btree (store_id, item_id);


--
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at);


--
-- Name: idx_stock_movements_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_item_id ON public.stock_movements USING btree (item_id);


--
-- Name: idx_stock_movements_item_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_item_store ON public.stock_movements USING btree (item_id, store_id, created_at DESC);


--
-- Name: idx_stock_movements_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_reason ON public.stock_movements USING btree (reason);


--
-- Name: idx_stock_movements_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);


--
-- Name: idx_stock_movements_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_store_id ON public.stock_movements USING btree (store_id);


--
-- Name: idx_stock_movements_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_tenant_id ON public.stock_movements USING btree (tenant_id);


--
-- Name: idx_stores_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_code ON public.stores USING btree (code);


--
-- Name: idx_users_auth_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_auth_id_unique ON public.users USING btree (auth_id);


--
-- Name: idx_users_last_login_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login_at ON public.users USING btree (last_login_at DESC);


--
-- Name: kv_store_5fa4635f_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_5fa4635f_key_idx ON public.kv_store_5fa4635f USING btree (key text_pattern_ops);


--
-- Name: uq_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_categories_slug ON public.categories USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: stock_levels audit_stock_levels_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_stock_levels_ins AFTER INSERT OR DELETE OR UPDATE ON public.stock_levels FOR EACH ROW EXECUTE FUNCTION public.log_audit();


--
-- Name: stock_movements audit_stock_movements_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_stock_movements_ins AFTER INSERT OR DELETE OR UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.log_audit();


--
-- Name: purchase_orders auto_po_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_po_number BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();


--
-- Name: sales auto_sale_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_sale_number BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.generate_sale_number();


--
-- Name: pos_sessions auto_session_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_session_number BEFORE INSERT ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.generate_session_number();


--
-- Name: inventory_movements enforce_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_append_only BEFORE DELETE OR UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_update();


--
-- Name: daily_sales set_daily_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_daily_sales_updated_at BEFORE UPDATE ON public.daily_sales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: discounts set_discounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_discounts_updated_at BEFORE UPDATE ON public.discounts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: item_batches set_item_batches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_item_batches_updated_at BEFORE UPDATE ON public.item_batches FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: purchase_orders set_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: sales set_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: stock_alert_thresholds set_stock_alert_thresholds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_stock_alert_thresholds_updated_at BEFORE UPDATE ON public.stock_alert_thresholds FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: stock_transfers set_stock_transfers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: suppliers set_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: users tr_sync_user_name; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_sync_user_name BEFORE INSERT OR UPDATE OF full_name ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_name();


--
-- Name: competitor_prices trg_cleanup_competitor_prices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cleanup_competitor_prices AFTER INSERT ON public.competitor_prices FOR EACH ROW EXECUTE FUNCTION public.trigger_cleanup_competitor_prices();


--
-- Name: ledger_entries trg_deferred_ledger_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_deferred_ledger_balance AFTER INSERT OR UPDATE ON public.ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_ledger_batch_balance();


--
-- Name: sales trg_enqueue_sale_for_ledger_posting; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enqueue_sale_for_ledger_posting AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.enqueue_sale_for_ledger_posting_from_sales();


--
-- Name: items trg_items_price_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_items_price_audit AFTER UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- Name: ledger_workers trg_ledger_workers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ledger_workers_set_updated_at BEFORE UPDATE ON public.ledger_workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


--
-- Name: ledger_posting_queue trg_lpq_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lpq_set_updated_at BEFORE UPDATE ON public.ledger_posting_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


--
-- Name: ledger_entries trg_prevent_ledger_entries_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_ledger_entries_mutation BEFORE DELETE OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();


--
-- Name: sale_audit_log trg_prevent_sale_audit_log_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_sale_audit_log_update BEFORE DELETE OR UPDATE ON public.sale_audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_sale_audit_log_mutation();


--
-- Name: online_orders trg_release_online_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_release_online_stock AFTER UPDATE OF status ON public.online_orders FOR EACH ROW EXECUTE FUNCTION public.release_online_stock();


--
-- Name: online_order_items trg_reserve_online_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reserve_online_stock AFTER INSERT ON public.online_order_items FOR EACH ROW EXECUTE FUNCTION public.reserve_online_stock();


--
-- Name: social_posts trg_social_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


--
-- Name: competitor_prices update_competitor_prices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_competitor_prices_updated_at BEFORE UPDATE ON public.competitor_prices FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: items update_items_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_items_timestamp BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: accounting_periods accounting_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);


--
-- Name: accounting_periods accounting_periods_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: batches batches_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: categories categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: categories categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: close_review_log close_review_log_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id);


--
-- Name: close_review_log close_review_log_secondary_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_secondary_approver_user_id_fkey FOREIGN KEY (secondary_approver_user_id) REFERENCES public.users(id);


--
-- Name: close_review_log close_review_log_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.pos_sessions(id) ON DELETE CASCADE;


--
-- Name: close_review_log close_review_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: competitor_prices competitor_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_product_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: competitor_prices competitor_prices_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: credit_ledger credit_ledger_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: credit_ledger credit_ledger_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: customer_reminders customer_reminders_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: customer_reminders customer_reminders_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: customer_reminders customer_reminders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: customer_reminders customer_reminders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: daily_sales daily_sales_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales
    ADD CONSTRAINT daily_sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: delivery_zones delivery_zones_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: delivery_zones delivery_zones_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: discounts discounts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_ledger_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_ledger_batch_id_fkey FOREIGN KEY (ledger_batch_id) REFERENCES public.ledger_batches(id);


--
-- Name: expenses expenses_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: followup_notes followup_notes_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: idempotency_keys idempotency_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: import_runs import_runs_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_adjustments inventory_adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_adjustments inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_items inventory_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: inventory_reconciliations inventory_reconciliations_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES auth.users(id);


--
-- Name: inventory_reconciliations inventory_reconciliations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: item_batches item_batches_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_batches item_batches_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: item_batches item_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: items items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: journal_batches journal_batches_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: journal_batches journal_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_batches journal_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: journal_batches journal_batches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: ledger_accounts ledger_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.ledger_accounts(id);


--
-- Name: ledger_accounts ledger_accounts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ledger_batches ledger_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ledger_batches ledger_batches_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: ledger_batches ledger_batches_reverses_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_reverses_batch_id_fkey FOREIGN KEY (reverses_batch_id) REFERENCES public.ledger_batches(id);


--
-- Name: ledger_batches ledger_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ledger_batches(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ledger_entries ledger_entries_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: ledger_entries ledger_entries_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: ledger_entries ledger_entries_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_ledger_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_ledger_batch_id_fkey FOREIGN KEY (ledger_batch_id) REFERENCES public.ledger_batches(id) ON DELETE SET NULL;


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: ledger_posting_queue ledger_posting_queue_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: ledger_posting_queue ledger_posting_queue_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: online_order_items online_order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_order_items
    ADD CONSTRAINT online_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.products(id);


--
-- Name: online_order_items online_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_order_items
    ADD CONSTRAINT online_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.online_orders(id) ON DELETE CASCADE;


--
-- Name: online_orders online_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_orders
    ADD CONSTRAINT online_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: online_orders online_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_orders
    ADD CONSTRAINT online_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: other_income other_income_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_income
    ADD CONSTRAINT other_income_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: other_income other_income_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_income
    ADD CONSTRAINT other_income_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: parties parties_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payment_methods payment_methods_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: pos_override_tokens pos_override_tokens_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: pos_override_tokens pos_override_tokens_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: pos_override_tokens pos_override_tokens_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: pos_sessions pos_sessions_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: pos_sessions pos_sessions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: price_audit_log price_audit_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_audit_log
    ADD CONSTRAINT price_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: price_audit_log price_audit_log_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_audit_log
    ADD CONSTRAINT price_audit_log_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: price_audit_log price_audit_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_audit_log
    ADD CONSTRAINT price_audit_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchase_receipt_items purchase_receipt_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: purchase_receipt_items purchase_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.purchase_receipts(id) ON DELETE CASCADE;


--
-- Name: purchase_receipts purchase_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_receipts purchase_receipts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: purchase_receipts purchase_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.parties(id);


--
-- Name: receipt_config receipt_config_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_config
    ADD CONSTRAINT receipt_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: receipt_counters receipt_counters_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_counters
    ADD CONSTRAINT receipt_counters_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: reminders reminders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: returns returns_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: returns returns_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: returns returns_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sale_audit_log sale_audit_log_operator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES public.users(id);


--
-- Name: sale_audit_log sale_audit_log_override_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_override_user_id_fkey FOREIGN KEY (override_user_id) REFERENCES public.users(id);


--
-- Name: sale_audit_log sale_audit_log_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: sale_audit_log sale_audit_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sale_items sale_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id);


--
-- Name: sale_items sale_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: sale_payments sale_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_sync_conflicts sale_sync_conflicts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sales sales_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_ledger_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_ledger_batch_id_fkey FOREIGN KEY (ledger_batch_id) REFERENCES public.ledger_batches(id);


--
-- Name: sales sales_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.pos_sessions(id);


--
-- Name: sales sales_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sales sales_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id);


--
-- Name: social_posts social_posts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: social_posts social_posts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: social_posts social_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_alert_thresholds stock_alert_thresholds_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_alert_thresholds stock_alert_thresholds_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stock_ledger stock_ledger_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stock_ledger stock_ledger_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_ledger stock_ledger_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id);


--
-- Name: stock_movements stock_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock_movements stock_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: stock_transfer_items stock_transfer_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_from_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_from_store_id_fkey FOREIGN KEY (from_store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: stock_transfers stock_transfers_to_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_to_store_id_fkey FOREIGN KEY (to_store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: stock_transfers stock_transfers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: users users_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: wishlist wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: wishlist Allow admin read wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin read wishlist" ON public.wishlist FOR SELECT TO authenticated USING (true);


--
-- Name: orders Allow anon insert orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);


--
-- Name: wishlist Allow anon insert wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon insert wishlist" ON public.wishlist FOR INSERT TO anon WITH CHECK (true);


--
-- Name: categories Allow anon read categories for store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read categories for store" ON public.categories FOR SELECT TO anon USING (((active = true) AND (store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid)));


--
-- Name: products Allow public read access for products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access for products" ON public.products FOR SELECT TO anon, authenticated USING (true);


--
-- Name: orders Allow tenant read orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow tenant read orders" ON public.orders FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: orders Allow tenant update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow tenant update orders" ON public.orders FOR UPDATE TO authenticated USING ((tenant_id = public.get_current_user_tenant_id())) WITH CHECK ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: wishlist Disallow anon select wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Disallow anon select wishlist" ON public.wishlist FOR SELECT TO anon USING (false);


--
-- Name: daily_sales Managers can insert daily_sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert daily_sales" ON public.daily_sales FOR INSERT WITH CHECK (((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: daily_sales Managers can update daily_sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update daily_sales" ON public.daily_sales FOR UPDATE USING (((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: competitor_prices Service role can manage competitor prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage competitor prices" ON public.competitor_prices TO service_role USING (true) WITH CHECK (true);


--
-- Name: other_income Users can delete other income of their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete other income of their tenant" ON public.other_income FOR DELETE USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: other_income Users can insert other income of their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert other income of their tenant" ON public.other_income FOR INSERT WITH CHECK ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: users Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = auth_id));


--
-- Name: other_income Users can update other income of their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update other income of their tenant" ON public.other_income FOR UPDATE USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid())))) WITH CHECK ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: competitor_prices Users can view competitor prices for their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view competitor prices for their store" ON public.competitor_prices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'current_store_id'::text) = (competitor_prices.store_id)::text)))));


--
-- Name: daily_sales Users can view daily_sales of their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view daily_sales of their store" ON public.daily_sales FOR SELECT USING ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: other_income Users can view other income of their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view other income of their tenant" ON public.other_income FOR SELECT USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: _schema_refresh_trigger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._schema_refresh_trigger ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts accounts_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounts_select_tenant ON public.accounts FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_adjustments adj_write_manager_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY adj_write_manager_owner ON public.inventory_adjustments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));


--
-- Name: accounting_periods ap_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ap_select ON public.accounting_periods FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_select_staff ON public.audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

--
-- Name: batches batches_no_client_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY batches_no_client_access ON public.batches TO authenticated USING (false) WITH CHECK (false);


--
-- Name: sales cashiers add sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cashiers add sales" ON public.sales FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['cashier'::text, 'manager'::text, 'admin'::text]))))));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_delete_admin ON public.categories FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = 'admin'::text)))));


--
-- Name: categories categories_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_insert_admin ON public.categories FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = 'admin'::text)))));


--
-- Name: categories categories_manage_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_manage_authorized ON public.categories TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: categories categories_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_anon ON public.categories FOR SELECT TO anon USING ((active = true));


--
-- Name: categories categories_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_authenticated ON public.categories FOR SELECT TO authenticated USING (true);


--
-- Name: categories categories_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_tenant_isolated ON public.categories FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = categories.tenant_id)))));


--
-- Name: categories categories_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_update_admin ON public.categories FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = 'admin'::text)))));


--
-- Name: close_review_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.close_review_log ENABLE ROW LEVEL SECURITY;

--
-- Name: competitor_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: close_review_log crl_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crl_insert ON public.close_review_log FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.id = close_review_log.reviewer_user_id) AND (actor.store_id = close_review_log.store_id) AND (actor.role = ANY (ARRAY['manager'::text, 'admin'::text, 'owner'::text]))))));


--
-- Name: close_review_log crl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crl_select ON public.close_review_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND ((actor.role = ANY (ARRAY['admin'::text, 'owner'::text])) OR ((actor.role = 'manager'::text) AND (actor.store_id = close_review_log.store_id)))))));


--
-- Name: close_review_log crl_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crl_update ON public.close_review_log FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


--
-- Name: customer_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_reminders customer_reminders_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_reminders_tenant_isolated ON public.customer_reminders FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_insert_all ON public.customers FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: customers customers_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_select_all ON public.customers FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: daily_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: discounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

--
-- Name: discounts discounts_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY discounts_select_tenant_isolated ON public.discounts FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: discounts discounts_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY discounts_write_authorized ON public.discounts TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: expenses expenses_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: expenses expenses_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: expenses expenses_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_select_all ON public.expenses FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: expenses expenses_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_select_tenant_isolated ON public.expenses FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: expenses expenses_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = public.get_current_user_tenant_id())))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: expenses expenses_write_manager_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_write_manager_owner ON public.expenses TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));


--
-- Name: followup_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.followup_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: followup_notes followup_notes_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY followup_notes_tenant_isolated ON public.followup_notes FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: idempotency_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: idempotency_keys idempotency_keys_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY idempotency_keys_tenant_isolated ON public.idempotency_keys FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: import_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: import_runs import_runs_admin_manager_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY import_runs_admin_manager_select ON public.import_runs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: inventory_movements insert_inventory_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_inventory_movements ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_reconciliations insert_reconciliations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_reconciliations ON public.inventory_reconciliations FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items inventory_items_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_items_select_tenant ON public.inventory_items FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_reconciliations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: item_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: item_batches item_batches_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY item_batches_select_tenant_isolated ON public.item_batches FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: item_batches item_batches_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY item_batches_write_authorized ON public.item_batches TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: items items_manage_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_manage_authorized ON public.items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = items.tenant_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = items.tenant_id)))));


--
-- Name: items items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_select_tenant_isolated ON public.items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = items.tenant_id)))));


--
-- Name: journal_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_batches journal_batches_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY journal_batches_tenant_isolated ON public.journal_batches FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: kv_store_5fa4635f; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kv_store_5fa4635f ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_accounts la_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY la_select ON public.ledger_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_batches lb_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lb_insert ON public.ledger_batches FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.store_id = ledger_batches.store_id)))));


--
-- Name: ledger_batches lb_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lb_select ON public.ledger_batches FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_entries le_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY le_insert ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.store_id = ledger_entries.store_id)))));


--
-- Name: ledger_entries le_insert_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY le_insert_tenant ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))) OR (store_id = ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid())))));


--
-- Name: ledger_entries le_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY le_select ON public.ledger_entries FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.ledger_batches lb
     JOIN public.users u ON ((u.auth_id = auth.uid())))
  WHERE ((lb.id = ledger_entries.batch_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_posting_idempotency; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_posting_idempotency ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_posting_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_posting_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_workers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_workers ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_posting_queue lpq_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lpq_select_staff ON public.ledger_posting_queue FOR SELECT TO authenticated USING ((store_id = ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: ledger_workers lw_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lw_select_authenticated ON public.ledger_workers FOR SELECT TO authenticated USING (true);


--
-- Name: online_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: online_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: online_orders online_orders_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY online_orders_tenant_isolation ON public.online_orders USING (((tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid) OR (auth.role() = 'anon'::text)));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: other_income; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

--
-- Name: parties parties_authenticated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_authenticated_delete ON public.parties FOR DELETE TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: parties parties_authenticated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_authenticated_insert ON public.parties FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: parties parties_authenticated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_authenticated_select ON public.parties FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: parties parties_authenticated_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_authenticated_update ON public.parties FOR UPDATE TO authenticated USING ((tenant_id = public.get_current_user_tenant_id())) WITH CHECK ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: parties parties_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_select_tenant ON public.parties FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: parties parties_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parties_service_all ON public.parties TO service_role USING (true) WITH CHECK (true);


--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods payment_methods_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_select_tenant_isolated ON public.payment_methods FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: payment_methods payment_methods_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_write_authorized ON public.payment_methods TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_insert_cashier; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_insert_cashier ON public.payments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: pos_override_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pos_override_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_override_tokens pot_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pot_select ON public.pos_override_tokens FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: price_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: price_audit_log price_audit_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY price_audit_log_select_policy ON public.price_audit_log FOR SELECT USING ((store_id = public.get_current_user_store_id()));


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_guest_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_guest_read ON public.products FOR SELECT TO anon USING ((is_active = true));


--
-- Name: products products_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_select_all ON public.products FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: products products_write_manager_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_write_manager_owner ON public.products TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));


--
-- Name: online_order_items public insert items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public insert items" ON public.online_order_items FOR INSERT WITH CHECK (true);


--
-- Name: online_orders public insert orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public insert orders" ON public.online_orders FOR INSERT WITH CHECK (true);


--
-- Name: online_order_items public select items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public select items" ON public.online_order_items FOR SELECT USING (true);


--
-- Name: online_orders public select orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public select orders" ON public.online_orders FOR SELECT USING (true);


--
-- Name: delivery_zones public_delivery_zones_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_delivery_zones_read ON public.delivery_zones FOR SELECT TO anon USING ((is_active = true));


--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_items purchase_order_items_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_order_items_select_tenant ON public.purchase_order_items FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id())))) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: purchase_order_items purchase_order_items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_order_items_select_tenant_isolated ON public.purchase_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND ((po.store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id())))))))));


--
-- Name: purchase_order_items purchase_order_items_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_order_items_write_authorized ON public.purchase_order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))))));


--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders purchase_orders_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_select_tenant_isolated ON public.purchase_orders FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: purchase_orders purchase_orders_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_write_authorized ON public.purchase_orders TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: purchase_receipt_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipt_config ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_config receipt_config_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_config_select_tenant_isolated ON public.receipt_config FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: receipt_config receipt_config_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_config_write_authorized ON public.receipt_config TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: receipt_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_counters receipt_counters_no_client_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_counters_no_client_access ON public.receipt_counters TO authenticated USING (false) WITH CHECK (false);


--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders reminders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_insert ON public.reminders FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: reminders reminders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_select ON public.reminders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id)))));


--
-- Name: returns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

--
-- Name: returns returns_no_client_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY returns_no_client_access ON public.returns TO authenticated USING (false) WITH CHECK (false);


--
-- Name: sale_audit_log sal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sal_select ON public.sale_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sale_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items sale_items_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sale_items_select_staff ON public.sale_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));


--
-- Name: sale_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_sync_conflicts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_sync_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sales sales_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sales sales_insert_cashier; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_insert_cashier ON public.sales FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: sales sales_select_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_select_manager ON public.sales FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sales sales_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_select_own ON public.sales FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = sales.cashier_id) AND (u.created_at >= CURRENT_DATE)))));


--
-- Name: sales sales_void; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_void ON public.sales FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: inventory_movements select_inventory_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_inventory_movements ON public.inventory_movements FOR SELECT TO authenticated USING ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_reconciliations select_reconciliations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_reconciliations ON public.inventory_reconciliations FOR SELECT TO authenticated USING ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: pos_sessions ses_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ses_insert ON public.pos_sessions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: pos_sessions ses_select_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ses_select_manager ON public.pos_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: pos_sessions ses_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ses_select_own ON public.pos_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = pos_sessions.cashier_id)))));


--
-- Name: pos_sessions ses_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ses_update ON public.pos_sessions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND ((u.id = pos_sessions.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: sale_items si_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY si_insert ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: sale_items si_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY si_select ON public.sale_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sales s
     JOIN public.users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_items.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: social_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: social_posts social_posts_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY social_posts_tenant_isolation ON public.social_posts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.tenant_id = social_posts.tenant_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.tenant_id = social_posts.tenant_id)))));


--
-- Name: sale_payments sp_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_insert ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: sale_payments sp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_select ON public.sale_payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sales s
     JOIN public.users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_payments.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: sale_sync_conflicts ssc_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ssc_insert ON public.sale_sync_conflicts FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sale_sync_conflicts ssc_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ssc_select ON public.sale_sync_conflicts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sale_sync_conflicts ssc_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ssc_update ON public.sale_sync_conflicts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: online_orders staff update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff update orders" ON public.online_orders FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: stock_alert_thresholds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_alert_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_alert_thresholds stock_alert_thresholds_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_alert_thresholds_select_tenant_isolated ON public.stock_alert_thresholds FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: stock_alert_thresholds stock_alert_thresholds_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_alert_thresholds_write_authorized ON public.stock_alert_thresholds TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stock_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_ledger stock_ledger_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_ledger_service_role_all ON public.stock_ledger TO service_role USING (true);


--
-- Name: stock_ledger stock_ledger_service_role_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_ledger_service_role_insert ON public.stock_ledger FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: stock_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels stock_levels_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_levels_read ON public.stock_levels FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = ( SELECT s.tenant_id
           FROM public.stores s
          WHERE (s.id = stock_levels.store_id))))))));


--
-- Name: stock_levels stock_levels_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_levels_select_tenant_isolated ON public.stock_levels FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM (public.stores s
     JOIN public.users u ON ((s.tenant_id = u.tenant_id)))
  WHERE ((s.id = stock_levels.store_id) AND (u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: stock_levels stock_levels_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_levels_write_authorized ON public.stock_levels TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements stock_movements_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_movements_insert_staff ON public.stock_movements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text]))))));


--
-- Name: stock_movements stock_movements_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_movements_select_staff ON public.stock_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));


--
-- Name: stock_transfer_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_transfer_items stock_transfer_items_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_transfer_items_select_tenant ON public.stock_transfer_items FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id()))))) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: stock_transfer_items stock_transfer_items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_transfer_items_select_tenant_isolated ON public.stock_transfer_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id())))))))));


--
-- Name: stock_transfer_items stock_transfer_items_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_transfer_items_write_authorized ON public.stock_transfer_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))))));


--
-- Name: stock_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_transfers stock_transfers_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_transfers_select_tenant_isolated ON public.stock_transfers FOR SELECT TO authenticated USING (((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: stock_transfers stock_transfers_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_transfers_write_authorized ON public.stock_transfers TO authenticated USING ((((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK ((((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: stores stores_delete_admin_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_delete_admin_manager ON public.stores FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: stores stores_insert_admin_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_insert_admin_manager ON public.stores FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: stores stores_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_select_tenant_isolated ON public.stores FOR SELECT TO authenticated USING (((id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = stores.tenant_id))))));


--
-- Name: stores stores_update_admin_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_update_admin_manager ON public.stores FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers suppliers_select_tenant_isolated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY suppliers_select_tenant_isolated ON public.suppliers FOR SELECT TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: suppliers suppliers_write_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY suppliers_write_authorized ON public.suppliers TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_select_own ON public.tenants FOR SELECT TO authenticated USING ((id = ( SELECT users.tenant_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: inventory_reconciliations update_reconciliations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_reconciliations ON public.inventory_reconciliations FOR UPDATE TO authenticated USING ((store_id IN ( SELECT users.store_id
   FROM public.users
  WHERE (users.auth_id = auth.uid()))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING ((auth_id = auth.uid()));


--
-- Name: users users_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated USING ((auth_id = auth.uid()));


--
-- Name: users users_select_tenant_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_tenant_admin ON public.users FOR SELECT TO authenticated USING (public.is_admin_in_tenant(tenant_id));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated USING ((auth_id = auth.uid())) WITH CHECK ((auth_id = auth.uid()));


--
-- Name: wishlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict DpO9zNW0y1KIYjzLKN2TaWWopBxW72jdZixL7HksrplqNMgmYc5NrvWbVOxSTc1

