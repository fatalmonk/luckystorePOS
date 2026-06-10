-- Grant anon access for the customer storefront
-- The storefront uses the anon key (no login required for browsing)

-- 1. Grant execute on the 5-param search_items_pos (the 2-param was already granted in 20260611000003)
GRANT EXECUTE ON FUNCTION public.search_items_pos(UUID, TEXT, UUID, INTEGER, INTEGER) TO anon;

-- 2. Allow anon to SELECT categories (needed for category grid on storefront)
DROP POLICY IF EXISTS "categories_select_anon" ON public.categories;
CREATE POLICY "categories_select_anon"
  ON public.categories
  FOR SELECT
  TO anon
  USING (active = true);
