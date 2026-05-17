-- =============================================================================
-- Migration: Get Inventory Movements RPC
-- Date: 2026-05-11
-- Purpose: Read the inventory movement ledger efficiently for the UI.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_inventory_movements(
    p_store_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_movement_type movement_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    movement_type movement_type,
    quantity_delta INTEGER,
    reference_type reference_type,
    reference_id UUID,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID,
    performer_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Basic store auth check
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = auth.uid() AND us.store_id = p_store_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        im.id,
        im.product_id,
        i.name AS product_name,
        i.sku AS product_sku,
        im.movement_type,
        im.quantity_delta,
        im.reference_type,
        im.reference_id,
        im.previous_quantity,
        im.new_quantity,
        im.notes,
        im.created_at,
        im.created_by,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'System') AS performer_name
    FROM public.inventory_movements im
    JOIN public.inventory_items i ON i.id = im.product_id
    LEFT JOIN auth.users u ON u.id = im.created_by
    WHERE im.store_id = p_store_id
      AND (p_product_id IS NULL OR im.product_id = p_product_id)
      AND (p_movement_type IS NULL OR im.movement_type = p_movement_type)
    ORDER BY im.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_movements TO authenticated;
