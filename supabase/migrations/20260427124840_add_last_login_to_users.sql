-- Add last_login column to users table

ALTER TABLE public.users
ADD COLUMN last_login timestamptz;
