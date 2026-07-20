-- =============================================================================
-- Migration: Place Dairy & Eggs and Energy Boosters under Breakfast root
-- =============================================================================

begin;

-- Set parent_id of Dairy & Eggs and Energy Boosters to the ID of Breakfast
update public.categories
set parent_id = (select id from public.categories where slug = 'breakfast' limit 1)
where slug in ('dairy-&-eggs', 'energy-boosters');

commit;
