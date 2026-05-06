


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."discount_type" AS ENUM (
    'percentage',
    'fixed'
);


ALTER TYPE "public"."discount_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'cash',
    'mobile_banking',
    'card',
    'other'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."po_status" AS ENUM (
    'draft',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
);


ALTER TYPE "public"."po_status" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'completed',
    'voided',
    'refunded'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE TYPE "public"."session_status" AS ENUM (
    'open',
    'closed'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_transfer_status" AS ENUM (
    'pending',
    'in_transit',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."stock_transfer_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date" DEFAULT NULL::"date", "p_manufactured_at" "date" DEFAULT NULL::"date", "p_notes" "text" DEFAULT NULL::"text", "p_po_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date", "p_manufactured_at" "date", "p_notes" "text", "p_po_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_notes" "text" DEFAULT NULL::"text", "p_performed_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_notes" "text", "p_performed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") RETURNS TABLE("id" "uuid", "auth_id" "uuid", "full_name" "text", "role" "text", "store_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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
      (u.pos_pin_hash IS NOT NULL AND crypt(p_pin, u.pos_pin_hash) = u.pos_pin_hash)
      -- Backward compatibility while old rows are still migrating
      OR (u.pos_pin_hash IS NULL AND u.pos_pin = p_pin)
    )
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") IS 'Server-authoritative PIN authentication for POS staff roles.';



CREATE OR REPLACE FUNCTION "public"."check_ledger_batch_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."check_ledger_batch_balance"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ledger_posting_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 8 NOT NULL,
    "locked_by" "text",
    "locked_at" timestamp with time zone,
    "lock_expires_at" timestamp with time zone,
    "priority" integer DEFAULT 100 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_retry_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ledger_posting_queue_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "ledger_posting_queue_max_attempts_check" CHECK (("max_attempts" > 0)),
    CONSTRAINT "ledger_posting_queue_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'CLAIMED'::"text", 'POSTED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."ledger_posting_queue" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer DEFAULT 10, "p_store_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."ledger_posting_queue"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_pos_session"("p_session_id" "uuid", "p_closing_cash" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."close_pos_session"("p_session_id" "uuid", "p_closing_cash" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb", "p_discount" numeric DEFAULT 0, "p_client_transaction_id" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_snapshot" "jsonb" DEFAULT NULL::"jsonb", "p_fulfillment_policy" "text" DEFAULT 'STRICT'::"text", "p_override_token" "text" DEFAULT NULL::"text", "p_override_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  -- Backward-compatible wrapper: execution only, posting is async/deterministic via post_sale_to_ledger.
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


ALTER FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb", "p_discount" numeric DEFAULT 0, "p_client_transaction_id" "text" DEFAULT NULL::"text", "p_transaction_trace_id" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_snapshot" "jsonb" DEFAULT NULL::"jsonb", "p_fulfillment_policy" "text" DEFAULT 'STRICT'::"text", "p_override_token" "text" DEFAULT NULL::"text", "p_override_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_existing record;
  v_item record;
  v_live_item record;
  v_sale_id uuid;
  v_sale_number text;
  v_status text := 'SUCCESS';
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tendered numeric(12,2) := 0;
  v_change numeric(12,2) := 0;
  v_total_savings numeric(12,2) := 0;
  v_adjustments jsonb := '[]'::jsonb;
  v_partial_fulfillment jsonb := '[]'::jsonb;
  v_pricing_results jsonb := '[]'::jsonb;
  v_conflict_reason text;
  v_applied_price numeric(12,2);
  v_mrp numeric(12,2);
  v_unit_discount numeric(12,2);
  v_line_savings numeric(12,2);
