-- Migration: Create RPC to update item prices with proper tenant check and price audit logging
-- Created: 2026-05-20

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_item_prices(
    p_item_id UUID,
    p_store_id UUID,
    p_price NUMERIC,
    p_mrp NUMERIC DEFAULT NULL,
    p_cost NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    sku TEXT,
    price NUMERIC,
    mrp NUMERIC,
    cost NUMERIC,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_old_price NUMERIC;
    v_old_mrp NUMERIC;
    v_old_cost NUMERIC;
    v_result RECORD;
BEGIN
    -- Get old values for audit
    SELECT price, mrp, cost 
    INTO v_old_price, v_old_mrp, v_old_cost
    FROM items 
    WHERE id = p_item_id AND store_id = p_store_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found or access denied';
    END IF;
    
    -- Perform update
    UPDATE items 
    SET 
        price = p_price,
        mrp = COALESCE(p_mrp, items.mrp),
        cost = COALESCE(p_cost, items.cost),
        updated_at = NOW()
    WHERE id = p_item_id 
      AND store_id = p_store_id
    RETURNING 
        items.id AS ret_id, 
        items.name AS ret_name, 
        items.sku AS ret_sku, 
        items.price AS ret_price, 
        items.mrp AS ret_mrp, 
        items.cost AS ret_cost, 
        items.updated_at AS ret_updated_at
    INTO v_result;
    
    -- Note: Audit logging handled by trigger trg_items_price_audit
    
    RETURN QUERY SELECT 
        v_result.ret_id,
        v_result.ret_name,
        v_result.ret_sku,
        v_result.ret_price,
        v_result.ret_mrp,
        v_result.ret_cost,
        v_result.ret_updated_at;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item_prices(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO service_role;

-- Comment
COMMENT ON FUNCTION public.update_item_prices IS 'Update item prices with audit logging. Returns updated item row.';
