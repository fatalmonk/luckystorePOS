-- Strict server-gated pre-check before complete_sale execution.
-- Flutter must not compute drift/stock/price rules locally.

CREATE OR REPLACE FUNCTION public.validate_sale_intent(
  p_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.validate_sale_intent(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_sale_intent(jsonb) TO authenticated;
