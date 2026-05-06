-- Function to atomically decrement stock
-- This ensures stock never goes negative
CREATE OR REPLACE FUNCTION decrement_stock(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer
)
RETURNS void AS $$
BEGIN
  -- Update stock level with atomic decrement
  UPDATE stock_levels
  SET qty = qty - p_quantity
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND qty >= p_quantity;  -- Only decrement if sufficient stock
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize stock level if it doesn't exist
CREATE OR REPLACE FUNCTION upsert_stock_level(
  p_store_id uuid,
  p_item_id uuid,
  p_quantity integer
)
RETURNS void AS $$
BEGIN
  INSERT INTO stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, p_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = stock_levels.qty + p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Add store_id to users table (for cashier's default store)
-- Only run if users table exists (it may be created in a later migration)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id);
    END IF;
END $$;

-- Create index on stock_levels for better performance
CREATE INDEX IF NOT EXISTS idx_stock_levels_store_item ON stock_levels(store_id, item_id);

-- Create index on sale_items for reporting
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);

-- Create index on sales for reporting
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales(receipt_number);

-- Create index on stock_movements for audit trail
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_id ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

