-- Ledger posting hardening:
-- 1) DB-level idempotency marker independent of queue state
-- 2) Heartbeat-aware lease reclaim semantics
-- 3) Retry backoff to avoid retry storms

ALTER TABLE public.ledger_posting_queue
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lpq_retry_schedule
  ON public.ledger_posting_queue (status, next_retry_at, priority DESC, created_at);

CREATE TABLE IF NOT EXISTS public.ledger_posting_idempotency (
  sale_id uuid PRIMARY KEY REFERENCES public.sales(id) ON DELETE CASCADE,
  posting_state text NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (posting_state IN ('IN_PROGRESS', 'POSTED', 'FAILED')),
  ledger_batch_id uuid REFERENCES public.ledger_batches(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  first_started_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.ledger_posting_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ledger_posting_idempotency FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.is_ledger_worker_alive(
  p_worker_id text,
  p_max_staleness interval DEFAULT interval '60 seconds'
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ledger_workers w
    WHERE w.worker_id = p_worker_id
      AND w.active = true
      AND w.last_heartbeat >= now() - COALESCE(p_max_staleness, interval '60 seconds')
  );
$$;

CREATE OR REPLACE FUNCTION public.renew_ledger_job_lease(
  p_worker_id text,
  p_queue_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.reclaim_stale_ledger_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.claim_ledger_posting_jobs(
  p_worker_id text,
  p_batch_size integer DEFAULT 10,
  p_store_id uuid DEFAULT NULL
)
RETURNS SETOF public.ledger_posting_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.post_sale_to_ledger(
  p_sale_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.process_ledger_posting_batch(
  p_worker_id text,
  p_batch_size integer DEFAULT 50,
  p_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.is_ledger_worker_alive(text, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ledger_worker_alive(text, interval) TO authenticated;

REVOKE ALL ON FUNCTION public.renew_ledger_job_lease(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_ledger_job_lease(text, uuid) TO authenticated;