BEGIN
  IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'client_transaction_id_required',
      'message', 'client_transaction_id is required',
      'transaction_trace_id', p_transaction_trace_id,
      'pricing_results', '[]'::jsonb,
      'total_savings', 0
    );
  END IF;

  SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due
    INTO v_existing
  FROM public.sales
  WHERE store_id = p_store_id
    AND client_transaction_id = p_client_transaction_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'item_id', si.item_id,
            'qty', si.qty,
            'mrp', COALESCE(i.mrp, i.price, si.unit_price),
            'selling_price', si.unit_price,
            'unit_discount', GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0),
            'total_savings', GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0) * si.qty
          )
        ),
        '[]'::jsonb
      ),
      COALESCE(
        SUM(GREATEST(COALESCE(i.mrp, i.price, si.unit_price) - si.unit_price, 0) * si.qty),
        0
      )
    INTO v_pricing_results, v_total_savings
    FROM public.sale_items si
    LEFT JOIN public.items i ON i.id = si.item_id
    WHERE si.sale_id = v_existing.id;

    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'duplicate_detected', true,
      'transaction_trace_id', p_transaction_trace_id,
      'sale_id', v_existing.id,
      'sale_number', v_existing.sale_number,
      'subtotal', COALESCE(v_existing.subtotal, 0),
      'discount', COALESCE(v_existing.discount_amount, 0),
      'total_amount', COALESCE(v_existing.total_amount, 0),
      'tendered', COALESCE(v_existing.amount_tendered, 0),
      'change_due', COALESCE(v_existing.change_due, 0),
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb,
      'conflict_reason', null,
      'pricing_results', v_pricing_results,
      'total_savings', v_total_savings
    );
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'empty_sale',
      'message', 'Sale must have at least one item',
      'transaction_trace_id', p_transaction_trace_id,
      'pricing_results', '[]'::jsonb,
      'total_savings', 0
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT
      i.id,
      i.name,
      i.active,
      i.price,
      COALESCE(i.mrp, i.price) AS mrp,
      COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
    INTO v_live_item
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.id = v_item.item_id;

    IF v_live_item.id IS NULL OR v_live_item.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'deleted_or_inactive_product',
        'message', 'One or more products are deleted/inactive',
        'transaction_trace_id', p_transaction_trace_id,
        'pricing_results', '[]'::jsonb,
        'total_savings', 0
      );
    END IF;

    IF v_live_item.qty_on_hand < COALESCE(v_item.qty, 0) THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'insufficient_stock',
        'message', format('Insufficient stock for %s', v_live_item.name),
        'transaction_trace_id', p_transaction_trace_id,
        'pricing_results', '[]'::jsonb,
        'total_savings', 0
      );
    END IF;

    IF ROUND(COALESCE(v_item.unit_price, 0), 2) < ROUND(COALESCE(v_live_item.price, 0), 2)
       AND COALESCE(upper(p_fulfillment_policy), 'STRICT') = 'STRICT'
       AND p_override_token IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'price_increase_requires_manager',
        'message', format('Price increased for %s', v_live_item.name),
        'transaction_trace_id', p_transaction_trace_id,
        'pricing_results', '[]'::jsonb,
        'total_savings', 0
      );
    END IF;
  END LOOP;

  INSERT INTO public.sales (
    store_id, cashier_id, session_id, status, notes, client_transaction_id
  ) VALUES (
    p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id
  ) RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT
      i.price,
      COALESCE(i.mrp, i.price) AS mrp
    INTO v_live_item
    FROM public.items i
    WHERE i.id = v_item.item_id;

    v_applied_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_live_item.price, 0));
    v_mrp := COALESCE(v_live_item.mrp, v_applied_price);
    v_unit_discount := GREATEST(v_mrp - v_applied_price, 0);
    v_line_savings := ROUND(v_unit_discount * COALESCE(v_item.qty, 0), 2);

    IF ROUND(COALESCE(v_item.unit_price, 0), 2) > ROUND(COALESCE(v_live_item.price, 0), 2) THEN
      v_status := 'ADJUSTED';
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_down_auto_adjust',
        'snapshot_price', v_item.unit_price,
        'applied_price', v_applied_price
      );
    END IF;

    INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, cost, discount, line_total)
    VALUES (
      v_sale_id,
      v_item.item_id,
      v_item.qty,
      v_applied_price,
      COALESCE(v_item.cost, 0),
      COALESCE(v_item.discount, 0),
      ROUND((v_applied_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2)
    );

    v_subtotal := v_subtotal + ROUND((v_applied_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
    v_total_savings := v_total_savings + v_line_savings;
    v_pricing_results := v_pricing_results || jsonb_build_object(
      'item_id', v_item.item_id,
      'qty', v_item.qty,
      'mrp', ROUND(v_mrp, 2),
      'selling_price', ROUND(v_applied_price, 2),
      'unit_discount', ROUND(v_unit_discount, 2),
      'total_savings', ROUND(v_line_savings, 2)
    );
  END LOOP;

  v_total := GREATEST(ROUND(v_subtotal - COALESCE(p_discount, 0), 2), 0);

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_payments) AS x(
      payment_method_id uuid,
      amount numeric,
      reference text
    )
  LOOP
    v_tendered := v_tendered + COALESCE(v_item.amount, 0);
    INSERT INTO public.sale_payments(sale_id, payment_method_id, amount, reference)
    VALUES (v_sale_id, v_item.payment_method_id, v_item.amount, v_item.reference);
  END LOOP;

  v_change := GREATEST(ROUND(v_tendered - v_total, 2), 0);

  UPDATE public.sales
  SET subtotal = v_subtotal,
      discount_amount = COALESCE(p_discount, 0),
      total_amount = v_total,
      amount_tendered = v_tendered,
      change_due = v_change
  WHERE id = v_sale_id;

  RETURN jsonb_build_object(
    'status', v_status,
    'transaction_trace_id', p_transaction_trace_id,
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'total_amount', v_total,
    'tendered', v_tendered,
    'change_due', v_change,
    'adjustments', v_adjustments,
    'partial_fulfillment', v_partial_fulfillment,
    'conflict_reason', v_conflict_reason,
    'pricing_results', v_pricing_results,
    'total_savings', ROUND(v_total_savings, 2)
  );
END;
$$;


ALTER FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_transaction_trace_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb", "p_discount" numeric DEFAULT 0, "p_client_transaction_id" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_snapshot" "jsonb" DEFAULT NULL::"jsonb", "p_fulfillment_policy" "text" DEFAULT 'STRICT'::"text", "p_override_token" "text" DEFAULT NULL::"text", "p_override_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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
    SELECT i.id, i.name, i.active, i.price, COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
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
    sale_id,
    client_transaction_id,
    store_id,
    operator_user_id,
    status,
    before_state,
    after_state,
    override_used,
    override_user_id,
    override_reason,
    stock_delta
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


ALTER FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- In a real app, extract from auth.jwt()
  -- For local dev/testing without full auth, we can mock or rely on service_role.
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
END;
$$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.ledger_workers
  SET active = false,
      updated_at = now()
  WHERE worker_id = p_worker_id;
END;
$$;


ALTER FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."decrement_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer DEFAULT 100) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.accounting_posting_status = 'PENDING_POSTING' THEN
    PERFORM public.enqueue_sale_for_ledger_posting(NEW.id, NEW.store_id, 100);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_expense_ledger_accounts"("p_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."ensure_expense_ledger_accounts"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_po_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('public.po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_po_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sale_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'SALE-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                       || LPAD(nextval('public.sale_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_sale_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_session_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.session_number IS NULL OR NEW.session_number = '' THEN
    NEW.session_number := 'SES-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                          || LPAD(nextval('public.session_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_session_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid" DEFAULT NULL::"uuid", "p_manager_user_id" "uuid" DEFAULT NULL::"uuid", "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer DEFAULT 14) RETURNS TABLE("trend_date" "date", "total_in" bigint, "total_out" bigint, "net_delta" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("batch_id" "uuid", "batch_number" "text", "item_id" "uuid", "item_name" "text", "sku" "text", "qty" integer, "expires_at" "date", "days_left" integer, "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_list"("p_store_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "sku" "text", "current_qty" integer, "min_qty" integer, "reorder_status" "text", "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.sku,
    COALESCE(sl.qty, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    CASE 
      WHEN COALESCE(sl.qty, 0) = 0 THEN 'OUT'
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'
      ELSE 'OK'
    END as reorder_status,
    COALESCE(sl.updated_at, i.updated_at) as last_updated
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(sl.qty, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_inventory_list"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") RETURNS TABLE("item_id" "uuid", "item_name" "text", "sku" "text", "image_url" "text", "category_name" "text", "current_qty" bigint, "min_qty" integer, "reorder_qty" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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
  WHERE i.active = true
    AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty, 0) ASC, i.name ASC
  LIMIT 50;
$$;


ALTER FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_today_sales numeric(12,2) := 0;
  v_total_orders integer := 0;
  v_active_sessions integer := 0;
  v_low_stock_count integer := 0;
  v_recent_sessions jsonb;
  v_sales_trend jsonb;
  v_start_of_day timestamptz := CURRENT_DATE; 
BEGIN
  -- 1) Calculate Today's Sales & Orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(id)
  INTO 
    v_today_sales,
    v_total_orders
  FROM public.sales
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at >= v_start_of_day;

  -- 2) Count Active Sessions
  SELECT COUNT(id)
  INTO v_active_sessions
  FROM public.pos_sessions
  WHERE store_id = p_store_id
    AND status = 'open';

  -- 3) Calculate Low Stock Items accurately based on per-item thresholds
  SELECT COUNT(s.item_id)
  INTO v_low_stock_count
  FROM (
    SELECT i.id AS item_id
    FROM public.items i
    LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
    WHERE i.active = true
      AND COALESCE(sl.qty, 0) <= COALESCE(sat.min_qty, 5)
  ) s;

  -- 4) Fetch Recent Sessions (limit to 10 for dashboard widget)
  SELECT jsonb_agg(row_to_json(rs))
  INTO v_recent_sessions
  FROM (
    SELECT 
      ps.id,
      ps.session_number,
      ps.status,
      ps.opened_at,
      ps.total_sales,
      u.full_name as cashier_name
    FROM public.pos_sessions ps
    LEFT JOIN public.users u ON u.id = ps.cashier_id
    WHERE ps.store_id = p_store_id
    ORDER BY ps.opened_at DESC
    LIMIT 10
  ) rs;

  -- 5) Fetch 7-day Sales Trend
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', d.sale_date,
      'sales', COALESCE(s.daily_sales, 0)
    )
  )
  INTO v_sales_trend
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS sale_date
  ) d
  LEFT JOIN (
    SELECT created_at::date as sale_date, SUM(total_amount) as daily_sales
    FROM public.sales
    WHERE store_id = p_store_id AND status = 'completed'
    GROUP BY created_at::date
  ) s ON s.sale_date = d.sale_date;

  RETURN jsonb_build_object(
    'today_sales', v_today_sales,
    'total_orders', v_total_orders,
    'active_sessions', v_active_sessions,
    'low_stock_count', v_low_stock_count,
    'recent_sessions', COALESCE(v_recent_sessions, '[]'::jsonb),
    'sales_trend', COALESCE(v_sales_trend, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid" DEFAULT NULL::"uuid", "p_manager_user_id" "uuid" DEFAULT NULL::"uuid", "p_month" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_new_receipt"("store" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_new_receipt"("store" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_ar_account"("p_tenant_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT id INTO v_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Accounts Receivable' AND type = 'asset' LIMIT 1;
    IF v_account_id IS NULL THEN
        INSERT INTO accounts (tenant_id, name, type) VALUES (p_tenant_id, 'Accounts Receivable', 'asset') RETURNING id INTO v_account_id;
    END IF;
    RETURN v_account_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_ar_account"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT jsonb_agg(row_to_json(r) ORDER BY r.name)
  FROM (
    SELECT DISTINCT
      c.id,
      c.name,
      COUNT(i.id) AS item_count
    FROM public.categories c
    JOIN public.items i ON i.category_id = c.id AND i.active = true
    GROUP BY c.id, c.name
    HAVING COUNT(i.id) > 0
  ) r;
$$;


ALTER FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("party_id" "uuid", "customer_name" "text", "phone" "text", "balance_due" numeric, "days_overdue" integer, "last_note" "text", "promise_to_pay_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_ar_account_id UUID;
BEGIN
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    RETURN QUERY
    WITH party_balances AS (
        SELECT 
            le.party_id,
            SUM(le.debit_amount - le.credit_amount) AS balance_due,
            MAX(le.effective_date) FILTER (WHERE le.debit_amount > 0) AS last_credit_sale_date
        FROM ledger_entries le
        WHERE le.tenant_id = p_tenant_id 
          AND le.store_id = p_store_id
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
        FROM followup_notes fn
        WHERE fn.tenant_id = p_tenant_id AND fn.store_id = p_store_id
        ORDER BY fn.party_id, fn.created_at DESC
    )
    SELECT 
        pb.party_id,
        p.name AS customer_name,
        p.phone,
        pb.balance_due,
        COALESCE(CURRENT_DATE - pb.last_credit_sale_date, 0) AS days_overdue,
        ln.note_text AS last_note,
        ln.promise_to_pay_date
    FROM party_balances pb
    JOIN parties p ON p.id = pb.party_id
    LEFT JOIN latest_notes ln ON ln.party_id = pb.party_id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY pb.balance_due DESC, pb.last_credit_sale_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_session_summary"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."get_session_summary"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 50) RETURNS TABLE("item_id" "uuid", "item_name" "text", "sku" "text", "category_name" "text", "qty_on_hand" bigint, "total_cost" numeric, "last_sold_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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
  WHERE i.active = true
    AND COALESCE(sl.qty, 0) > 0
  GROUP BY i.id, i.name, i.sku, c.name, sl.qty, i.cost
  HAVING COUNT(si.item_id) = 0   -- zero sales in window
  ORDER BY total_cost DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_history_simple"("p_store_id" "uuid", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "item_name" "text", "delta" integer, "reason" "text", "notes" "text", "performer_name" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_stock_history_simple"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_movements"("p_store_id" "uuid" DEFAULT NULL::"uuid", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "store_id" "uuid", "item_id" "uuid", "delta" integer, "reason" "text", "notes" "text", "meta" "jsonb", "performed_by" "uuid", "performer_name" "text", "item_name" "text", "store_code" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_stock_movements"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS TABLE("item_id" "uuid", "item_name" "text", "sku" "text", "category_name" "text", "qty_on_hand" bigint, "unit_cost" numeric, "unit_price" numeric, "total_cost" numeric, "total_value" numeric, "margin_pct" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 20) RETURNS TABLE("item_id" "uuid", "item_name" "text", "sku" "text", "category_name" "text", "total_qty" bigint, "total_revenue" numeric, "total_profit" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.ledger_workers
  SET last_heartbeat = now(),
      active = true,
      updated_at = now()
  WHERE worker_id = p_worker_id;
END;
$$;


ALTER FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_apply_stock_delta"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."import_apply_stock_delta"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_historical_daily_sale"("p_store_id" "uuid", "p_date" "date", "p_cash_amount" numeric, "p_bkash_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."import_historical_daily_sale"("p_store_id" "uuid", "p_date" "date", "p_cash_amount" numeric, "p_bkash_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval DEFAULT '00:01:00'::interval) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ledger_workers w
    WHERE w.worker_id = p_worker_id
      AND w.active = true
      AND w.last_heartbeat >= now() - COALESCE(p_max_staleness, interval '60 seconds')
  );
$$;


ALTER FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_period_closed"("p_store_id" "uuid", "p_posted_at" timestamp with time zone) RETURNS boolean
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."is_period_closed"("p_store_id" "uuid", "p_posted_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb" DEFAULT '[]'::"jsonb", "p_ttl_minutes" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb", "p_ttl_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb", "p_requires_manager_review" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb", "p_requires_manager_review" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT jsonb_build_object(
    'id',           i.id,
    'sku',          i.sku,
    'short_code',   i.short_code,
    'barcode',      i.barcode,
    'name',         i.name,
    'brand',        i.brand,
    'mrp',          COALESCE(i.mrp, i.price),
    'price',        i.price,
    'cost',         i.cost,
    'group_tag',    i.group_tag,
    'image_url',    i.image_url,
    'qty_on_hand',  COALESCE(sl.qty, 0),
    'category',     c.category
  )
  FROM public.items i
  LEFT JOIN public.stock_levels sl
         ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.categories c
         ON c.id = i.category_id
  WHERE i.active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;


ALTER FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE followup_notes
    SET status = 'resolved'
    WHERE id = p_note_id;
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_ledger_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;


ALTER FUNCTION "public"."prevent_ledger_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_sale_audit_log_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'sale_audit_log is immutable';
END;
$$;


ALTER FUNCTION "public"."prevent_sale_audit_log_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer DEFAULT 50, "p_store_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 100) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reclaim_stale_ledger_locks"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."reclaim_stale_ledger_locks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_user_id UUID := auth.uid();
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency Check
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    -- 2. Accounts
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    -- 3. Create Journal Batch
    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    -- 4. Ledger Entries (Double Entry)
    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, p_payment_account_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, credit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_ar_account_id, p_party_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- 5. Calculate new balance
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_new_balance
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND account_id = v_ar_account_id AND party_id = p_party_id;

    -- 6. Update Idempotency
    v_response := jsonb_build_object(
        'status', 'success',
        'journal_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );
    UPDATE idempotency_keys 
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_expense"("p_store_id" "uuid", "p_date" "date", "p_vendor" "text", "p_description" "text", "p_amount" numeric, "p_payment_type" "text", "p_category" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."record_expense"("p_store_id" "uuid", "p_date" "date", "p_vendor" "text", "p_description" "text", "p_amount" numeric, "p_payment_type" "text", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
    RAISE EXCEPTION 'worker_id required';
  END IF;

  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat)
  VALUES (p_worker_id, true, now())
  ON CONFLICT (worker_id)
  DO UPDATE SET
    active = true,
    last_heartbeat = now(),
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text" DEFAULT ''::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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
    WHERE i.active = true
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


ALTER FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text", "p_category_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_new_qty" integer, "p_reason" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."set_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_new_qty" integer, "p_reason" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_competitor_price_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.last_updated = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_competitor_price_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_stock_level"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, p_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = public.stock_levels.qty + p_quantity;
END;
$$;


ALTER FUNCTION "public"."upsert_stock_level"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text" DEFAULT 'Voided by manager'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE FOREIGN DATA WRAPPER "lsbucket_fdw" HANDLER "extensions"."iceberg_fdw_handler" VALIDATOR "extensions"."iceberg_fdw_validator";




CREATE SERVER "lsbucket_fdw_server" FOREIGN DATA WRAPPER "lsbucket_fdw" OPTIONS (
    "catalog_uri" 'https://hvmyxyccfnkrbxqbhlnm.storage.supabase.co/storage/v1/iceberg',
    "s3.endpoint" 'https://hvmyxyccfnkrbxqbhlnm.storage.supabase.co/storage/v1/s3',
    "vault_aws_access_key_id" '498cc4f0-55a5-49e6-ae30-44c654648931',
    "vault_aws_secret_access_key" '16cf4e6f-4c70-4e29-9fff-4eedf9ae8983',
    "vault_token" 'f0aab499-4258-45ee-9073-8dde90dd061b',
    "warehouse" 'lsbucket'
);


ALTER SERVER "lsbucket_fdw_server" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounting_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "closed_at" timestamp with time zone,
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accounting_periods_check" CHECK (("period_end" > "period_start")),
    CONSTRAINT "accounting_periods_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'CLOSED'::"text"])))
);


ALTER TABLE "public"."accounting_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accounts_type_check" CHECK (("type" = ANY (ARRAY['asset'::"text", 'liability'::"text", 'equity'::"text", 'revenue'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" "uuid",
    "batch_code" "text",
    "supplier" "text",
    "qty" integer DEFAULT 0 NOT NULL,
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category" "text" NOT NULL,
    "tenant_id" "uuid",
    "store_id" "uuid",
    "name" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."close_review_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "reviewer_user_id" "uuid" NOT NULL,
    "reviewer_role" "text" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "queue_pending_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "conflict_count" integer DEFAULT 0 NOT NULL,
    "last_sync_success_at" timestamp with time zone,
    "close_status" "text" NOT NULL,
    "acknowledgement_confirmed" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "admin_override" boolean DEFAULT false NOT NULL,
    "override_reason" "text",
    "override_reason_category" "text",
    "override_notes" "text",
    "dual_approval_required" boolean DEFAULT false NOT NULL,
    "secondary_approver_user_id" "uuid",
    "secondary_approver_role" "text",
    CONSTRAINT "close_review_log_admin_override_requires_category_check" CHECK ((("admin_override" = false) OR (("override_reason_category" IS NOT NULL) AND ("btrim"("override_reason_category") <> ''::"text")))),
    CONSTRAINT "close_review_log_close_status_check" CHECK (("close_status" = ANY (ARRAY['green'::"text", 'yellow'::"text", 'red'::"text"]))),
    CONSTRAINT "close_review_log_conflict_count_check" CHECK (("conflict_count" >= 0)),
    CONSTRAINT "close_review_log_dual_approval_requires_secondary_check" CHECK ((("dual_approval_required" = false) OR (("secondary_approver_user_id" IS NOT NULL) AND ("secondary_approver_role" IS NOT NULL)))),
    CONSTRAINT "close_review_log_failed_count_check" CHECK (("failed_count" >= 0)),
    CONSTRAINT "close_review_log_override_reason_category_check" CHECK ((("override_reason_category" IS NULL) OR ("override_reason_category" = ANY (ARRAY['internet outage'::"text", 'queue corruption'::"text", 'emergency close'::"text", 'manager absence'::"text", 'system incident'::"text", 'other'::"text"])))),
    CONSTRAINT "close_review_log_queue_pending_count_check" CHECK (("queue_pending_count" >= 0)),
    CONSTRAINT "close_review_log_reviewer_role_check" CHECK (("reviewer_role" = ANY (ARRAY['manager'::"text", 'admin'::"text", 'owner'::"text"]))),
    CONSTRAINT "close_review_log_secondary_approver_role_check" CHECK ((("secondary_approver_role" IS NULL) OR ("secondary_approver_role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))
);


ALTER TABLE "public"."close_review_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competitor_prices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" "uuid",
    "competitor_name" "text" NOT NULL,
    "competitor_price" numeric(15,2) NOT NULL,
    "competitor_url" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."competitor_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "party_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['whatsapp'::"text", 'call'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."customer_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."discount_type" DEFAULT 'percentage'::"public"."discount_type" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discounts_value_check" CHECK (("value" >= (0)::numeric))
);


ALTER TABLE "public"."discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "expense_date" "date" NOT NULL,
    "vendor_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "payment_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "ledger_batch_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "expenses_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['Cash'::"text", 'Bank transfer'::"text", 'Bkash'::"text", 'Card'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."followup_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "party_id" "uuid" NOT NULL,
    "note_text" "text" NOT NULL,
    "promise_to_pay_date" "date",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "followup_notes_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."followup_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idempotency_keys" (
    "idempotency_key" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "response_body" "jsonb"
);


ALTER TABLE "public"."idempotency_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "initiated_by" "uuid",
    "row_count" integer DEFAULT 0 NOT NULL,
    "rows_succeeded" integer DEFAULT 0 NOT NULL,
    "rows_failed" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "duration_ms" integer,
    "summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    CONSTRAINT "import_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."import_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "barcode" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "batch_number" "text" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "manufactured_at" "date",
    "expires_at" "date",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "po_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_batches_qty_check" CHECK (("qty" >= 0)),
    CONSTRAINT "item_batches_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'consumed'::"text", 'recalled'::"text"])))
);


ALTER TABLE "public"."item_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sku" "text",
    "barcode" "text",
    "name" "text" NOT NULL,
    "category_id" "uuid",
    "description" "text",
    "cost" numeric(15,2) DEFAULT 0,
    "price" numeric(15,2) DEFAULT 0,
    "image_url" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_code" "text",
    "brand" "text",
    "group_tag" "text",
    "mrp" numeric
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "store_id" "uuid",
    "created_by" "uuid",
    "approved_by" "uuid",
    "status" "text" DEFAULT 'posted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "journal_batches_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'posted'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."journal_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "account_type" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_account_id" "uuid",
    CONSTRAINT "ledger_accounts_account_type_check" CHECK (("account_type" = ANY (ARRAY['ASSET'::"text", 'LIABILITY'::"text", 'EQUITY'::"text", 'REVENUE'::"text", 'EXPENSE'::"text", 'CONTRA_REVENUE'::"text"])))
);


ALTER TABLE "public"."ledger_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "source_ref" "text",
    "status" "text" DEFAULT 'POSTED'::"text" NOT NULL,
    "override_used" boolean DEFAULT false NOT NULL,
    "risk_flag" boolean DEFAULT false NOT NULL,
    "risk_note" "text",
    "posted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reverses_batch_id" "uuid",
    CONSTRAINT "ledger_batches_status_check" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'POSTED'::"text", 'VOIDED'::"text"])))
);


ALTER TABLE "public"."ledger_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "line_ref" "text",
    "debit" numeric(14,2) DEFAULT 0 NOT NULL,
    "credit" numeric(14,2) DEFAULT 0 NOT NULL,
    "annotation" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ledger_entries_check" CHECK (((("debit" = (0)::numeric) AND ("credit" > (0)::numeric)) OR (("credit" = (0)::numeric) AND ("debit" > (0)::numeric)))),
    CONSTRAINT "ledger_entries_credit_check" CHECK (("credit" >= (0)::numeric)),
    CONSTRAINT "ledger_entries_debit_check" CHECK (("debit" >= (0)::numeric))
);


ALTER TABLE "public"."ledger_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_posting_idempotency" (
    "sale_id" "uuid" NOT NULL,
    "posting_state" "text" DEFAULT 'IN_PROGRESS'::"text" NOT NULL,
    "ledger_batch_id" "uuid",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "first_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "ledger_posting_idempotency_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "ledger_posting_idempotency_posting_state_check" CHECK (("posting_state" = ANY (ARRAY['IN_PROGRESS'::"text", 'POSTED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."ledger_posting_idempotency" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ledger_workers" (
    "worker_id" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "last_heartbeat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ledger_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "parties_type_check" CHECK (("type" = ANY (ARRAY['customer'::"text", 'supplier'::"text", 'employee'::"text"])))
);


ALTER TABLE "public"."parties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."payment_type" DEFAULT 'cash'::"public"."payment_type" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."po_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."po_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_override_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "issued_by" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "affected_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pos_override_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_number" "text" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "cashier_id" "uuid" NOT NULL,
    "status" "public"."session_status" DEFAULT 'open'::"public"."session_status" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "opening_cash" numeric(12,2) DEFAULT 0 NOT NULL,
    "closing_cash" numeric(12,2),
    "total_sales" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_cash" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."pos_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty_ordered" integer NOT NULL,
    "qty_received" integer DEFAULT 0 NOT NULL,
    "unit_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "purchase_order_items_qty_ordered_check" CHECK (("qty_ordered" > 0)),
    CONSTRAINT "purchase_order_items_qty_received_check" CHECK (("qty_received" >= 0))
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_number" "text" NOT NULL,
    "supplier_id" "uuid",
    "store_id" "uuid" NOT NULL,
    "status" "public"."po_status" DEFAULT 'draft'::"public"."po_status" NOT NULL,
    "order_date" "date",
    "expected_date" "date",
    "notes" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipt_config" (
    "store_id" "uuid" NOT NULL,
    "store_name" "text",
    "header_text" "text",
    "footer_text" "text",
    "logo_url" "text",
    "currency_symbol" "text" DEFAULT '৳'::"text" NOT NULL,
    "show_tax" boolean DEFAULT false NOT NULL,
    "receipt_printer_type" "text" DEFAULT 'bluetooth_escpos'::"text",
    "receipt_printer_name" "text",
    "label_printer_type" "text" DEFAULT 'tspl_bluetooth'::"text",
    "label_printer_name" "text",
    "label_width_mm" integer DEFAULT 40,
    "label_height_mm" integer DEFAULT 30,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."receipt_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipt_counters" (
    "store_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "counter" integer DEFAULT 0
);


ALTER TABLE "public"."receipt_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid",
    "store_id" "uuid",
    "processed_by" "uuid",
    "refund_amount" numeric(15,2),
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid",
    "client_transaction_id" "text" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "operator_user_id" "uuid",
    "status" "text" NOT NULL,
    "before_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "after_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "override_used" boolean DEFAULT false NOT NULL,
    "override_user_id" "uuid",
    "override_reason" "text",
    "stock_delta" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sale_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid",
    "item_id" "uuid",
    "batch_id" "uuid",
    "price" numeric(15,2),
    "cost" numeric(15,2),
    "qty" integer,
    "line_total" numeric(15,2)
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sale_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sale_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sale_payments_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."sale_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_sync_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "client_transaction_id" "text" NOT NULL,
    "conflict_type" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "requires_manager_review" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    CONSTRAINT "sale_sync_conflicts_conflict_type_check" CHECK (("conflict_type" = ANY (ARRAY['insufficient_stock'::"text", 'deleted_product'::"text", 'changed_price'::"text", 'duplicate_sale'::"text"]))),
    CONSTRAINT "sale_sync_conflicts_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'resolved'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."sale_sync_conflicts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "store_id" "uuid",
    "cashier_id" "uuid",
    "sale_number" "text" NOT NULL,
    "subtotal" numeric(15,2),
    "discount_amount" numeric(15,2),
    "total_amount" numeric(15,2),
    "payment_method" "text",
    "payment_meta" "jsonb",
    "status" "text" DEFAULT 'completed'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid",
    "voided_by" "uuid",
    "voided_at" timestamp with time zone,
    "void_reason" "text",
    "amount_tendered" numeric(12,2),
    "change_due" numeric(12,2),
    "notes" "text",
    "client_transaction_id" "text",
    "ledger_batch_id" "uuid",
    "fulfilled_subtotal" numeric(12,2),
    "backordered_subtotal" numeric(12,2),
    "accounting_posting_status" "text" DEFAULT 'PENDING_POSTING'::"text" NOT NULL,
    "accounting_posting_error" "text",
    "accounting_posted_at" timestamp with time zone,
    CONSTRAINT "sales_accounting_posting_status_check" CHECK (("accounting_posting_status" = ANY (ARRAY['PENDING_POSTING'::"text", 'POSTED'::"text", 'FAILED_POSTING'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."session_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."session_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_alert_thresholds" (
    "store_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "min_qty" integer DEFAULT 5 NOT NULL,
    "reorder_qty" integer DEFAULT 20 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_alert_thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_levels" (
    "store_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty" integer DEFAULT 0,
    "reserved" integer DEFAULT 0
);


ALTER TABLE "public"."stock_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "store_id" "uuid",
    "item_id" "uuid",
    "batch_id" "uuid",
    "delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "meta" "jsonb",
    "performed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty" integer NOT NULL,
    CONSTRAINT "stock_transfer_items_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "public"."stock_transfer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_store_id" "uuid" NOT NULL,
    "to_store_id" "uuid" NOT NULL,
    "status" "public"."stock_transfer_status" DEFAULT 'pending'::"public"."stock_transfer_status" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "diff_stores" CHECK (("from_store_id" <> "to_store_id"))
);


ALTER TABLE "public"."stock_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "timezone" "text" DEFAULT 'Asia/Dhaka'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid" NOT NULL
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "store_id" "uuid",
    "pos_pin" "text",
    "pos_pin_hash" "text",
    "tenant_id" "uuid" DEFAULT '00000000-0000-0000-0000-000000000001'::"uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text", 'stock'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."pos_pin" IS '4-digit PIN for POS cashier login (e.g., 1234)';



COMMENT ON COLUMN "public"."users"."pos_pin_hash" IS 'bcrypt hash of 4-digit POS PIN used by authenticate_staff_pin';



ALTER TABLE ONLY "public"."accounting_periods"
    ADD CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounting_periods"
    ADD CONSTRAINT "accounting_periods_store_id_period_start_period_end_key" UNIQUE ("store_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("category");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."competitor_prices"
    ADD CONSTRAINT "competitor_prices_item_id_competitor_name_key" UNIQUE ("item_id", "competitor_name");



ALTER TABLE ONLY "public"."competitor_prices"
    ADD CONSTRAINT "competitor_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_reminders"
    ADD CONSTRAINT "customer_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followup_notes"
    ADD CONSTRAINT "followup_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("idempotency_key");



ALTER TABLE ONLY "public"."import_runs"
    ADD CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_batches"
    ADD CONSTRAINT "item_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."journal_batches"
    ADD CONSTRAINT "journal_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_store_id_code_key" UNIQUE ("store_id", "code");



ALTER TABLE ONLY "public"."ledger_batches"
    ADD CONSTRAINT "ledger_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_posting_idempotency"
    ADD CONSTRAINT "ledger_posting_idempotency_pkey" PRIMARY KEY ("sale_id");



ALTER TABLE ONLY "public"."ledger_posting_queue"
    ADD CONSTRAINT "ledger_posting_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ledger_posting_queue"
    ADD CONSTRAINT "ledger_posting_queue_sale_id_key" UNIQUE ("sale_id");



ALTER TABLE ONLY "public"."ledger_workers"
    ADD CONSTRAINT "ledger_workers_pkey" PRIMARY KEY ("worker_id");



ALTER TABLE ONLY "public"."parties"
    ADD CONSTRAINT "parties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_override_tokens"
    ADD CONSTRAINT "pos_override_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_override_tokens"
    ADD CONSTRAINT "pos_override_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_session_number_key" UNIQUE ("session_number");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_po_id_item_id_key" UNIQUE ("po_id", "item_id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_po_number_key" UNIQUE ("po_number");



ALTER TABLE ONLY "public"."receipt_config"
    ADD CONSTRAINT "receipt_config_pkey" PRIMARY KEY ("store_id");



ALTER TABLE ONLY "public"."receipt_counters"
    ADD CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("store_id", "date");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_audit_log"
    ADD CONSTRAINT "sale_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_sync_conflicts"
    ADD CONSTRAINT "sale_sync_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_sync_conflicts"
    ADD CONSTRAINT "sale_sync_conflicts_store_id_client_transaction_id_conflict_key" UNIQUE ("store_id", "client_transaction_id", "conflict_type");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_receipt_number_key" UNIQUE ("sale_number");



ALTER TABLE ONLY "public"."stock_alert_thresholds"
    ADD CONSTRAINT "stock_alert_thresholds_pkey" PRIMARY KEY ("store_id", "item_id");



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("store_id", "item_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_transfer_id_item_id_key" UNIQUE ("transfer_id", "item_id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_categories_name" ON "public"."categories" USING "btree" ("category");



CREATE INDEX "idx_close_review_log_reviewer_reviewed_at" ON "public"."close_review_log" USING "btree" ("reviewer_user_id", "reviewed_at" DESC);



CREATE INDEX "idx_close_review_log_status_reviewed_at" ON "public"."close_review_log" USING "btree" ("close_status", "reviewed_at" DESC);



CREATE INDEX "idx_close_review_log_store_reviewed_at" ON "public"."close_review_log" USING "btree" ("store_id", "reviewed_at" DESC);



CREATE INDEX "idx_competitor_prices_competitor" ON "public"."competitor_prices" USING "btree" ("competitor_name");



CREATE INDEX "idx_competitor_prices_item_id" ON "public"."competitor_prices" USING "btree" ("item_id");



CREATE INDEX "idx_customer_reminders_party" ON "public"."customer_reminders" USING "btree" ("party_id");



CREATE INDEX "idx_customer_reminders_sent_at" ON "public"."customer_reminders" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_customer_reminders_tenant_store" ON "public"."customer_reminders" USING "btree" ("tenant_id", "store_id");



CREATE INDEX "idx_followup_notes_party" ON "public"."followup_notes" USING "btree" ("party_id");



CREATE INDEX "idx_followup_notes_promise_date" ON "public"."followup_notes" USING "btree" ("promise_to_pay_date");



CREATE INDEX "idx_followup_notes_tenant_store" ON "public"."followup_notes" USING "btree" ("tenant_id", "store_id");



CREATE INDEX "idx_import_runs_created_at" ON "public"."import_runs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_import_runs_initiated_by" ON "public"."import_runs" USING "btree" ("initiated_by");



CREATE INDEX "idx_import_runs_status_created_at" ON "public"."import_runs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_item_batches_expires_at" ON "public"."item_batches" USING "btree" ("expires_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_item_batches_item_store" ON "public"."item_batches" USING "btree" ("item_id", "store_id");



CREATE INDEX "idx_items_barcode_trgm" ON "public"."items" USING "gin" ("barcode" "extensions"."gin_trgm_ops") WHERE ("barcode" IS NOT NULL);



CREATE UNIQUE INDEX "idx_items_barcode_unique" ON "public"."items" USING "btree" ("barcode") WHERE ("barcode" IS NOT NULL);



CREATE INDEX "idx_items_brand_trgm" ON "public"."items" USING "gin" ("brand" "extensions"."gin_trgm_ops") WHERE ("brand" IS NOT NULL);



CREATE INDEX "idx_items_group_tag" ON "public"."items" USING "btree" ("group_tag") WHERE ("group_tag" IS NOT NULL);



CREATE INDEX "idx_items_name_trgm" ON "public"."items" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_items_short_code" ON "public"."items" USING "btree" ("short_code") WHERE ("short_code" IS NOT NULL);



CREATE INDEX "idx_items_sku" ON "public"."items" USING "btree" ("sku");



CREATE INDEX "idx_items_sku_trgm" ON "public"."items" USING "gin" ("sku" "extensions"."gin_trgm_ops") WHERE ("sku" IS NOT NULL);



CREATE UNIQUE INDEX "idx_items_unique_barcode_non_empty" ON "public"."items" USING "btree" (NULLIF(TRIM(BOTH FROM "barcode"), ''::"text")) WHERE (NULLIF(TRIM(BOTH FROM "barcode"), ''::"text") IS NOT NULL);



CREATE UNIQUE INDEX "idx_items_unique_sku_non_empty" ON "public"."items" USING "btree" (NULLIF(TRIM(BOTH FROM "sku"), ''::"text")) WHERE (NULLIF(TRIM(BOTH FROM "sku"), ''::"text") IS NOT NULL);



CREATE INDEX "idx_ledger_batches_store_posted" ON "public"."ledger_batches" USING "btree" ("store_id", "posted_at" DESC);



CREATE INDEX "idx_ledger_entries_batch" ON "public"."ledger_entries" USING "btree" ("batch_id");



CREATE UNIQUE INDEX "idx_ledger_sale_batch_unique" ON "public"."ledger_batches" USING "btree" ("source_type", "source_id") WHERE (("source_type" = 'sale'::"text") AND ("source_id" IS NOT NULL));



CREATE INDEX "idx_lpq_claimed_expiry" ON "public"."ledger_posting_queue" USING "btree" ("lock_expires_at") WHERE ("status" = 'CLAIMED'::"text");



CREATE INDEX "idx_lpq_pending_claim" ON "public"."ledger_posting_queue" USING "btree" ("priority" DESC, "created_at") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "idx_lpq_retry_schedule" ON "public"."ledger_posting_queue" USING "btree" ("status", "next_retry_at", "priority" DESC, "created_at");



CREATE INDEX "idx_lpq_store_status" ON "public"."ledger_posting_queue" USING "btree" ("store_id", "status", "created_at");



CREATE INDEX "idx_sale_items_item" ON "public"."sale_items" USING "btree" ("item_id");



CREATE INDEX "idx_sale_items_item_id" ON "public"."sale_items" USING "btree" ("item_id");



CREATE INDEX "idx_sale_items_sale" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_payments_sale" ON "public"."sale_payments" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_cashier_created" ON "public"."sales" USING "btree" ("cashier_id", "created_at" DESC);



CREATE INDEX "idx_sales_created_at" ON "public"."sales" USING "btree" ("created_at");



CREATE INDEX "idx_sales_ledger_batch" ON "public"."sales" USING "btree" ("ledger_batch_id");



CREATE INDEX "idx_sales_receipt_number" ON "public"."sales" USING "btree" ("sale_number");



CREATE INDEX "idx_sales_session" ON "public"."sales" USING "btree" ("session_id");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_sales_store_client_txn" ON "public"."sales" USING "btree" ("store_id", "client_transaction_id") WHERE ("client_transaction_id" IS NOT NULL);



CREATE INDEX "idx_sales_store_created" ON "public"."sales" USING "btree" ("store_id", "created_at" DESC);



CREATE INDEX "idx_sales_store_id" ON "public"."sales" USING "btree" ("store_id");



CREATE INDEX "idx_stock_levels_store_item" ON "public"."stock_levels" USING "btree" ("store_id", "item_id");



CREATE INDEX "idx_stock_movements_created_at" ON "public"."stock_movements" USING "btree" ("created_at");



CREATE INDEX "idx_stock_movements_item_id" ON "public"."stock_movements" USING "btree" ("item_id");



CREATE INDEX "idx_stock_movements_item_store" ON "public"."stock_movements" USING "btree" ("item_id", "store_id", "created_at" DESC);



CREATE INDEX "idx_stock_movements_reason" ON "public"."stock_movements" USING "btree" ("reason");



CREATE INDEX "idx_stock_movements_store_id" ON "public"."stock_movements" USING "btree" ("store_id");



CREATE INDEX "idx_stores_code" ON "public"."stores" USING "btree" ("code");



CREATE OR REPLACE TRIGGER "auto_po_number" BEFORE INSERT ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."generate_po_number"();



CREATE OR REPLACE TRIGGER "auto_sale_number" BEFORE INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."generate_sale_number"();



CREATE OR REPLACE TRIGGER "auto_session_number" BEFORE INSERT ON "public"."pos_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."generate_session_number"();



CREATE OR REPLACE TRIGGER "set_discounts_updated_at" BEFORE UPDATE ON "public"."discounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_item_batches_updated_at" BEFORE UPDATE ON "public"."item_batches" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_purchase_orders_updated_at" BEFORE UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_stock_alert_thresholds_updated_at" BEFORE UPDATE ON "public"."stock_alert_thresholds" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_stock_transfers_updated_at" BEFORE UPDATE ON "public"."stock_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE CONSTRAINT TRIGGER "trg_deferred_ledger_balance" AFTER INSERT OR UPDATE ON "public"."ledger_entries" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_ledger_batch_balance"();



CREATE OR REPLACE TRIGGER "trg_enqueue_sale_for_ledger_posting" AFTER INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"();



CREATE OR REPLACE TRIGGER "trg_ledger_workers_set_updated_at" BEFORE UPDATE ON "public"."ledger_workers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_lpq_set_updated_at" BEFORE UPDATE ON "public"."ledger_posting_queue" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_prevent_ledger_batches_mutation" BEFORE DELETE OR UPDATE ON "public"."ledger_batches" FOR EACH ROW WHEN (("old"."status" = 'POSTED'::"text")) EXECUTE FUNCTION "public"."prevent_ledger_mutation"();



CREATE OR REPLACE TRIGGER "trg_prevent_ledger_entries_mutation" BEFORE DELETE OR UPDATE ON "public"."ledger_entries" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_ledger_mutation"();



CREATE OR REPLACE TRIGGER "trg_prevent_sale_audit_log_update" BEFORE DELETE OR UPDATE ON "public"."sale_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_sale_audit_log_mutation"();



CREATE OR REPLACE TRIGGER "update_competitor_prices_timestamp" BEFORE UPDATE ON "public"."competitor_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_competitor_price_timestamp"();



CREATE OR REPLACE TRIGGER "update_items_timestamp" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



ALTER TABLE ONLY "public"."accounting_periods"
    ADD CONSTRAINT "accounting_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."accounting_periods"
    ADD CONSTRAINT "accounting_periods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_secondary_approver_user_id_fkey" FOREIGN KEY ("secondary_approver_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."close_review_log"
    ADD CONSTRAINT "close_review_log_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitor_prices"
    ADD CONSTRAINT "competitor_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_reminders"
    ADD CONSTRAINT "customer_reminders_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_reminders"
    ADD CONSTRAINT "customer_reminders_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_reminders"
    ADD CONSTRAINT "customer_reminders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_reminders"
    ADD CONSTRAINT "customer_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_ledger_batch_id_fkey" FOREIGN KEY ("ledger_batch_id") REFERENCES "public"."ledger_batches"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followup_notes"
    ADD CONSTRAINT "followup_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."followup_notes"
    ADD CONSTRAINT "followup_notes_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followup_notes"
    ADD CONSTRAINT "followup_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followup_notes"
    ADD CONSTRAINT "followup_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_runs"
    ADD CONSTRAINT "import_runs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_batches"
    ADD CONSTRAINT "item_batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_batches"
    ADD CONSTRAINT "item_batches_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_batches"
    ADD CONSTRAINT "item_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_batches"
    ADD CONSTRAINT "journal_batches_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."journal_batches"
    ADD CONSTRAINT "journal_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."journal_batches"
    ADD CONSTRAINT "journal_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."journal_batches"
    ADD CONSTRAINT "journal_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "public"."ledger_accounts"("id");



ALTER TABLE ONLY "public"."ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_batches"
    ADD CONSTRAINT "ledger_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ledger_batches"
    ADD CONSTRAINT "ledger_batches_reverses_batch_id_fkey" FOREIGN KEY ("reverses_batch_id") REFERENCES "public"."ledger_batches"("id");



ALTER TABLE ONLY "public"."ledger_batches"
    ADD CONSTRAINT "ledger_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."ledger_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_entries"
    ADD CONSTRAINT "ledger_entries_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."ledger_posting_idempotency"
    ADD CONSTRAINT "ledger_posting_idempotency_ledger_batch_id_fkey" FOREIGN KEY ("ledger_batch_id") REFERENCES "public"."ledger_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ledger_posting_idempotency"
    ADD CONSTRAINT "ledger_posting_idempotency_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_posting_queue"
    ADD CONSTRAINT "ledger_posting_queue_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ledger_posting_queue"
    ADD CONSTRAINT "ledger_posting_queue_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parties"
    ADD CONSTRAINT "parties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_override_tokens"
    ADD CONSTRAINT "pos_override_tokens_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pos_override_tokens"
    ADD CONSTRAINT "pos_override_tokens_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_override_tokens"
    ADD CONSTRAINT "pos_override_tokens_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."receipt_config"
    ADD CONSTRAINT "receipt_config_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipt_counters"
    ADD CONSTRAINT "receipt_counters_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."sale_audit_log"
    ADD CONSTRAINT "sale_audit_log_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sale_audit_log"
    ADD CONSTRAINT "sale_audit_log_override_user_id_fkey" FOREIGN KEY ("override_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sale_audit_log"
    ADD CONSTRAINT "sale_audit_log_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."sale_audit_log"
    ADD CONSTRAINT "sale_audit_log_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_sync_conflicts"
    ADD CONSTRAINT "sale_sync_conflicts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sale_sync_conflicts"
    ADD CONSTRAINT "sale_sync_conflicts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_ledger_batch_id_fkey" FOREIGN KEY ("ledger_batch_id") REFERENCES "public"."ledger_batches"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_alert_thresholds"
    ADD CONSTRAINT "stock_alert_thresholds_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_alert_thresholds"
    ADD CONSTRAINT "stock_alert_thresholds_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



CREATE POLICY "Admins manage competitor prices" ON "public"."competitor_prices" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins manage items" ON "public"."items" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Allow read to authenticated" ON "public"."competitor_prices" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read to authenticated" ON "public"."items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read stock levels" ON "public"."stock_levels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read users" ON "public"."users" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Staff roles can manage stock levels" ON "public"."stock_levels" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "auth_id"));



ALTER TABLE "public"."accounting_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ap_select" ON "public"."accounting_periods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batches_no_client_access" ON "public"."batches" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "cashiers add sales" ON "public"."sales" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['cashier'::"text", 'manager'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_admin" ON "public"."categories" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "categories_insert_admin" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "categories_select_authenticated" ON "public"."categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "categories_update_admin" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = 'admin'::"text")))));



ALTER TABLE "public"."close_review_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitor_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crl_insert" ON "public"."close_review_log" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."id" = "close_review_log"."reviewer_user_id") AND ("actor"."store_id" = "close_review_log"."store_id") AND ("actor"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "crl_select" ON "public"."close_review_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])) OR (("actor"."role" = 'manager'::"text") AND ("actor"."store_id" = "close_review_log"."store_id")))))));



CREATE POLICY "crl_update" ON "public"."close_review_log" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



ALTER TABLE "public"."customer_reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "disc_select" ON "public"."discounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "disc_write" ON "public"."discounts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."discounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_insert" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "expenses_select" ON "public"."expenses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."followup_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."idempotency_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "import_runs_admin_manager_select" ON "public"."import_runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_batches_select" ON "public"."item_batches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "item_batches_write" ON "public"."item_batches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "la_select" ON "public"."ledger_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "lb_select" ON "public"."ledger_batches" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "le_select" ON "public"."ledger_entries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ledger_batches" "lb"
     JOIN "public"."users" "u" ON (("u"."auth_id" = "auth"."uid"())))
  WHERE (("lb"."id" = "ledger_entries"."batch_id") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."ledger_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ledger_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ledger_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ledger_posting_idempotency" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ledger_posting_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ledger_workers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_select" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "pm_write" ON "public"."payment_methods" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "po_items_select" ON "public"."purchase_order_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "po_items_write" ON "public"."purchase_order_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."pos_override_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pos_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pot_select" ON "public"."pos_override_tokens" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchase_orders_select" ON "public"."purchase_orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "purchase_orders_write" ON "public"."purchase_orders" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



CREATE POLICY "rc_select" ON "public"."receipt_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rc_write" ON "public"."receipt_config" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = 'admin'::"text")))));



ALTER TABLE "public"."receipt_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receipt_counters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "receipt_counters_no_client_access" ON "public"."receipt_counters" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "returns_no_client_access" ON "public"."returns" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "sal_select" ON "public"."sale_audit_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."sale_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_select_staff" ON "public"."sale_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."sale_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_sync_conflicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_insert" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"]))))));



