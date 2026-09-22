-- The anonymous scanner's public-store flag is stored in this JSON contract.
-- Older deployments predate the column and must fail closed (empty metadata).

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
