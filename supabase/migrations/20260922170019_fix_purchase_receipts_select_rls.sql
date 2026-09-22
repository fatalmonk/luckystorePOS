-- Restore authenticated read access for purchase history without widening
-- visibility beyond the current store, except for tenant-level managers.

DROP POLICY IF EXISTS "receipts_select" ON public.purchase_receipts;
DROP POLICY IF EXISTS "receipt_items_select" ON public.purchase_receipt_items;
DROP POLICY IF EXISTS "purchase_receipts_select_store" ON public.purchase_receipts;
DROP POLICY IF EXISTS "purchase_receipt_items_select_store" ON public.purchase_receipt_items;

CREATE POLICY "purchase_receipts_select_store"
  ON public.purchase_receipts
  FOR SELECT
  TO authenticated
  USING (
    store_id = (SELECT public.get_current_user_store_id())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.tenant_id = purchase_receipts.tenant_id
        AND u.role IN ('admin', 'manager', 'advisor')
    )
  );

CREATE POLICY "purchase_receipt_items_select_store"
  ON public.purchase_receipt_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
    )
  );
