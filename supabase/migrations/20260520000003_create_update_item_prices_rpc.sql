-- Migration: Create RPC to update item prices with proper tenant check and price audit logging
-- Created: 2026-05-20

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_item_prices(
    p_item_id UUID,
    p_tenant_id UUID,
    p_price NUMERIC,
    p_mrp NUMERIC DEFAULT NULL,
    p_cost NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    item_id UUID,
    item_name TEXT,
    item_sku TEXT,
    item_price NUMERIC,
    item_mrp NUMERIC,
    item_cost NUMERIC,
    item_updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_new_id UUID;
    v_new_name TEXT;
    v_new_sku TEXT;
    v_new_price NUMERIC;
    v_new_mrp NUMERIC;
    v_new_cost NUMERIC;
    v_new_updated_at TIMESTAMPTZ;
BEGIN
    -- Verify item belongs to tenant (handle NULL tenant_id for legacy items)
    PERFORM 1 FROM items 
    WHERE id = p_item_id AND (tenant_id = p_tenant_id OR tenant_id IS NULL);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found or access denied';
    END IF;
    
    -- Also update NULL tenant_id to current user's tenant
    UPDATE items SET tenant_id = p_tenant_id 
    WHERE id = p_item_id AND tenant_id IS NULL;
    
    -- Perform update
    UPDATE items 
    SET 
        price = p_price,
        mrp = COALESCE(p_mrp, items.mrp),
        cost = COALESCE(p_cost, items.cost),
        updated_at = NOW()
    WHERE id = p_item_id 
      AND tenant_id = p_tenant_id
    RETURNING 
        items.id,
        items.name,
        items.sku,
        items.price,
        items.mrp,
        items.cost,
        items.updated_at
    INTO v_new_id, v_new_name, v_new_sku, v_new_price, v_new_mrp, v_new_cost, v_new_updated_at;
    
    RETURN QUERY SELECT 
        v_new_id,
        v_new_name,
        v_new_sku,
        v_new_price,
        v_new_mrp,
        v_new_cost,
        v_new_updated_at;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO service_role;

-- Comment
COMMENT ON FUNCTION public.update_item_prices IS 'Update item prices with audit logging. Returns updated item row.';
