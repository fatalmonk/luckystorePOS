-- =============================================================================
-- Seed Stock Levels for All Active Items
-- Self-contained migration: seeds every store/item pair without placeholders.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.stores') IS NOT NULL
     AND to_regclass('public.items') IS NOT NULL
     AND to_regclass('public.stock_levels') IS NOT NULL THEN
    INSERT INTO public.stock_levels (store_id, item_id, qty)
    SELECT
      s.id AS store_id,
      i.id AS item_id,
      0 AS qty
    FROM public.stores s
    CROSS JOIN public.items i
    WHERE COALESCE(i.active, true) = true
    ON CONFLICT (store_id, item_id) DO NOTHING;
  END IF;
END $$;
