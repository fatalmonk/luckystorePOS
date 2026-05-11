-- Migration: Add visual fields to categories table for admin portal thumbnails
-- Applied: 2026-05-11

ALTER TABLE IF EXISTS public.categories
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS color    TEXT,
    ADD COLUMN IF NOT EXISTS icon     TEXT;

-- Backfill deterministic colors for existing categories based on name hash
UPDATE public.categories
SET color = CASE (abs(('x' || md5(name))::bit(32)::int)) % 8
    WHEN 0 THEN '#4F46E5'
    WHEN 1 THEN '#0D9488'
    WHEN 2 THEN '#E8B84B'
    WHEN 3 THEN '#EF4444'
    WHEN 4 THEN '#3B82F6'
    WHEN 5 THEN '#8B5CF6'
    WHEN 6 THEN '#F97316'
    WHEN 7 THEN '#10B981'
END
WHERE color IS NULL;
