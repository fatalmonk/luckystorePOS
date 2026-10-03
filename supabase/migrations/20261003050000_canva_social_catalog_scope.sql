CREATE OR REPLACE FUNCTION public.canva_search_items(
  p_tenant_id uuid,
  p_store_id uuid,
  p_query text DEFAULT '',
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  image_url text,
  sku text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  WITH search_term AS (
    SELECT replace(
      replace(
        replace(coalesce(p_query, ''), E'\\', E'\\\\'),
        '%', E'\\%'
      ),
      '_', E'\\_'
    ) AS value
  )
  SELECT i.id, i.name, i.price, i.image_url, i.sku
  FROM public.items AS i
  JOIN public.stock_levels AS sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  JOIN public.stores AS s ON s.id = sl.store_id AND s.tenant_id = p_tenant_id
  CROSS JOIN search_term AS q
  WHERE i.tenant_id = p_tenant_id
    AND i.is_active IS TRUE
    AND (
      q.value = ''
      OR i.name ILIKE '%' || q.value || '%' ESCAPE E'\\'
      OR i.brand ILIKE '%' || q.value || '%' ESCAPE E'\\'
      OR i.sku ILIKE '%' || q.value || '%' ESCAPE E'\\'
      OR i.short_code ILIKE '%' || q.value || '%' ESCAPE E'\\'
      OR i.barcode ILIKE '%' || q.value || '%' ESCAPE E'\\'
    )
  ORDER BY i.name
  LIMIT greatest(1, least(coalesce(p_limit, 30), 30));
$function$;

REVOKE ALL ON FUNCTION public.canva_search_items(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canva_search_items(uuid, uuid, text, integer)
  TO service_role;
