-- Migration: 20260729014500_add_link_competitor_price_item_rpc.sql
-- Description: Create SECURITY DEFINER RPC to allow authenticated users to link competitor price records to inventory items.

CREATE OR REPLACE FUNCTION public.link_competitor_price_item(
  p_store_id uuid,
  p_price_record_id uuid,
  p_item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_price numeric;
  v_comp_price numeric;
  v_gap numeric;
  v_updated integer;
BEGIN
  -- Verify store access permission
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND public.get_current_user_store_id() IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'not authorized for store'
      USING ERRCODE = '42501';
  END IF;

  -- Fetch item price
  SELECT price INTO v_item_price
  FROM public.items
  WHERE id = p_item_id AND store_id = p_store_id;

  IF v_item_price IS NULL THEN
    RAISE EXCEPTION 'item not found for store';
  END IF;

  -- Fetch competitor price from record
  SELECT competitor_price INTO v_comp_price
  FROM public.competitor_prices
  WHERE id = p_price_record_id AND store_id = p_store_id;

  IF v_comp_price IS NULL THEN
    RAISE EXCEPTION 'competitor price record not found for store';
  END IF;

  v_gap := CASE
    WHEN v_comp_price > 0 THEN round((v_item_price - v_comp_price) / v_comp_price, 4)
    ELSE NULL
  END;

  UPDATE public.competitor_prices
  SET
    item_id = p_item_id,
    our_price = v_item_price,
    price_gap_percent = v_gap,
    match_confidence = 1.00000,
    matcher_version = 'url-direct-user',
    updated_at = now()
  WHERE id = p_price_record_id
    AND store_id = p_store_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;
