-- =============================================================================
-- Migration: Inventory Movement Ledger
-- Date: 2026-05-11
-- Purpose: Create immutable, append-only ledger for all inventory mutations.
-- =============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer', 'manual', 'sync_repair');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reference_type AS ENUM ('sale', 'purchase', 'expense', 'adjustment', 'system', 'sync');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Ledger Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    quantity_delta INTEGER NOT NULL,
    reference_type reference_type NOT NULL,
    reference_id UUID,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_inv_movements_tenant_store ON public.inventory_movements(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_reference ON public.inventory_movements(reference_type, reference_id);

-- 4. Triggers to enforce append-only rule
CREATE OR REPLACE FUNCTION public.prevent_inventory_movement_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements is an append-only table. Updates are not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_append_only ON public.inventory_movements;
CREATE TRIGGER enforce_append_only
BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_update();

-- 5. Disable legacy trigger on stock_levels if it exists
DROP TRIGGER IF EXISTS trg_log_stock_ledger ON public.stock_levels;

-- 6. Core Transactional RPC: adjust_inventory_stock
-- This is the required mechanism to update stock going forward
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_product_id UUID,
    p_quantity_delta INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_allow_negative BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        -- Create it (default 0)
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;

    -- Check negative constraints
    IF v_new_quantity < 0 AND NOT p_allow_negative THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- Update the stock level
    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Insert authoritative ledger entry
    INSERT INTO public.inventory_movements (
        tenant_id, store_id, product_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by
    ) VALUES (
        p_tenant_id, p_store_id, p_product_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY select_inventory_movements ON public.inventory_movements
    FOR SELECT TO authenticated
    USING (store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()));

-- Insert policy (only allowed if bypassing trigger or via RPC which is security definer)
-- Actually, since RPC is SECURITY DEFINER, it bypasses RLS for the insert.
-- We can still add an insert policy just in case.
CREATE POLICY insert_inventory_movements ON public.inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()));

-- 7. Core Transactional RPC: set_inventory_stock
CREATE OR REPLACE FUNCTION public.set_inventory_stock(
    p_tenant_id UUID,
    p_store_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_movement_type movement_type,
    p_reference_type reference_type,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock_level_id UUID;
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure tenant/store permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id
          AND s.id = p_store_id
          AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock for this store';
    END IF;

    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below zero';
    END IF;

    -- Get or create stock_levels row with lock
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
        -- Create it (default 0)
        INSERT INTO public.stock_levels (store_id, item_id, qty)
        VALUES (p_store_id, p_product_id, 0)
        RETURNING id, qty INTO v_stock_level_id, v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;

    -- If no change, just return success without logging
    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'movement_id', NULL,
            'previous_quantity', v_current_quantity,
            'new_quantity', v_current_quantity
        );
    END IF;

    -- Update the stock level
    UPDATE public.stock_levels
    SET qty = p_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- Insert authoritative ledger entry
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
$$;
