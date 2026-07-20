-- =============================================================================
-- Migration: Hierarchical categories with leaf-product enforcement
-- Project: Lucky Store
-- =============================================================================
-- 1. Schema change: add parent_id to public.categories.
-- 2. Seed new root categories (Breakfast, Baby Care, Tea & Coffee).
-- 3. Seed new sub-categories where missing.
-- 4. Reassign products from old/merged categories to new leaf sub-categories.
-- 5. Delete obsolete merged category rows.
-- 6. Add DB check to enforce leaf-only product assignment.
-- =============================================================================

begin;

-- 1. Add parent_id column + self-referential FK + index
alter table public.categories
  add column if not exists parent_id uuid null
  references public.categories(id)
  on delete set null;

create index if not exists idx_categories_parent_id on public.categories(parent_id);

-- 2. Ensure store_id is set for new categories (Lucky Store id)
update public.categories
set store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'
where store_id is null;

-- 3. Seed missing root categories if they do not exist.
insert into public.categories (id, category, name, slug, emoji, active, store_id, display_order)
values
  (gen_random_uuid(), 'Breakfast', 'Breakfast', 'breakfast', '🍳', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Baby Care', 'Baby Care', 'baby-care', '🍼', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Tea & Coffee', 'Tea & Coffee', 'tea-&-coffee', '☕', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0)
on conflict (slug) where slug is not null do update set
  category = excluded.category,
  name     = excluded.name,
  emoji    = excluded.emoji,
  active   = excluded.active,
  store_id = excluded.store_id;

-- 4. Seed missing sub-categories that we will need as leaf targets.
-- Note: slug unique partial index prevents duplicates.
insert into public.categories (id, category, name, slug, emoji, active, store_id, display_order)
values
  (gen_random_uuid(), 'Dairy & Eggs', 'Dairy & Eggs', 'dairy-&-eggs', '🥛', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Cold Beverages', 'Cold Beverages', 'cold-beverages', '🥤', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Energy Boosters', 'Energy Boosters', 'energy-boosters', '⚡', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Ice-Cream', 'Ice-Cream', 'ice-cream', '🍦', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Cooking Essentials', 'Cooking Essentials', 'cooking-essentials', '🍳', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0),
  (gen_random_uuid(), 'Cleaning Supplies', 'Cleaning Supplies', 'cleaning-supplies', '🧼', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0)
on conflict (slug) where slug is not null do update set
  category = excluded.category,
  name     = excluded.name,
  emoji    = excluded.emoji,
  active   = excluded.active,
  store_id = excluded.store_id;

-- 5. Resolve IDs into temporary variables for deterministic moves.
-- We'll use a CTE-driven update so the exact UUIDs are looked up by slug at runtime.

-- 5a. Reassign Dairy -> Dairy & Eggs
update public.items i
set category_id = (select id from public.categories where slug = 'dairy-&-eggs' limit 1)
where i.category_id = (select id from public.categories where slug = 'dairy' limit 1);

-- 5b. Reassign Beverages -> Cold Beverages
update public.items i
set category_id = (select id from public.categories where slug = 'cold-beverages' limit 1)
where i.category_id = (select id from public.categories where slug = 'beverages' limit 1);

-- 5c. Reassign Packaged Food -> Energy Boosters
update public.items i
set category_id = (select id from public.categories where slug = 'energy-boosters' limit 1)
where i.category_id = (select id from public.categories where slug = 'packaged-food' limit 1);

-- 5d. Reassign Ice Cream -> Ice-Cream
update public.items i
set category_id = (select id from public.categories where slug = 'ice-cream' limit 1)
where i.category_id = (select id from public.categories where slug = 'ice-cream' limit 1);

-- 5e. Reassign Cooking Needs -> Cooking Essentials
update public.items i
set category_id = (select id from public.categories where slug = 'cooking-essentials' limit 1)
where i.category_id = (select id from public.categories where slug = 'cooking-needs' limit 1);

-- 5f. Reassign Cleaning Supply -> Cleaning Supplies
update public.items i
set category_id = (select id from public.categories where slug = 'cleaning-supplies' limit 1)
where i.category_id = (select id from public.categories where slug = 'cleaning-supply' limit 1);

