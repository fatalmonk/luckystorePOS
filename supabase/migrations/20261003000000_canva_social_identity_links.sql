-- Link a Canva team/user identity to an existing authorized Lucky Store user.
-- Rows are written only by the service role after an explicit account-linking flow.
CREATE TABLE IF NOT EXISTS public.canva_social_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canva_user_id text NOT NULL,
  canva_brand_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canva_user_id, canva_brand_id)
);

CREATE INDEX IF NOT EXISTS idx_canva_social_links_user
  ON public.canva_social_identity_links(user_id);

DROP TRIGGER IF EXISTS trg_canva_social_identity_links_updated_at
  ON public.canva_social_identity_links;
CREATE TRIGGER trg_canva_social_identity_links_updated_at
  BEFORE UPDATE ON public.canva_social_identity_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.canva_social_identity_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.canva_social_identity_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.canva_social_identity_links TO service_role;
