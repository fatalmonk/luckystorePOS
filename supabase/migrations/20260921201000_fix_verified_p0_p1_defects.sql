-- Migration: 20260921201000_fix_verified_p0_p1_defects.sql
-- Harden scanner, payment allocation, party compatibility, and idempotency
-- without destroying historical function/column contracts.

-- ============================================================================
-- P0.1: scanner tenant/store isolation
-- ============================================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.lookup_item_by_scan_anon(
  p_barcode text,
  p_store_id uuid
)
RETURNS TABLE (item_id uuid, name text, price numeric, mrp numeric, stock integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_tenant_id uuid;
  v_is_public_storefront boolean;
BEGIN
  SELECT
    tenant_id,
    CASE
      WHEN jsonb_typeof(metadata->'is_public_storefront') = 'boolean'
        THEN (metadata->>'is_public_storefront')::boolean
      ELSE false
    END
    INTO v_store_tenant_id, v_is_public_storefront
  FROM public.stores
  WHERE id = p_store_id;

  IF v_store_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found' USING ERRCODE = '42501';
  END IF;

  IF v_is_public_storefront IS NOT TRUE THEN
    RAISE EXCEPTION 'Store not accessible to anonymous users' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT i.id, i.name, i.price, i.mrp, COALESCE(sl.qty, 0)::integer
  FROM public.items i
  LEFT JOIN public.stock_levels sl
    ON sl.item_id = i.id
   AND sl.store_id = p_store_id
  WHERE i.tenant_id = v_store_tenant_id
    AND (i.barcode = p_barcode OR i.sku = p_barcode)
    AND i.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_item_by_scan(
  p_barcode text,
  p_store_id uuid
)
RETURNS TABLE (item_id uuid, name text, price numeric, mrp numeric, stock integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_user public.users%ROWTYPE;
  v_store_tenant_id uuid;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE auth_id = v_auth_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_store_tenant_id
  FROM public.stores
  WHERE id = p_store_id;

  IF v_store_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found' USING ERRCODE = '42501';
  END IF;

  IF v_user.tenant_id IS DISTINCT FROM v_store_tenant_id THEN
    RAISE EXCEPTION 'Access denied: store belongs to different tenant' USING ERRCODE = '42501';
  END IF;

  IF v_user.role = 'cashier' AND v_user.store_id IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'Access denied: cashier not assigned to this store' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT i.id, i.name, i.price, i.mrp, COALESCE(sl.qty, 0)::integer
  FROM public.items i
  LEFT JOIN public.stock_levels sl
    ON sl.item_id = i.id
   AND sl.store_id = p_store_id
  WHERE i.tenant_id = v_store_tenant_id
    AND (i.barcode = p_barcode OR i.sku = p_barcode)
    AND i.is_active = true
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_item_by_scan_anon(text, uuid) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan_anon(text, uuid) TO anon, service_role;
REVOKE ALL ON FUNCTION public.lookup_item_by_scan(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_item_by_scan(text, uuid) TO authenticated, service_role;

-- ============================================================================
-- P0.2: preserve the five-argument FIFO allocator and add authorization
-- ============================================================================

DROP FUNCTION IF EXISTS public.allocate_payment_to_invoices(uuid, uuid);

CREATE OR REPLACE FUNCTION public.allocate_payment_to_invoices(
  p_tenant_id uuid,
  p_party_id uuid,
  p_payment_amount numeric,
  p_ledger_batch_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_user_tenant_id uuid;
  v_user_role text;
  v_party_tenant_id uuid;
  v_remaining numeric(12,2) := ROUND(p_payment_amount, 2);
  v_sale record;
  v_open_balance numeric(12,2);
  v_alloc_amount numeric(12,2);
  v_allocated_total numeric(12,2) := 0;
  v_invoice_count integer := 0;
  v_allocations jsonb := '[]'::jsonb;
BEGIN
  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT tenant_id, role
      INTO v_user_tenant_id, v_user_role
    FROM public.users
    WHERE auth_id = auth.uid();

    IF v_user_tenant_id IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Access denied: caller not in target tenant' USING ERRCODE = '42501';
    END IF;

    -- Allocation can mutate multiple invoices/stores for one customer, so it is
    -- a tenant-level financial operation. Store-scoped cashier authorization is
    -- insufficient; only tenant managers/admins may invoke it directly.
    IF v_user_role NOT IN ('admin', 'manager') THEN
      RAISE EXCEPTION 'Access denied: invoice allocation requires manager or admin role' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT tenant_id INTO v_party_tenant_id
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_tenant_id IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'Party not found in target tenant' USING ERRCODE = '42501';
  END IF;

  IF p_ledger_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.ledger_batches lb
    JOIN public.stores st ON st.id = lb.store_id
    WHERE lb.id = p_ledger_batch_id
      AND st.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Ledger batch not found in target tenant' USING ERRCODE = '42501';
  END IF;

  IF p_payment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sale_payments sp
    JOIN public.sales s ON s.id = sp.sale_id
    JOIN public.stores st ON st.id = s.store_id
    WHERE sp.id = p_payment_id
      AND st.tenant_id = p_tenant_id
      AND s.customer_id = p_party_id
  ) THEN
    RAISE EXCEPTION 'Payment not found for target tenant/customer' USING ERRCODE = '42501';
  END IF;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'NOOP',
      'allocated_total', 0,
      'remaining', 0,
      'invoice_count', 0,
      'allocations', '[]'::jsonb
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
      AND s.credit_status <> 'PAID'
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

REVOKE ALL ON FUNCTION public.allocate_payment_to_invoices(uuid, uuid, numeric, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_payment_to_invoices(uuid, uuid, numeric, uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- P0.3: party type compatibility
-- ============================================================================
-- Keep both names during the compatibility window. Existing-row reconciliation
-- is intentionally deferred to the next nontransactional batched migration.

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS party_type text;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS type text;

CREATE OR REPLACE FUNCTION public.sync_party_type_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.party_type := COALESCE(NEW.party_type, NEW.type, 'customer');
    NEW.type := NEW.party_type;
  ELSE
    IF NEW.party_type IS DISTINCT FROM OLD.party_type THEN
      NEW.type := NEW.party_type;
    ELSIF NEW.type IS DISTINCT FROM OLD.type THEN
      NEW.party_type := NEW.type;
    ELSE
      NEW.party_type := COALESCE(NEW.party_type, NEW.type, 'customer');
      NEW.type := NEW.party_type;
    END IF;
  END IF;

  IF NEW.party_type NOT IN ('customer', 'supplier', 'employee') THEN
    RAISE EXCEPTION 'Invalid party type: %', NEW.party_type USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_party_type_columns ON public.parties;
CREATE TRIGGER trg_sync_party_type_columns
BEFORE INSERT OR UPDATE OF party_type, type ON public.parties
FOR EACH ROW EXECUTE FUNCTION public.sync_party_type_columns();

-- ============================================================================
-- P1.1: tenant-scoped idempotency uniqueness/state contract
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND conname = 'idempotency_keys_tenant_key_unique'
  ) THEN
    RAISE EXCEPTION 'Tenant idempotency uniqueness phase is missing';
  END IF;
END
$$;

ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'CLAIMED',
  ADD COLUMN IF NOT EXISTS response_body jsonb,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE OR REPLACE FUNCTION public.normalize_idempotency_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.response_body IS NOT NULL THEN
    NEW.status := 'COMPLETED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_idempotency_terminal_status ON public.idempotency_keys;
CREATE TRIGGER trg_normalize_idempotency_terminal_status
BEFORE INSERT OR UPDATE ON public.idempotency_keys
FOR EACH ROW EXECUTE FUNCTION public.normalize_idempotency_terminal_status();

-- ============================================================================
-- P1.2: idempotency helpers with tenant authorization and replay semantics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_idempotency(
  p_key text,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_response jsonb;
  v_completed_at timestamptz;
  v_rows integer;
  v_status text;
  v_wait_count integer := 0;
  v_max_waits integer := 30;
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role', '') = 'service_role';
BEGIN
  IF p_key IS NULL OR TRIM(p_key) = '' THEN
    RETURN NULL;
  END IF;

  IF NOT v_is_service_role AND NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND u.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: caller not in target tenant' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.idempotency_keys (
    tenant_id, idempotency_key, status, locked_at
  ) VALUES (
    p_tenant_id, TRIM(p_key), 'CLAIMED', clock_timestamp()
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 1 THEN
    RETURN NULL;
  END IF;

  LOOP
    SELECT status, response_body, completed_at
      INTO v_status, v_response, v_completed_at
    FROM public.idempotency_keys
    WHERE tenant_id = p_tenant_id
      AND idempotency_key = TRIM(p_key);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Idempotency key disappeared during replay' USING ERRCODE = '55000';
    END IF;

    IF v_status = 'COMPLETED'
       OR (v_completed_at IS NOT NULL AND v_response IS NOT NULL) THEN
      IF v_status IS DISTINCT FROM 'COMPLETED' THEN
        UPDATE public.idempotency_keys
        SET status = 'COMPLETED'
        WHERE tenant_id = p_tenant_id
          AND idempotency_key = TRIM(p_key);
      END IF;
      RETURN v_response;
    END IF;

    IF v_status = 'IN_PROGRESS' THEN
      IF v_wait_count >= v_max_waits THEN
        RAISE EXCEPTION 'Operation timeout: in-progress idempotency key' USING ERRCODE = '55000';
      END IF;
      v_wait_count := v_wait_count + 1;
      PERFORM pg_sleep(0.1);
    ELSE
      RAISE EXCEPTION 'Concurrent request with overlapping idempotency key' USING ERRCODE = '55000';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_idempotency_in_progress(
  p_idempotency_key text,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role', '') = 'service_role';
BEGIN
  IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
    RETURN;
  END IF;

  IF NOT v_is_service_role AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid() AND u.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: caller not in target tenant' USING ERRCODE = '42501';
  END IF;

  UPDATE public.idempotency_keys
  SET status = 'IN_PROGRESS',
      locked_at = clock_timestamp()
  WHERE tenant_id = p_tenant_id
    AND idempotency_key = TRIM(p_idempotency_key)
    AND status = 'CLAIMED';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_idempotency_complete(
  p_idempotency_key text,
  p_tenant_id uuid,
  p_response jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role', '') = 'service_role';
BEGIN
  IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
    RETURN;
  END IF;

  IF NOT v_is_service_role AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid() AND u.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: caller not in target tenant' USING ERRCODE = '42501';
  END IF;

  UPDATE public.idempotency_keys
  SET status = 'COMPLETED',
      response_body = p_response,
      completed_at = clock_timestamp()
  WHERE tenant_id = p_tenant_id
    AND idempotency_key = TRIM(p_idempotency_key)
    AND status IN ('CLAIMED', 'IN_PROGRESS');
END;
$$;

REVOKE ALL ON FUNCTION public.check_idempotency(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_idempotency_in_progress(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_idempotency_complete(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_idempotency(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_idempotency_in_progress(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_idempotency_complete(text, uuid, jsonb) TO service_role;
