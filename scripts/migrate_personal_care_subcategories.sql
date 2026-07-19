-- =============================================================================
-- Migration: Nest Dental, Facial, Hair, Skin under Personal Care, and restore
-- Pest Control, Air Freshner, and Cleaning Supplies as root categories.
-- =============================================================================

begin;

-- 1. Remove parent_id from Pest Control, Air Freshner, and Cleaning Supplies
-- to make them parent categories
update public.categories
set parent_id = null
where slug in ('pest-control', 'air-freshner', 'cleaning-supplies');

-- 2. Seed "Dental", "Facial", "Hair", "Skin" sub-categories under Personal Care (id '7e1af4ab-c789-4791-9241-b8b8638fdfa9')
insert into public.categories (id, category, name, slug, emoji, active, store_id, display_order, parent_id)
values
  (gen_random_uuid(), 'Dental', 'Dental', 'dental', '🪥', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9'),
  (gen_random_uuid(), 'Facial', 'Facial', 'facial', '🧴', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9'),
  (gen_random_uuid(), 'Hair', 'Hair', 'hair', '💇', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9'),
  (gen_random_uuid(), 'Skin', 'Skin', 'skin', '🧼', true, '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 0, '7e1af4ab-c789-4791-9241-b8b8638fdfa9')
on conflict (slug) where slug is not null do update set
  name = excluded.name,
  emoji = excluded.emoji,
  parent_id = excluded.parent_id;

-- 3. Reassign items currently in the root Personal Care category (id '7e1af4ab-c789-4791-9241-b8b8638fdfa9')
-- into their specific new sub-categories based on product name keyword logic.

-- Hair items
update public.items
set category_id = (select id from public.categories where slug = 'hair' limit 1)
where category_id = '7e1af4ab-c789-4791-9241-b8b8638fdfa9'
  and (name ilike '%shampoo%' or name ilike '%conditioner%' or name ilike '%sunsilk%' or name ilike '%clear%' or name ilike '%tresemme%' or name ilike '%hair%');

-- Dental items
update public.items
set category_id = (select id from public.categories where slug = 'dental' limit 1)
where category_id = '7e1af4ab-c789-4791-9241-b8b8638fdfa9'
  and (name ilike '%pepsodent%' or name ilike '%toothpaste%' or name ilike '%toothbrush%' or name ilike '%close up%' or name ilike '%colgate%' or name ilike '%dental%' or name ilike '%kodomo%');

-- Facial items
update public.items
set category_id = (select id from public.categories where slug = 'facial' limit 1)
where category_id = '7e1af4ab-c789-4791-9241-b8b8638fdfa9'
  and (name ilike '%ponds%' or name ilike '%pond%' or name ilike '%facewash%' or name ilike '%face wash%' or name ilike '%cream%');

-- Skin items (everything else remaining in the parent personal-care category)
update public.items
set category_id = (select id from public.categories where slug = 'skin' limit 1)
where category_id = '7e1af4ab-c789-4791-9241-b8b8638fdfa9';

commit;
