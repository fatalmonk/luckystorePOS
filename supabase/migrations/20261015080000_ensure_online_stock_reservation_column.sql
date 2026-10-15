-- Keep the storefront online-order stock projection available in fresh and
-- isolated test databases. Production already has this column; IF NOT EXISTS
-- makes the migration safe to apply there as well.
ALTER TABLE public.stock_levels
  ADD COLUMN IF NOT EXISTS qty_reserved_online integer DEFAULT 0;
