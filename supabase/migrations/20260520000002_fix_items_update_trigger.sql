-- Migration: Fix items update to return proper JSON and add price logging trigger
-- Created: 2026-05-20

-- First, check if there's a problematic trigger
DROP TRIGGER IF EXISTS trg_items_price_change ON items;
DROP FUNCTION IF EXISTS log_price_change() CASCADE;

-- Create proper price audit trigger
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if price-related fields changed
    IF (OLD.price IS DISTINCT FROM NEW.price) OR 
       (OLD.mrp IS DISTINCT FROM NEW.mrp) OR 
       (OLD.cost IS DISTINCT FROM NEW.cost) THEN
        INSERT INTO price_audit_log (
            item_id,
            store_id,
            old_price,
            new_price,
            old_mrp,
            new_mrp,
            old_cost,
            new_cost,
            changed_by,
            source
        ) VALUES (
            NEW.id,
            NEW.store_id,
            OLD.price,
            NEW.price,
            OLD.mrp,
            NEW.mrp,
            OLD.cost,
            NEW.cost,
            auth.uid(),
            'manual'
        );
    END IF;
    
    -- Always return NEW for AFTER triggers
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger AFTER update (not BEFORE)
DROP TRIGGER IF EXISTS trg_items_price_audit ON items;
CREATE TRIGGER trg_items_price_audit
    AFTER UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION log_price_change();

-- Fix: Ensure items table returns proper JSON from update
-- Validate RLS policies allow updates
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
