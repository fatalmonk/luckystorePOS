-- =============================================================================
-- Migration: Stock Ledger Table for Audit Trail
-- Date: 2026-04-27
-- Purpose: Full audit trail for all inventory movements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Drop existing table if exists (for migration idempotency)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.stock_ledger CASCADE;

-- -----------------------------------------------------------------------------
-- 2) Create stock_ledger table
-- Columns:
--   - id: Primary key (UUID)
--   - store_id: Store reference (FK to stores)
--   - product_id: Product reference (FK to items)
--   - previous_quantity: Stock before change
--   - new_quantity: Stock after change
--   - quantity_change: + for additions, - for deductions
--   - transaction_type: 'sale_deduction', 'purchase_add', 'adjustment', etc.
--   - reason: Human-readable reason
--   - movement_id: Unique movement identifier (for deduplication)
--   - performed_by: User/POS terminal ID
--   - reference_id: Related transaction ID (sale_id, purchase_id, etc.)
--   - metadata: Additional context (JSON)
--   - created_at: Timestamp
-- -----------------------------------------------------------------------------
CREATE TABLE public.stock_ledger (
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

-- Allow authenticated users to read their store's ledger
CREATE POLICY stock_ledger_read_authenticated 
  ON public.stock_ledger FOR SELECT 
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.user_stores WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert their store's ledger entries
CREATE POLICY stock_ledger_insert_authenticated 
  ON public.stock_ledger FOR INSERT 
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.user_stores WHERE user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY stock_ledger_service_role_all 
  ON public.stock_ledger USING (true) 
  TO service_role;

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

-- -----------------------------------------------------------------------------
-- 8) Create function to get stock status by ID (for reporting)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stock_level_by_id(p_stock_level_id uuid)
RETURNS TABLE (
  stock_level_id uuid,
  store_id uuid,
  product_id uuid,
  quantity integer,
  last_updated timestamptz,
  recent_movements jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    sl.id,
    sl.store_id,
    sl.item_id,
    sl.qty,
    sl.updated_at,
    (
      SELECT jsonb_agg(row_to_json(lm))
      FROM (
        SELECT * FROM public.stock_ledger
        WHERE store_id = sl.store_id
          AND product_id = sl.item_id
        ORDER BY created_at DESC
        LIMIT 10
      ) lm
    ) AS recent_movements
  FROM public.stock_levels sl
  WHERE sl.id = p_stock_level_id;
$$;

-- Grant permissions
REVOKE ALL ON TABLE public.stock_ledger FROM PUBLIC;
GRANT SELECT ON TABLE public.stock_ledger TO authenticated;
GRANT INSERT ON TABLE public.stock_ledger TO authenticated;
GRANT ALL ON TABLE public.stock_ledger TO service_role;
GRANT ALL ON v_stock_ledger_recent TO authenticated;
GRANT ALL ON v_stock_ledger_product_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_level_by_id(uuid) TO authenticated;

-- Comment on table
COMMENT ON TABLE public.stock_ledger IS 
  'Audit trail for all inventory movements. Every stock change is logged here with previous/new quantities, transaction type, and metadata.';

COMMENT ON COLUMN public.stock_ledger.movement_id IS 
  'Unique movement identifier for deduplication and idempotency in offline scenarios.';
