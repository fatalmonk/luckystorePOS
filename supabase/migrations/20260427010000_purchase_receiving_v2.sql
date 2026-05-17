-- Phase: Purchase Receiving v2
-- Faster supplier stock intake with barcode-friendly workflow

-- ---------------------------------------------------------------------------
-- 1) purchase_receipts
--    Direct receiving (not via PO workflow), supports draft/posting,
--    partial payments, duplicate invoice protection.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  supplier_id     UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  invoice_number  TEXT,
  invoice_total   NUMERIC(15, 4) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(15, 4) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted')),
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duplicate invoice protection: unique per tenant+supplier+invoice_number (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_supplier_invoice
  ON public.purchase_receipts(tenant_id, supplier_id, invoice_number)
  WHERE invoice_number IS NOT NULL AND invoice_number <> '';

DROP TRIGGER IF EXISTS set_purchase_receipts_updated_at ON public.purchase_receipts;
CREATE TRIGGER set_purchase_receipts_updated_at
  BEFORE UPDATE ON public.purchase_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------------------------
-- 2) purchase_receipt_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity        NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
  unit_cost       NUMERIC(15, 4) NOT NULL DEFAULT 0,
  UNIQUE (receipt_id, item_id)
);

-- ---------------------------------------------------------------------------
-- 3) RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

-- Helper: user's tenant_id from JWT
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- purchase_receipts policies
DROP POLICY IF EXISTS "receipts_select" ON public.purchase_receipts;
CREATE POLICY "receipts_select" ON public.purchase_receipts
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "receipts_write" ON public.purchase_receipts;
CREATE POLICY "receipts_write" ON public.purchase_receipts
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'manager', 'stock')
    )
  );

-- purchase_receipt_items policies
DROP POLICY IF EXISTS "receipt_items_select" ON public.purchase_receipt_items;
CREATE POLICY "receipt_items_select" ON public.purchase_receipt_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "receipt_items_write" ON public.purchase_receipt_items;
CREATE POLICY "receipt_items_write" ON public.purchase_receipt_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.receipt_id
        AND pr.tenant_id = public.current_tenant_id()
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager', 'stock')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Indexes for performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_tenant ON public.purchase_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_supplier ON public.purchase_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_store ON public.purchase_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_status ON public.purchase_receipts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt ON public.purchase_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_item ON public.purchase_receipt_items(item_id);
