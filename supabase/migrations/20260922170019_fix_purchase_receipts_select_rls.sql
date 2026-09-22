-- Restore authenticated read access for purchase history without widening
-- visibility beyond the current store, except for tenant-level managers.

DROP POLICY IF EXISTS "receipts_select" ON public.purchase_receipts;
DROP POLICY IF EXISTS "receipt_items_select" ON public.purchase_receipt_items;
DROP POLICY IF EXISTS "purchase_receipts_select_store" ON public.purchase_receipts;
DROP POLICY IF EXISTS "purchase_receipt_items_select_store" ON public.purchase_receipt_items;
DROP POLICY IF EXISTS "receipts_write" ON public.purchase_receipts;
DROP POLICY IF EXISTS "receipt_items_write" ON public.purchase_receipt_items;

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
        AND (
          (pr.store_id = (SELECT public.get_current_user_store_id())
            AND pr.tenant_id = public.current_tenant_id())
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.auth_id = (SELECT auth.uid())
              AND u.tenant_id = pr.tenant_id
              AND u.role IN ('admin', 'manager', 'advisor')
          )
        )
    )
  );

-- FOR ALL policies also grant SELECT and permissive policies are ORed. Keep
-- the existing purchasing role and tenant checks only on mutations.
CREATE POLICY "receipts_insert_authorized"
  ON public.purchase_receipts FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

CREATE POLICY "receipts_update_authorized"
  ON public.purchase_receipts FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

CREATE POLICY "receipts_delete_authorized"
  ON public.purchase_receipts FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

CREATE POLICY "receipt_items_insert_authorized"
  ON public.purchase_receipt_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

CREATE POLICY "receipt_items_update_authorized"
  ON public.purchase_receipt_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

CREATE POLICY "receipt_items_delete_authorized"
  ON public.purchase_receipt_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );
