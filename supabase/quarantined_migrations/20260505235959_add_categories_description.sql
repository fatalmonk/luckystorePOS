-- Structural sanitation: Ensure categories table has description column
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;
