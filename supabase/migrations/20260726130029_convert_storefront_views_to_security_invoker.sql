-- Make storefront views evaluate public.items permissions and RLS as the
-- calling role instead of as their postgres owner.
alter view public.featured_products
  set (security_invoker = true);

alter view public.homepage_categories
  set (security_invoker = true);

-- The storefront is scoped to Lucky Store's public catalog. This policy is
-- intentionally SELECT-only and exposes neither inactive nor other-tenant rows.
drop policy if exists items_public_storefront_read on public.items;
create policy items_public_storefront_read
on public.items
for select
to anon
using (
  is_active is true
  and tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Existing default grants included write-shaped privileges on the base table
-- and both views. Anonymous storefront access needs SELECT only.
revoke insert, update, delete, truncate, references, trigger
  on table public.items
  from anon;
grant select on table public.items to anon;

revoke all privileges
  on table public.featured_products, public.homepage_categories
  from anon;
grant select
  on table public.featured_products, public.homepage_categories
  to anon;
