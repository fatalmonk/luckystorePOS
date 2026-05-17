-- Patches broken functions from schema drift and postgrest limitation
-- Applied manually during runtime validation.

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_quantity_delta integer, p_movement_type movement_type, p_reference_type reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_allow_negative boolean DEFAULT false, p_operation_id uuid DEFAULT NULL::uuid, p_expected_quantity integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- DISABLED FOR POSTGREST COMPATIBILITY

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency check
    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = v_user_id
          AND u.store_id = p_store_id
          AND u.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    -- Conflict detection
    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = v_new_quantity,
        updated_at = now()
    WHERE store_id = p_store_id AND item_id = p_product_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_new_quantity integer, p_movement_type movement_type, p_reference_type reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = v_user_id
          AND u.store_id = p_store_id
          AND u.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = p_new_quantity,
        updated_at = now()
    WHERE store_id = p_store_id AND item_id = p_product_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_product_id uuid, p_new_quantity integer, p_movement_type movement_type, p_reference_type reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_operation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN
    -- SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- DISABLED FOR POSTGREST COMPATIBILITY

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN
            RETURN v_existing_movement;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = v_user_id
          AND u.store_id = p_store_id
          AND u.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = p_new_quantity,
        updated_at = now()
    WHERE store_id = p_store_id AND item_id = p_product_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity
    );
END;
$function$;
