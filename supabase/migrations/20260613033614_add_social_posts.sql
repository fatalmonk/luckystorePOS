-- Migration: Add social_posts table
-- Description: Creates social_platform enum, social_posts table with indexes, and tenant-isolation RLS policy.

-- 1. Create enum type idempotently (Postgres CREATE TYPE does not support IF NOT EXISTS for enums)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'social_platform'
      AND t.typtype = 'e'
  ) THEN
    CREATE TYPE public.social_platform AS ENUM ('facebook', 'instagram');
  END IF;
END $$;

-- 2. Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  platform public.social_platform NOT NULL DEFAULT 'facebook',
  content text NOT NULL,
  post_id text,
  status text NOT NULL CHECK (status IN ('pending', 'published', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for store-scoped, time-ordered queries
CREATE INDEX IF NOT EXISTS idx_social_posts_store_created
  ON public.social_posts(store_id, created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- 5. Tenant isolation policy
DROP POLICY IF EXISTS "social_posts_tenant_isolation" ON public.social_posts;

CREATE POLICY "social_posts_tenant_isolation"
  ON public.social_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.tenant_id = social_posts.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.tenant_id = social_posts.tenant_id
    )
  );