CREATE POLICY "sales_select_manager" ON "public"."sales" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "sales_select_own" ON "public"."sales" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."id" = "sales"."cashier_id") AND ("u"."created_at" >= CURRENT_DATE)))));



CREATE POLICY "sales_void" ON "public"."sales" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "ses_insert" ON "public"."pos_sessions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"]))))));



CREATE POLICY "ses_select_manager" ON "public"."pos_sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "ses_select_own" ON "public"."pos_sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."id" = "pos_sessions"."cashier_id")))));



CREATE POLICY "ses_update" ON "public"."pos_sessions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."id" = "pos_sessions"."cashier_id") OR ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



CREATE POLICY "si_insert" ON "public"."sale_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"]))))));



CREATE POLICY "si_select" ON "public"."sale_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sales" "s"
     JOIN "public"."users" "u" ON (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("s"."id" = "sale_items"."sale_id") AND (("u"."id" = "s"."cashier_id") OR ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



CREATE POLICY "sp_insert" ON "public"."sale_payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"]))))));



CREATE POLICY "sp_select" ON "public"."sale_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sales" "s"
     JOIN "public"."users" "u" ON (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("s"."id" = "sale_payments"."sale_id") AND (("u"."id" = "s"."cashier_id") OR ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



CREATE POLICY "ssc_insert" ON "public"."sale_sync_conflicts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"]))))));



