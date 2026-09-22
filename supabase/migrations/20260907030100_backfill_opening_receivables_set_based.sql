-- Phase 2 of the opening-receivables migration.
--
-- Recovery model:
--   * deterministic OPEN-AR-<full-party-uuid> sale numbers make this rerunnable;
--   * ON CONFLICT updates the derived opening amount instead of duplicating it;
--   * all attribution is preflighted before INSERT, so ambiguous multi-store
--     parties fail closed and leave no partial opening invoices.

DO $backfill$
DECLARE
  v_party_store_expression text;
  v_party_type_expression text;
  v_has_party_type boolean;
  v_has_legacy_type boolean;
  v_ambiguous_count bigint;
  v_cross_tenant_store_count bigint;
  v_missing_cashier_count bigint;
BEGIN
  v_party_store_expression := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'parties'
        AND column_name = 'store_id'
    ) THEN 'p.store_id'
    ELSE 'NULL::uuid'
  END;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parties' AND column_name = 'party_type'
  ) INTO v_has_party_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parties' AND column_name = 'type'
  ) INTO v_has_legacy_type;

  v_party_type_expression := CASE
    WHEN v_has_party_type AND v_has_legacy_type THEN 'COALESCE(p.party_type, p.type)'
    WHEN v_has_party_type THEN 'p.party_type'
    WHEN v_has_legacy_type THEN 'p.type'
    ELSE NULL
  END;

  IF v_party_type_expression IS NULL THEN
    RAISE EXCEPTION 'public.parties requires party_type or legacy type';
  END IF;

  EXECUTE format($sql$
    CREATE TEMP TABLE opening_ar_candidates ON COMMIT DROP AS
    WITH allocation_totals AS (
      SELECT sale_id, SUM(allocated_amount) AS paid
      FROM public.sale_payment_allocations
      GROUP BY sale_id
    ),
    open_sales AS (
      SELECT
        s.customer_id,
        st.tenant_id,
        SUM(GREATEST(s.total_amount - COALESCE(a.paid, 0), 0)) AS open_balance
      FROM public.sales s
      JOIN public.stores st ON st.id = s.store_id
      LEFT JOIN allocation_totals a ON a.sale_id = s.id
      WHERE s.customer_id IS NOT NULL
        AND s.credit_status <> 'PAID'
      GROUP BY s.customer_id, st.tenant_id
    ),
    tenant_stores AS (
      SELECT
        tenant_id,
        COUNT(*) AS store_count,
        (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS only_store_id
      FROM public.stores
      GROUP BY tenant_id
    ),
    tenant_cashiers AS (
      SELECT DISTINCT ON (tenant_id)
        tenant_id,
        id AS cashier_id
      FROM public.users
      WHERE role IN ('admin', 'manager')
      ORDER BY tenant_id, created_at ASC, id ASC
    )
    SELECT
      p.id AS party_id,
      p.tenant_id,
      COALESCE(
        %s,
        CASE WHEN ts.store_count = 1 THEN ts.only_store_id END
      ) AS resolved_store_id,
      tc.cashier_id,
      p.created_at AS party_created_at,
      ROUND(p.current_balance - COALESCE(os.open_balance, 0), 2) AS opening_amount,
      ts.store_count
    FROM public.parties p
    LEFT JOIN open_sales os
      ON os.customer_id = p.id
     AND os.tenant_id = p.tenant_id
    LEFT JOIN tenant_stores ts ON ts.tenant_id = p.tenant_id
    LEFT JOIN tenant_cashiers tc ON tc.tenant_id = p.tenant_id
    WHERE %s = 'customer'
      AND p.current_balance > 0
      AND ROUND(p.current_balance - COALESCE(os.open_balance, 0), 2) > 0
  $sql$, v_party_store_expression, v_party_type_expression);

  SELECT COUNT(*) INTO v_ambiguous_count
  FROM opening_ar_candidates
  WHERE resolved_store_id IS NULL;

  IF v_ambiguous_count > 0 THEN
    RAISE EXCEPTION
      'Opening AR backfill refused: % positive-balance customer(s) have no unambiguous store assignment; assign party.store_id or reduce tenant to one store before replay',
      v_ambiguous_count;
  END IF;

  SELECT COUNT(*) INTO v_cross_tenant_store_count
  FROM opening_ar_candidates c
  LEFT JOIN public.stores st ON st.id = c.resolved_store_id
  WHERE st.id IS NULL OR st.tenant_id IS DISTINCT FROM c.tenant_id;

  IF v_cross_tenant_store_count > 0 THEN
    RAISE EXCEPTION
      'Opening AR backfill refused: % candidate customer(s) resolve to a store outside their tenant',
      v_cross_tenant_store_count;
  END IF;

  SELECT COUNT(*) INTO v_missing_cashier_count
  FROM opening_ar_candidates
  WHERE cashier_id IS NULL;

  IF v_missing_cashier_count > 0 THEN
    RAISE EXCEPTION
      'Opening AR backfill refused: % candidate customer(s) have no admin/manager cashier for their tenant',
      v_missing_cashier_count;
  END IF;

  INSERT INTO public.sales (
    store_id,
    cashier_id,
    customer_id,
    sale_number,
    status,
    subtotal,
    discount_amount,
    total_amount,
    amount_tendered,
    change_due,
    payment_method,
    credit_terms_days,
    invoice_date,
    due_date,
    credit_status,
    accounting_posting_status,
    notes
  )
  SELECT
    c.resolved_store_id,
    c.cashier_id,
    c.party_id,
    'OPEN-AR-' || REPLACE(c.party_id::text, '-', ''),
    'completed',
    c.opening_amount,
    0,
    c.opening_amount,
    0,
    0,
    'Credit',
    30,
    c.party_created_at::date,
    (c.party_created_at::date + interval '30 days')::date,
    CASE
      WHEN (c.party_created_at::date + interval '30 days')::date < CURRENT_DATE THEN 'OVERDUE'
      ELSE 'UNPAID'
    END,
    'POSTED',
    'Opening Accounts Receivable document migrated from general ledger'
  FROM opening_ar_candidates c
  ON CONFLICT (sale_number) DO UPDATE
  SET store_id = EXCLUDED.store_id,
      cashier_id = EXCLUDED.cashier_id,
      customer_id = EXCLUDED.customer_id,
      subtotal = EXCLUDED.subtotal,
      total_amount = EXCLUDED.total_amount,
      invoice_date = EXCLUDED.invoice_date,
      due_date = EXCLUDED.due_date,
      credit_status = EXCLUDED.credit_status,
      notes = EXCLUDED.notes;

  UPDATE public.sales s
  SET credit_status = 'OVERDUE',
      updated_at = now()
  WHERE s.due_date < CURRENT_DATE
    AND s.credit_status IN ('UNPAID', 'PARTIALLY_PAID')
    AND s.total_amount > COALESCE((
      SELECT SUM(spa.allocated_amount)
      FROM public.sale_payment_allocations spa
      WHERE spa.sale_id = s.id
    ), 0);
END
$backfill$;
