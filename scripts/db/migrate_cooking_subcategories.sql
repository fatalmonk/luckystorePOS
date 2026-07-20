-- =============================================================================
-- Migration: Update Cooking Essentials sub-categories and reassign root items
-- =============================================================================

begin;

-- 1. Ensure "Cooking Essentials" is the root category (slug 'cooking-essentials')
-- It already exists with id '59977800-1ecc-43d3-a1d6-dabdb73653cb'

-- 2. Rename 'Oil' to 'Oil & Ghee' (slug 'oil-&-ghee') and set its parent to Cooking Essentials
update public.categories
set 
  name = 'Oil & Ghee',
  slug = 'oil-&-ghee',
  emoji = '🧈',
  parent_id = '59977800-1ecc-43d3-a1d6-dabdb73653cb'
where slug = 'oil';

-- 3. Set parent_id of Rice & Grain, Spices, Condiments to Cooking Essentials
update public.categories
set parent_id = '59977800-1ecc-43d3-a1d6-dabdb73653cb'
where slug in ('rice-&-grain', 'spices', 'condiments');

-- 4. Seed 'Salt & Sugar' and 'Premium Ingredients' sub-categories if they do not exist
insert into public.categories (id, category, name, slug, emoji, active, store_id, display_order, parent_id)
values
  (gen_random_uuid(), 'Salt & Sugar', 'Salt & Sugar', 'salt-&-sugar', '🧂', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '59977800-1ecc-43d3-a1d6-dabdb73653cb'),
  (gen_random_uuid(), 'Premium Ingredients', 'Premium Ingredients', 'premium-ingredients', '✨', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '59977800-1ecc-43d3-a1d6-dabdb73653cb')
on conflict (slug) where slug is not null do update set
  name = excluded.name,
  emoji = excluded.emoji,
  parent_id = excluded.parent_id;

-- 5. Reassign items currently in the root Cooking Essentials category to the appropriate sub-categories
-- We do this using item names or exact IDs

-- Garlic -> Spices
update public.items
set category_id = (select id from public.categories where slug = 'spices' limit 1)
where id = '1217dc9e-27a9-4329-80f9-0238736ce1bd';

-- Ginger -> Spices
update public.items
set category_id = (select id from public.categories where slug = 'spices' limit 1)
where id = '860e52f9-0705-4c55-ab99-ad0e7d848c26';

-- Salt -> Salt & Sugar
update public.items
set category_id = (select id from public.categories where slug = 'salt-&-sugar' limit 1)
where id = '39bdc80c-8380-4773-b2d0-89830a20b589';

-- Vinegar -> Condiments
update public.items
set category_id = (select id from public.categories where slug = 'condiments' limit 1)
where id = '20aa95b4-9e27-41f8-b2da-a88ebe6eab8a';

-- Onions -> Spices
update public.items
set category_id = (select id from public.categories where slug = 'spices' limit 1)
where id = 'ef7fc087-6ae2-4d90-9a79-c7ee335183c0';

-- Potatoes -> Spices
update public.items
set category_id = (select id from public.categories where slug = 'spices' limit 1)
where id = '85ef41d5-7bc1-490e-91f5-6b598d31a006';

-- Agar Agar -> Premium Ingredients
update public.items
set category_id = (select id from public.categories where slug = 'premium-ingredients' limit 1)
where id = '333ad443-0246-47c3-961c-992280889ad6';

-- Chona Boot -> Rice & Grain
update public.items
set category_id = (select id from public.categories where slug = 'rice-&-grain' limit 1)
where id = '7f83c14e-0e3f-4ffa-bac2-14723131c257';

-- Keora Water -> Premium Ingredients
update public.items
set category_id = (select id from public.categories where slug = 'premium-ingredients' limit 1)
where id = 'e080ad6f-1a5b-4645-a05f-4058719558d5';

commit;