-- 6. Delete obsolete category rows only after products have been moved.
delete from public.categories
where slug in ('dairy', 'beverages', 'packaged-food', 'cooking-needs', 'cleaning-supply');

-- 7. Update existing root category emojis where they are missing.
update public.categories set emoji = '🍪' where slug = 'snacks' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🍫' where slug = 'chocolates-&-candies' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🥛' where slug = 'dairy-&-eggs' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🥤' where slug = 'cold-beverages' and (emoji is null or emoji = '📦');
update public.categories set emoji = '⚡' where slug = 'energy-boosters' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🍦' where slug = 'ice-cream' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🍳' where slug = 'cooking-essentials' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🧼' where slug = 'cleaning-supplies' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🥐' where slug = 'baking-needs' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🧴' where slug = 'personal-care' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🌾' where slug = 'rice-&-grain' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🫒' where slug = 'oil' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🥫' where slug = 'condiments' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🌶️' where slug = 'spices' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🥣' where slug = 'cereals' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🌬️' where slug = 'air-freshner' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🐀' where slug = 'pest-control' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🔌' where slug = 'electronics' and (emoji is null or emoji = '📦');
update public.categories set emoji = '☕' where slug = 'tea-&-coffee' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🍳' where slug = 'breakfast' and (emoji is null or emoji = '📦');
update public.categories set emoji = '🍼' where slug = 'baby-care' and (emoji is null or emoji = '📦');

-- 8. Set parent_id relationships for existing leaf categories that fall under a root.
-- Breakfast root: cereals
update public.categories
set parent_id = (select id from public.categories where slug = 'breakfast' limit 1)
where slug = 'cereals' and parent_id is null;

-- Tea & Coffee root: tea-&-coffee itself is a root; no children seeded.

-- Baby Care root: baby-care itself is a root; no children seeded.

-- Personal Care root: cleaning-supplies, air-freshner, pest-control
update public.categories
set parent_id = (select id from public.categories where slug = 'personal-care' limit 1)
where slug in ('cleaning-supplies', 'air-freshner', 'pest-control') and parent_id is null;

-- Snacks root: biscuits-&-cookies, chocolates-&-candies, ice-cream, snacks, tea-&-coffee, cold-beverages, cereals
update public.categories
set parent_id = (select id from public.categories where slug = 'snacks' limit 1)
where slug in ('biscuits-&-cookies', 'chocolates-&-candies', 'ice-cream', 'snacks', 'tea-&-coffee', 'cold-beverages', 'cereals') and parent_id is null;

-- Cooking Needs root: oil, rice-&-grain, condiments, spices, cooking-essentials
update public.categories
set parent_id = (select id from public.categories where slug = 'cooking-needs' limit 1)
where slug in ('oil', 'rice-&-grain', 'condiments', 'spices', 'cooking-essentials') and parent_id is null;

-- Dairy & Eggs root: dairy-&-eggs itself is a root; no children seeded.

-- Packaged Food root: energy-boosters
update public.categories
set parent_id = (select id from public.categories where slug = 'packaged-food' limit 1)
where slug = 'energy-boosters' and parent_id is null;

-- 9. Add leaf-only trigger function to enforce the design decision:
--    Products must be assigned to leaf sub-categories (categories with no children).
--    Exception: root categories that have no children may still accept products.
--    NULL category_id is allowed.
create or replace function public.check_item_leaf_category()
returns trigger as $$
declare
  has_children boolean;
begin
  if new.category_id is null then
    return new;
  end if;

  select exists(
    select 1 from public.categories c where c.parent_id = new.category_id
  ) into has_children;

  if has_children then
    raise exception 'Items can only be assigned to leaf categories. Category % has child categories.', new.category_id;
  end if;

  return new;
end;
$$ language plpgsql;

-- Drop existing trigger to allow re-runs
drop trigger if exists trg_items_leaf_category on public.items;

create trigger trg_items_leaf_category
  before insert or update of category_id on public.items
  for each row
  execute function public.check_item_leaf_category();

commit;
