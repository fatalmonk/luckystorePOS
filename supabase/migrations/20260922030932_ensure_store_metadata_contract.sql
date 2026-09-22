-- The anonymous scanner's public-store flag is stored in this JSON contract.
-- Older deployments predate the column and must fail closed (empty metadata).

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

  -- Missing, malformed, or false metadata all remain private.
  IF v_is_public_storefront IS NOT TRUE THEN
    RAISE EXCEPTION 'Store not accessible to anonymous users' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    i.id AS item_id,
    i.name,
    i.price,
    i.mrp,
    COALESCE(sl.qty, 0)::integer AS stock
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
