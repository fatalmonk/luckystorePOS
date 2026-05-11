-- =============================================================================
-- Migration: Inventory Reconciliations
-- Date: 2026-05-11
-- Purpose: Implement the stock counting workflow and reconciliation ledger
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE reconciliation_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    expected_quantity INTEGER NOT NULL,
    counted_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    status reconciliation_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    counted_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_tenant_store ON public.inventory_reconciliations(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_product ON public.inventory_reconciliations(product_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON public.inventory_reconciliations(status);

-- Enable RLS
ALTER TABLE public.inventory_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_reconciliations ON public.inventory_reconciliations
    FOR SELECT TO authenticated
    USING (store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()));

CREATE POLICY insert_reconciliations ON public.inventory_reconciliations
    FOR INSERT TO authenticated
    WITH CHECK (store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()));

CREATE POLICY update_reconciliations ON public.inventory_reconciliations
    FOR UPDATE TO authenticated
    USING (store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid()));

-- RPC to approve reconciliation and adjust stock
CREATE OR REPLACE FUNCTION public.approve_inventory_reconciliation(
    p_reconciliation_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recon public.inventory_reconciliations%ROWTYPE;
    v_user_id UUID := auth.uid();
    v_movement_id UUID;
    v_movement_type movement_type;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch reconciliation
    SELECT * INTO v_recon
    FROM public.inventory_reconciliations
    WHERE id = p_reconciliation_id
    FOR UPDATE;

    IF v_recon.id IS NULL THEN
        RAISE EXCEPTION 'Reconciliation not found';
    END IF;

    IF v_recon.status <> 'pending' THEN
        RAISE EXCEPTION 'Reconciliation is already %', v_recon.status;
    END IF;

    -- Update reconciliation status
    UPDATE public.inventory_reconciliations
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now()
    WHERE id = p_reconciliation_id;

    -- If there is a difference, generate an adjustment movement
    IF v_recon.difference <> 0 THEN
        v_movement_type := CASE WHEN v_recon.difference > 0 THEN 'adjustment'::movement_type ELSE 'damage'::movement_type END;
        
        -- We use set_inventory_stock because the counter expects the new quantity to be exactly what they counted
        -- Note: We are ignoring concurrent transactions that might have occurred between count and approval. 
        -- Realistically, expected vs counted should re-evaluate concurrent changes, but for simplicity we set it to the counted value.
        -- A robust approach: new_qty = current_qty + difference
        
        PERFORM public.adjust_inventory_stock(
            v_recon.tenant_id,
            v_recon.store_id,
            v_recon.product_id,
            v_recon.difference,
            'adjustment'::movement_type,
            'adjustment'::reference_type,
            v_recon.id,
            COALESCE(p_notes, v_recon.notes, 'Reconciliation adjustment'),
            TRUE,
            v_recon.id -- use reconciliation id as operation_id to ensure idempotency
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', p_reconciliation_id,
        'difference', v_recon.difference
    );
END;
$$;
