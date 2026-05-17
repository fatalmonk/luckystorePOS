-- Migration: Update get_pos_categories to include image_url, color, icon
-- Applied: 2026-05-11
-- Fixes: aggregate function calls cannot be nested by keeping COUNT in the inner subquery.

CREATE OR REPLACE FUNCTION public.get_pos_categories(p_store_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
    JOIN public.items i ON i.category_id = c.id AND i.active = true
    GROUP BY c.id, c.name, c.image_url, c.color, c.icon
    HAVING COUNT(i.id) > 0
  ) r;
$$;

ALTER FUNCTION public.get_pos_categories(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_pos_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_categories(uuid) TO service_role;
