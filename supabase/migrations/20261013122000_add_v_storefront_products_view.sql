-- Migration: Add v_storefront_products view
-- Algorithmic parity with apps/customer_storefront/app/lib/products/slugify.ts:toProductSlug

CREATE OR REPLACE VIEW public.v_storefront_products WITH (security_invoker = true) AS
SELECT
  id,
  name,
  price,
  image_url,
  category_id,
  is_active,
  'https://www.luckystore1947.com/product/' ||
  substring(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(name), '[^a-z0-9\s-]', '', 'g'),
          '^\s+|\s+$', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    ) from 1 for 60
  ) || '--' ||
  substring(replace(id::text, '-', '') from 1 for 8) AS storefront_url
FROM public.items;

COMMENT ON VIEW public.v_storefront_products IS
  'Storefront products view providing direct canonical product URLs matching the customer storefront slugify algorithm.';

REVOKE ALL ON public.v_storefront_products FROM PUBLIC;
GRANT SELECT ON public.v_storefront_products TO anon, authenticated, service_role;
