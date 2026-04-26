-- Phase 1 hardening: server-authoritative PIN authentication.
-- Removes trust in client-side hardcoded roles/PINs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.authenticate_staff_pin(p_pin text)
RETURNS TABLE (
  id uuid,
  auth_id uuid,
  full_name text,
  role text,
  store_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.auth_id,
    COALESCE(u.full_name, 'User') AS full_name,
    u.role,
    u.store_id
  FROM public.users u
  WHERE u.role IN ('cashier', 'manager', 'admin')
    AND (
      -- Preferred secure storage
      (u.pos_pin_hash IS NOT NULL AND crypt(p_pin, u.pos_pin_hash) = u.pos_pin_hash)
      -- Backward compatibility while old rows are still migrating
      OR (u.pos_pin_hash IS NULL AND u.pos_pin = p_pin)
    )
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.authenticate_staff_pin(text)
IS 'Server-authoritative PIN authentication for POS staff roles.';

REVOKE ALL ON FUNCTION public.authenticate_staff_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_staff_pin(text) TO authenticated;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pos_pin_hash text;

COMMENT ON COLUMN public.users.pos_pin_hash
IS 'bcrypt hash of 4-digit POS PIN used by authenticate_staff_pin';
