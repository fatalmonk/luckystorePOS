-- Migration: Fix user management in Settings (PGRST116)
-- Admin can create/update/delete users without RLS blocking

-- 1. Create RPC to add new user (by admin)
CREATE OR REPLACE FUNCTION public.create_store_user(
    p_email text,
    p_full_name text,
    p_role text,
    p_pin text,
    p_store_id uuid,
    p_tenant_id uuid,
    p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
    v_new_user_id uuid;
BEGIN
    -- Only admin/manager can create users
    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Only admins or managers can create users';
    END IF;

    -- Insert the user
    INSERT INTO public.users (id, email, full_name, role, pos_pin, store_id, tenant_id, auth_id)
    VALUES (
        p_auth_id,
        p_email,
        p_full_name,
        p_role,
        p_pin,
        p_store_id,
        p_tenant_id,
        p_auth_id
    )
    RETURNING id INTO v_new_user_id;

    RETURN v_new_user_id;
END;
$$;

-- 2. Create RPC to update user (by admin)
CREATE OR REPLACE FUNCTION public.update_store_user(
    p_user_id uuid,
    p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
    v_updater_role text;
    v_target_role text;
    v_result jsonb;
BEGIN
    -- Get updater's role
    SELECT role INTO v_updater_role
    FROM public.users WHERE auth_id = auth.uid();

    -- Only admin/manager can update
    IF v_updater_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins or managers can update users';
    END IF;

    -- Get target user's role
    SELECT role INTO v_target_role
    FROM public.users WHERE id = p_user_id;

    -- Only admin can update admin users
    IF v_target_role = 'admin' AND v_updater_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can modify admin users';
    END IF;

    -- Build dynamic update
    UPDATE public.users SET
        full_name = COALESCE((p_updates->>'name')::text, full_name),
        role = COALESCE((p_updates->>'role')::text, role),
        pos_pin = COALESCE((p_updates->>'pos_pin')::text, pos_pin)
    WHERE id = p_user_id
    RETURNING to_jsonb(users.*) INTO v_result;

    RETURN v_result;
END;
$$;

-- 3. Create RPC to delete user (by admin)
CREATE OR REPLACE FUNCTION public.delete_store_user(
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
    v_updater_role text;
    v_target_role text;
BEGIN
    -- Get updater's role
    SELECT role INTO v_updater_role
    FROM public.users WHERE auth_id = auth.uid();

    -- Only admin/manager can delete
    IF v_updater_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins or managers can delete users';
    END IF;

    -- Get target user's role
    SELECT role INTO v_target_role
    FROM public.users WHERE id = p_user_id;

    -- Only admin can delete admin users
    IF v_target_role = 'admin' AND v_updater_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can delete admin users';
    END IF;

    -- Prevent self-deletion
    IF p_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()) THEN
        RAISE EXCEPTION 'Cannot delete yourself';
    END IF;

    DELETE FROM public.users WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- 4. Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.create_store_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store_user TO authenticated;

-- 5. Secure search_path
ALTER FUNCTION public.create_store_user SET search_path = public, pg_temp;
ALTER FUNCTION public.update_store_user SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_store_user SET search_path = public, pg_temp;

-- Set owner for SECURITY DEFINER
ALTER FUNCTION public.create_store_user OWNER TO postgres;
ALTER FUNCTION public.update_store_user OWNER TO postgres;
ALTER FUNCTION public.delete_store_user OWNER TO postgres;
