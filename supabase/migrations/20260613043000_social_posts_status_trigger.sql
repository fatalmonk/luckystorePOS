-- Migration: Fix social_posts status + add updated_at trigger
-- Description: Adds 'draft' to status CHECK constraint + adds updated_at auto-update trigger.

-- 1. Widen status CHECK to include draft
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_status_check CHECK (status IN ('draft', 'pending', 'published', 'failed'));

-- 2. Create updated_at trigger (idempotent)
DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER trg_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
