-- Ensure pgcrypto is available in the search path for the authenticate_staff_pin function
-- The extension might be in extensions schema, so we need to add it to search_path

-- First, ensure the extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Update the authenticate_staff_pin function to include extensions in search_path
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
SET search_path = public, extensions, pg_temp
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
      (u.pos_pin_hash IS NOT NULL AND extensions.crypt(p_pin, u.pos_pin_hash) = u.pos_pin_hash)
      -- Backward compatibility while old rows are still migrating
      OR (u.pos_pin_hash IS NULL AND u.pos_pin = p_pin)
    )
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.authenticate_staff_pin(text)
IS 'Server-authoritative PIN authentication for POS staff roles.';
