-- supabase/migrations/20260611000000_add_categories_ext.sql
-- Extends existing public.categories (id uuid PK, category text, tenant_id, store_id, name, image_url, color, icon)

-- Add missing columns for web consumption
alter table public.categories 
  add column if not exists slug text,
  add column if not exists emoji text,
  add column if not exists display_order int default 0,
  add column if not exists active boolean default true;

-- Backfill slug from category (lowercase, replace spaces with hyphens)
update public.categories 
set slug = lower(regexp_replace(category, '\s+', '-', 'g'))
where slug is null;

-- Backfill emoji for known categories
update public.categories set emoji = '🥛' where slug = 'dairy' and emoji is null;
update public.categories set emoji = '🍚' where slug = 'grocery' and emoji is null;
update public.categories set emoji = '🧃' where slug = 'beverages' and emoji is null;
update public.categories set emoji = '🍪' where slug = 'snacks' and emoji is null;
update public.categories set emoji = '🧼' where slug = 'household' and emoji is null;
update public.categories set emoji = '🥬' where slug = 'produce' and emoji is null;
update public.categories set emoji = '🍞' where slug = 'bakery' and emoji is null;
update public.categories set emoji = '🧊' where slug = 'frozen' and emoji is null;
update public.categories set emoji = '📦' where emoji is null; -- fallback

-- Make slug unique for web lookups
create unique index if not exists uq_categories_slug on public.categories(slug) where slug is not null;

-- RLS: anon read only active categories for the single store
alter table public.categories enable row level security;

drop policy if exists "Allow anon read categories for store" on public.categories;

create policy "Allow anon read categories for store"
on public.categories for select
to anon
using (active = true and store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd');
