-- Migration: Fix get_price_history RPC to query from price_audit_log and resolve user names
-- Created: 2026-06-25

CREATE OR REPLACE FUNCTION public.get_price_history(
  p_store_id UUID,
  p_item_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  changed_at TIMESTAMPTZ,
  old_price NUMERIC,
  new_price NUMERIC,
  old_mrp NUMERIC,
  new_mrp NUMERIC,
  changed_by TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pal.id,
    pal.changed_at,
    pal.old_price,
    pal.new_price,
    pal.old_mrp,
    pal.new_mrp,
    COALESCE(u.name, u.full_name, u.email, 'System')::text
  FROM public.price_audit_log pal
  LEFT JOIN public.users u ON u.auth_id = pal.changed_by
  WHERE pal.item_id = p_item_id
    AND pal.store_id = p_store_id
  ORDER BY pal.changed_at DESC
  LIMIT p_limit;
END;
$$;

-- Ensure permissions are granted safely (handles environments like Neon where these roles don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.get_price_history(UUID, UUID, INTEGER) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.get_price_history(UUID, UUID, INTEGER) TO service_role;
  END IF;
END
$$;
