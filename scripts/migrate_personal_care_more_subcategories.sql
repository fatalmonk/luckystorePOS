-- =============================================================================
-- Migration: Add Perfume & Body Spray and Grooming under Personal Care
-- =============================================================================

begin;

-- 1. Seed sub-categories under Personal Care (id '7e1af4ab-c789-4791-9241-b8b8638fdfa9')
insert into public.categories (id, category, name, slug, emoji, active, store_id, display_order, parent_id)
values
  (gen_random_uuid(), 'Perfume & Body Spray', 'Perfume & Body Spray', 'perfume-&-body-spray', '✨', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9'),
  (gen_random_uuid(), 'Grooming', 'Grooming', 'grooming', '🪒', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9')
on conflict (slug) where slug is not null do update set
  name = excluded.name,
  emoji = excluded.emoji,
  parent_id = excluded.parent_id;

-- 2. Reassign Axe Body Sprays from Skin to Perfume & Body Spray
update public.items
set category_id = (select id from public.categories where slug = 'perfume-&-body-spray' limit 1)
where category_id = (select id from public.categories where slug = 'skin' limit 1)
  and (name ilike '%axe%' or name ilike '%body spray%' or name ilike '%deodorant%');

commit;