CREATE POLICY "ssc_select" ON "public"."sale_sync_conflicts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "ssc_update" ON "public"."sale_sync_conflicts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."stock_alert_thresholds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_alert_thresholds_read_all" ON "public"."stock_alert_thresholds" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "stock_alert_thresholds_write_staff" ON "public"."stock_alert_thresholds" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."stock_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_movements_insert_staff" ON "public"."stock_movements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



CREATE POLICY "stock_movements_select_staff" ON "public"."stock_movements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."stock_transfer_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_transfer_items_read_authenticated" ON "public"."stock_transfer_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "stock_transfer_items_write_staff" ON "public"."stock_transfer_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."stock_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_transfers_read_authenticated" ON "public"."stock_transfers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "stock_transfers_write_staff" ON "public"."stock_transfers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'stock'::"text"]))))));



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores_delete_admin_manager" ON "public"."stores" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "stores_insert_admin_manager" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "stores_select_authenticated" ON "public"."stores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "stores_update_admin_manager" ON "public"."stores" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "suppliers_write" ON "public"."suppliers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."batches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."categories";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."competitor_prices";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."import_runs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."purchase_orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."receipt_config";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."receipt_counters";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."returns";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sale_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sale_payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sale_sync_conflicts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sales";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_alert_thresholds";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_levels";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_movements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_transfer_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_transfers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stores";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."suppliers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tenants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date", "p_manufactured_at" "date", "p_notes" "text", "p_po_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date", "p_manufactured_at" "date", "p_notes" "text", "p_po_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date", "p_manufactured_at" "date", "p_notes" "text", "p_po_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_batch_and_adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_batch_number" "text", "p_qty" integer, "p_expires_at" "date", "p_manufactured_at" "date", "p_notes" "text", "p_po_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_followup_note"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_note_text" "text", "p_promise_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_notes" "text", "p_performed_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_notes" "text", "p_performed_by" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."adjust_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_notes" "text", "p_performed_by" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authenticate_staff_pin"("p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_ledger_batch_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_ledger_batch_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ledger_batch_balance"() TO "service_role";



GRANT ALL ON TABLE "public"."ledger_posting_queue" TO "anon";
GRANT ALL ON TABLE "public"."ledger_posting_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_posting_queue" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_ledger_posting_jobs"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_accounting_period"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_pos_session"("p_session_id" "uuid", "p_closing_cash" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."close_pos_session"("p_session_id" "uuid", "p_closing_cash" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_pos_session"("p_session_id" "uuid", "p_closing_cash" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_transaction_trace_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_transaction_trace_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_transaction_trace_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_transaction_trace_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale"("p_store_id" "uuid", "p_cashier_id" "uuid", "p_session_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb", "p_discount" numeric, "p_client_transaction_id" "text", "p_notes" "text", "p_snapshot" "jsonb", "p_fulfillment_policy" "text", "p_override_token" "text", "p_override_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_transfer"("p_from_store_id" "uuid", "p_to_store_id" "uuid", "p_notes" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_ledger_worker"("p_worker_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."decrement_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting"("p_sale_id" "uuid", "p_store_id" "uuid", "p_priority" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_sale_for_ledger_posting_from_sales"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_expense_ledger_accounts"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_expense_ledger_accounts"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_expense_ledger_accounts"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_sale_ledger_accounts"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_daily_reconciliation"("p_store_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_po_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_po_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_po_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sale_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sale_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sale_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_session_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_session_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_session_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_from" "date", "p_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_close_risk_analytics"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_from" "date", "p_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_movement_trend"("p_store_id" "uuid", "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_batches"("p_store_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inventory_list"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_list"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_list"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_summary"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_manager_dashboard_stats"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_governance_scorecard"("p_store_id" "uuid", "p_manager_user_id" "uuid", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_new_receipt"("store" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_new_receipt"("store" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_new_receipt"("store" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_ar_account"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_ar_account"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_ar_account"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pos_categories"("p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_receivables_aging"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_session_summary"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_session_summary"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_session_summary"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_slow_moving_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_history_simple"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_history_simple"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_history_simple"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_stock_movements"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_stock_movements"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_movements"("p_store_id" "uuid", "p_item_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_valuation"("p_store_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_selling_items"("p_store_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."heartbeat_ledger_worker"("p_worker_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."import_apply_stock_delta"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_apply_stock_delta"("p_store_id" "uuid", "p_item_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."import_historical_daily_sale"("p_store_id" "uuid", "p_date" "date", "p_cash_amount" numeric, "p_bkash_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."import_historical_daily_sale"("p_store_id" "uuid", "p_date" "date", "p_cash_amount" numeric, "p_bkash_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_historical_daily_sale"("p_store_id" "uuid", "p_date" "date", "p_cash_amount" numeric, "p_bkash_amount" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ledger_worker_alive"("p_worker_id" "text", "p_max_staleness" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_period_closed"("p_store_id" "uuid", "p_posted_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."is_period_closed"("p_store_id" "uuid", "p_posted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_period_closed"("p_store_id" "uuid", "p_posted_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb", "p_ttl_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb", "p_ttl_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb", "p_ttl_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_pos_override_token"("p_store_id" "uuid", "p_reason" "text", "p_affected_items" "jsonb", "p_ttl_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_customer_reminder"("p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb", "p_requires_manager_review" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb", "p_requires_manager_review" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb", "p_requires_manager_review" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_sale_sync_conflict"("p_store_id" "uuid", "p_client_transaction_id" "text", "p_conflict_type" "text", "p_details" "jsonb", "p_requires_manager_review" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_item_by_scan"("p_scan_value" "text", "p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_followup_resolved"("p_note_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."post_sale_to_ledger"("p_sale_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_ledger_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_ledger_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_ledger_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_sale_audit_log_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_sale_audit_log_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_sale_audit_log_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_ledger_posting_batch"("p_worker_id" "text", "p_batch_size" integer, "p_store_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_pending_ledger_postings"("p_store_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_po_id" "uuid", "p_received_items" "jsonb", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reclaim_stale_ledger_locks"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reclaim_stale_ledger_locks"() TO "anon";
GRANT ALL ON FUNCTION "public"."reclaim_stale_ledger_locks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reclaim_stale_ledger_locks"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_customer_payment"("p_idempotency_key" "text", "p_tenant_id" "uuid", "p_store_id" "uuid", "p_party_id" "uuid", "p_amount" numeric, "p_payment_account_id" "uuid", "p_client_transaction_id" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_expense"("p_store_id" "uuid", "p_date" "date", "p_vendor" "text", "p_description" "text", "p_amount" numeric, "p_payment_type" "text", "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_expense"("p_store_id" "uuid", "p_date" "date", "p_vendor" "text", "p_description" "text", "p_amount" numeric, "p_payment_type" "text", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_expense"("p_store_id" "uuid", "p_date" "date", "p_vendor" "text", "p_description" "text", "p_amount" numeric, "p_payment_type" "text", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_ledger_worker"("p_worker_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_ledger_job_lease"("p_worker_id" "text", "p_queue_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replay_sale_ledger_chain"("p_sale_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_payment_ledger_account"("p_store_id" "uuid", "p_payment_method_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text", "p_category_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text", "p_category_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text", "p_category_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_items_pos"("p_store_id" "uuid", "p_query" "text", "p_category_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_new_qty" integer, "p_reason" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_new_qty" integer, "p_reason" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_stock"("p_store_id" "uuid", "p_item_id" "uuid", "p_new_qty" integer, "p_reason" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_competitor_price_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_competitor_price_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_competitor_price_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_transfer_status"("p_transfer_id" "uuid", "p_new_status" "public"."stock_transfer_status", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_stock_level"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_stock_level"("p_store_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_sale_intent"("p_snapshot" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_trial_balance"("p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_sale"("p_sale_id" "uuid", "p_reason" "text") TO "service_role";

































GRANT ALL ON TABLE "public"."accounting_periods" TO "anon";
GRANT ALL ON TABLE "public"."accounting_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."accounting_periods" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."close_review_log" TO "anon";
GRANT ALL ON TABLE "public"."close_review_log" TO "authenticated";
GRANT ALL ON TABLE "public"."close_review_log" TO "service_role";



GRANT ALL ON TABLE "public"."competitor_prices" TO "anon";
GRANT ALL ON TABLE "public"."competitor_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."competitor_prices" TO "service_role";



GRANT ALL ON TABLE "public"."customer_reminders" TO "anon";
GRANT ALL ON TABLE "public"."customer_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."discounts" TO "anon";
GRANT ALL ON TABLE "public"."discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."discounts" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."followup_notes" TO "anon";
GRANT ALL ON TABLE "public"."followup_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."followup_notes" TO "service_role";



GRANT ALL ON TABLE "public"."idempotency_keys" TO "anon";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "service_role";



GRANT ALL ON TABLE "public"."import_runs" TO "anon";
GRANT ALL ON TABLE "public"."import_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."import_runs" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."item_batches" TO "anon";
GRANT ALL ON TABLE "public"."item_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."item_batches" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."journal_batches" TO "anon";
GRANT ALL ON TABLE "public"."journal_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_batches" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_accounts" TO "anon";
GRANT ALL ON TABLE "public"."ledger_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_batches" TO "anon";
GRANT ALL ON TABLE "public"."ledger_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_batches" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_entries" TO "anon";
GRANT ALL ON TABLE "public"."ledger_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_entries" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_posting_idempotency" TO "anon";
GRANT ALL ON TABLE "public"."ledger_posting_idempotency" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_posting_idempotency" TO "service_role";



GRANT ALL ON TABLE "public"."ledger_workers" TO "anon";
GRANT ALL ON TABLE "public"."ledger_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."ledger_workers" TO "service_role";



GRANT ALL ON TABLE "public"."parties" TO "anon";
GRANT ALL ON TABLE "public"."parties" TO "authenticated";
GRANT ALL ON TABLE "public"."parties" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON SEQUENCE "public"."po_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."po_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."po_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pos_override_tokens" TO "anon";
GRANT ALL ON TABLE "public"."pos_override_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_override_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."pos_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pos_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."receipt_config" TO "anon";
GRANT ALL ON TABLE "public"."receipt_config" TO "authenticated";
GRANT ALL ON TABLE "public"."receipt_config" TO "service_role";



GRANT ALL ON TABLE "public"."receipt_counters" TO "anon";
GRANT ALL ON TABLE "public"."receipt_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."receipt_counters" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."sale_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."sale_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sale_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sale_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sale_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sale_payments" TO "anon";
GRANT ALL ON TABLE "public"."sale_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sale_sync_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."sale_sync_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_sync_conflicts" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."session_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."session_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."session_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock_alert_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."stock_alert_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_alert_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."stock_levels" TO "anon";
GRANT ALL ON TABLE "public"."stock_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_levels" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transfer_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_transfer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transfer_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transfers" TO "anon";
GRANT ALL ON TABLE "public"."stock_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































