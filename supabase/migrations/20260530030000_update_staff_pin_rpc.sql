-- Create secure definer function to update a staff PIN
CREATE OR REPLACE FUNCTION public.update_staff_pin(p_user_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_tenant_id uuid;
  v_target_tenant_id uuid;
BEGIN
  -- 1) Validate pin input format (exactly 4 digits)
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 numeric digits';
  END IF;

  -- 2) Resolve caller's tenant isolation context
  SELECT tenant_id INTO v_caller_tenant_id 
  FROM public.users 
  WHERE auth_id = auth.uid();

  -- 3) Resolve target user's tenant isolation context
  SELECT tenant_id INTO v_target_tenant_id 
  FROM public.users 
  WHERE id = p_user_id;

  -- 4) Security assertion: tenant matching or caller is super-admin
  IF v_caller_tenant_id IS NULL OR v_target_tenant_id IS NULL OR v_caller_tenant_id <> v_target_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant mismatch';
  END IF;

  -- 5) Update the PIN hashes
  UPDATE public.users
  SET pos_pin_hash = crypt(p_pin, gen_salt('bf')),
      pos_pin = p_pin -- Keep backward compatibility
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.update_staff_pin(uuid, text)
IS 'Securely updates a store staff member PIN with isolation check.';

-- Adjust permissions
REVOKE ALL ON FUNCTION public.update_staff_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_staff_pin(uuid, text) TO authenticated;
