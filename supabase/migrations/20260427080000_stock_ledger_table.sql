-- =============================================================================
-- Migration: Stock Ledger Table for Audit Trail
-- Date: 2026-04-27
-- Purpose: Full audit trail for all inventory movements
-- =============================================================================

-- Note: CREATE TABLE IF NOT EXISTS used (not DROP + recreate) to prevent data destruction on re-run.
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Store and product references
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  
  -- Stock tracking
  previous_quantity integer NOT NULL DEFAULT 0,
  new_quantity integer NOT NULL DEFAULT 0,
  quantity_change integer NOT NULL, -- Positive for additions, negative for deductions
  
  -- Transaction metadata
  transaction_type text NOT NULL, -- 'sale_deduction', 'purchase_add', 'adjustment', 'transfer_in', 'transfer_out', 'return_in', 'return_out'
  reason text NOT NULL, -- Human-readable reason (e.g., 'POS sale', 'Invoice INV-12345')
  movement_id uuid UNIQUE, -- Unique movement identifier for deduplication
  
  -- Audit trail
  performed_by uuid REFERENCES public.users(id),
  reference_id text, -- Related transaction ID (sale_id, purchase_order_id, etc.)
  
  -- Metadata and timestamps
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3) Create indexes for performance
-- -----------------------------------------------------------------------------

-- Index on store_id for filtering by store
CREATE INDEX idx_stock_ledger_store_id ON public.stock_ledger(store_id);

-- Index on product_id for filtering by product
CREATE INDEX idx_stock_ledger_product_id ON public.stock_ledger(product_id);

-- Composite index for most common query pattern: store + product + date range
CREATE INDEX idx_stock_ledger_store_product_date 
  ON public.stock_ledger(store_id, product_id, created_at DESC);

-- Index on transaction_type for filtering by type
CREATE INDEX idx_stock_ledger_transaction_type ON public.stock_ledger(transaction_type);

-- Index on movement_id for deduplication lookups
CREATE INDEX idx_stock_ledger_movement_id ON public.stock_ledger(movement_id) 
  WHERE movement_id IS NOT NULL;

-- Index on created_at for time-based queries
CREATE INDEX idx_stock_ledger_created_at ON public.stock_ledger(created_at DESC);

-- GIN index on metadata for JSON queries
CREATE INDEX idx_stock_ledger_metadata ON public.stock_ledger USING gin (metadata);

-- -----------------------------------------------------------------------------
-- 4) Add constraints
-- -----------------------------------------------------------------------------

-- Constraint: quantity_change should be non-zero
ALTER TABLE public.stock_ledger 
  ADD CONSTRAINT stock_ledger_quantity_change_nonzero 
  CHECK (quantity_change != 0);

-- Constraint: new_quantity should be non-negative
ALTER TABLE public.stock_ledger 
  ADD CONSTRAINT stock_ledger_new_quantity_nonnegative 
  CHECK (new_quantity >= 0);

-- -----------------------------------------------------------------------------
-- 5) Add row-level security (RLS) policies
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies referencing public.user_stores are intentionally omitted here.
-- That table does not exist yet during bootstrap replay.
-- Proper RLS policies are added in 20260427200000_fix_stock_ledger_rls.sql.

-- Service role can do anything
DROP POLICY IF EXISTS stock_ledger_service_role_all ON public.stock_ledger;
CREATE POLICY stock_ledger_service_role_all
  ON public.stock_ledger TO service_role
  USING (true);

DROP POLICY IF EXISTS stock_ledger_service_role_insert ON public.stock_ledger;
CREATE POLICY stock_ledger_service_role_insert 
  ON public.stock_ledger FOR INSERT 
  TO service_role
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6) Create helper views for common queries
-- -----------------------------------------------------------------------------

-- View: Recent stock movements for a store
CREATE OR REPLACE VIEW public.v_stock_ledger_recent AS
SELECT 
  sl.*,
  i.name AS product_name,
  i.sku,
  i.barcode,
  s.name AS store_name,
  u.email AS performed_by_email
FROM public.stock_ledger sl
JOIN public.items i ON i.id = sl.product_id
JOIN public.stores s ON s.id = sl.store_id
LEFT JOIN public.users u ON u.id = sl.performed_by
ORDER BY sl.created_at DESC;

-- View: Stock movements summary by product
CREATE OR REPLACE VIEW public.v_stock_ledger_product_summary AS
SELECT 
  sl.product_id,
  i.name AS product_name,
  i.sku,
  COUNT(*) AS total_movements,
  SUM(CASE WHEN sl.transaction_type = 'sale_deduction' THEN sl.quantity_change ELSE 0 END) AS total_deducted,
  SUM(CASE WHEN sl.transaction_type IN ('purchase_add', 'adjustment', 'return_in') THEN sl.quantity_change ELSE 0 END) AS total_added,
  MAX(sl.quantity_change) AS largest_movement,
  MIN(sl.created_at) AS first_movement,
  MAX(sl.created_at) AS last_movement
FROM public.stock_ledger sl
JOIN public.items i ON i.id = sl.product_id
GROUP BY sl.product_id, i.name, i.sku;

-- -----------------------------------------------------------------------------
-- 7) Create triggers for automatic tracking (optional, for additional safety)
-- -----------------------------------------------------------------------------

-- Trigger: Automatically log stock level changes to ledger
-- (This fires when stock_levels are updated directly)
CREATE OR REPLACE FUNCTION public.log_stock_ledger_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if quantity actually changed
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    INSERT INTO public.stock_ledger (
      store_id,
      product_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      transaction_type,
      reason,
      movement_id,
      metadata,
      performed_by
    ) VALUES (
      NEW.store_id,
      NEW.item_id,
      OLD.qty,
      NEW.qty,
      NEW.qty - OLD.qty,
      'system_adjustment',
      'Stock level adjusted via system',
      gen_random_uuid(),
      jsonb_build_object('update_type', CASE 
        WHEN NEW.qty > OLD.qty THEN 'restock'
        ELSE 'removal'
      END)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_stock_ledger ON public.stock_levels;
CREATE TRIGGER trg_log_stock_ledger
  AFTER UPDATE ON public.stock_levels
  FOR EACH ROW
  WHEN (NEW.qty IS DISTINCT FROM OLD.qty)
  EXECUTE FUNCTION public.log_stock_ledger_on_update();

-- NOTE: get_stock_level_by_id() is omitted here — stock_levels uses a composite
-- PK (store_id, item_id) with no single uuid “id” column, so the function is
-- incompatible. A proper version is added later if needed.

-- Grant permissions
REVOKE ALL ON TABLE public.stock_ledger FROM PUBLIC;
GRANT SELECT ON TABLE public.stock_ledger TO authenticated;
GRANT INSERT ON TABLE public.stock_ledger TO authenticated;
GRANT ALL ON TABLE public.stock_ledger TO service_role;
GRANT ALL ON v_stock_ledger_recent TO authenticated;
GRANT ALL ON v_stock_ledger_product_summary TO authenticated;
-- Comment on table
COMMENT ON TABLE public.stock_ledger IS 
  'Audit trail for all inventory movements. Every stock change is logged here with previous/new quantities, transaction type, and metadata.';

COMMENT ON COLUMN public.stock_ledger.movement_id IS 
  'Unique movement identifier for deduplication and idempotency in offline scenarios.';
