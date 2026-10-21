-- Restore the stock-ledger reporting views where they are missing, while
-- keeping access backend-only. These views expose ledger details and user
-- email addresses, so they must not be directly readable by client roles.

CREATE OR REPLACE VIEW public.v_stock_ledger_recent
WITH (security_invoker = true)
AS
SELECT
  sl.*,
  i.name AS product_name,
  i.sku,
  i.barcode,
  s.name AS store_name,
  u.email AS performed_by_email
FROM public.stock_ledger AS sl
JOIN public.items AS i ON i.id = sl.product_id
JOIN public.stores AS s ON s.id = sl.store_id
LEFT JOIN public.users AS u ON u.id = sl.performed_by
ORDER BY sl.created_at DESC;

CREATE OR REPLACE VIEW public.v_stock_ledger_product_summary
WITH (security_invoker = true)
AS
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
FROM public.stock_ledger AS sl
JOIN public.items AS i ON i.id = sl.product_id
GROUP BY sl.product_id, i.name, i.sku;

REVOKE ALL ON TABLE
  public.v_stock_ledger_recent,
  public.v_stock_ledger_product_summary
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.v_stock_ledger_recent,
  public.v_stock_ledger_product_summary
TO service_role;
