-- Aggregate the internal daily WhatsApp report without exposing sale-level data.

CREATE OR REPLACE FUNCTION public.get_service_daily_sales_summary(
  p_start_at timestamptz,
  p_end_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_start_at IS NULL
     OR p_end_at IS NULL
     OR p_end_at <= p_start_at
     OR p_end_at - p_start_at > interval '2 days' THEN
    RAISE EXCEPTION 'A valid reporting window of at most 2 days is required';
  END IF;

  WITH eligible_sales AS (
    SELECT
      s.id,
      COALESCE(s.subtotal, 0) AS subtotal,
      COALESCE(s.discount_amount, 0) AS discount_amount,
      COALESCE(s.total_amount, 0) AS total_amount,
      COALESCE(s.change_due, 0) AS change_due
    FROM public.sales s
    WHERE s.status = 'completed'
      AND s.created_at >= p_start_at
      AND s.created_at < p_end_at
  ),
  sales_aggregate AS (
    SELECT
      count(*) AS transaction_count,
      COALESCE(sum(subtotal), 0) AS gross_sales,
      COALESCE(sum(discount_amount), 0) AS discounts,
      COALESCE(sum(total_amount), 0) AS sales_after_discount
    FROM eligible_sales
  ),
  returns_aggregate AS (
    SELECT COALESCE(sum(r.refund_amount), 0) AS returns
    FROM public.returns r
    WHERE r.created_at >= p_start_at
      AND r.created_at < p_end_at
  ),
  payment_per_sale AS (
    SELECT
      es.id,
      GREATEST(
        COALESCE(sum(sp.amount) FILTER (WHERE pm.type = 'cash'), 0)
          - es.change_due,
        0
      ) AS cash_total,
      COALESCE(
        sum(sp.amount) FILTER (WHERE pm.type <> 'cash'),
        0
      ) AS digital_total
    FROM eligible_sales es
    LEFT JOIN public.sale_payments sp ON sp.sale_id = es.id
    LEFT JOIN public.payment_methods pm ON pm.id = sp.payment_method_id
    GROUP BY es.id, es.change_due
  ),
  payments_aggregate AS (
    SELECT
      COALESCE(sum(cash_total), 0) AS cash_total,
      COALESCE(sum(digital_total), 0) AS digital_total
    FROM payment_per_sale
  ),
  queue_aggregate AS (
    SELECT
      count(*) FILTER (
        WHERE q.status IN ('PENDING', 'CLAIMED')
      ) AS pending_postings,
      count(*) FILTER (
        WHERE q.status = 'FAILED'
      ) AS failed_postings
    FROM public.ledger_posting_queue q
  )
  SELECT jsonb_build_object(
    'transaction_count', sa.transaction_count,
    'gross_sales', round(sa.gross_sales, 2),
    'discounts', round(sa.discounts, 2),
    'returns', round(ra.returns, 2),
    'net_sales', round(sa.sales_after_discount - ra.returns, 2),
    'cash_total', round(pa.cash_total, 2),
    'digital_total', round(pa.digital_total, 2),
    'pending_postings', qa.pending_postings,
    'failed_postings', qa.failed_postings
  )
  INTO v_result
  FROM sales_aggregate sa
  CROSS JOIN returns_aggregate ra
  CROSS JOIN payments_aggregate pa
  CROSS JOIN queue_aggregate qa;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_service_daily_sales_summary(
  timestamptz,
  timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_service_daily_sales_summary(
  timestamptz,
  timestamptz
) TO service_role;

COMMENT ON FUNCTION public.get_service_daily_sales_summary(
  timestamptz,
  timestamptz
) IS
  'Returns aggregate-only daily sales and ledger health metrics for trusted service workers.';
