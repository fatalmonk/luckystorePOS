-- Operational Patch: Align users table structure with seed requirements
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
