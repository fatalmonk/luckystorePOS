-- =============================================================================
-- Phase 1: POS Transaction Layer
-- =============================================================================
-- Creates the core sales tables referenced by existing analytics RPCs
-- (get_top_selling_items, get_slow_moving_items, get_stock_valuation).
-- Those RPCs assumed public.sales and public.sale_items existed — they do now.
--
-- Tables:
--   payment_methods   : Cash, bKash, Card, Nagad etc. per store
--   sales             : one row per completed POS transaction
--   sale_items        : line items within a sale
--   sale_payments     : tender records (supports split payment)
--   discounts         : named discounts (% or fixed ৳)
--   receipt_config    : per-store receipt header/footer/printer settings
--   pos_sessions      : cashier shift sessions (open → close)
--
-- RPCs:
--   complete_sale()   : atomic sale + stock-deduction + payment recording
--   void_sale()       : void a completed sale and restore stock
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.sale_status AS ENUM ('completed', 'voided', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('cash', 'mobile_banking', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1) payment_methods
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        text        NOT NULL,  -- 'Cash', 'bKash', 'Nagad', 'Card'
  type        public.payment_type NOT NULL DEFAULT 'cash',
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Default payment methods are seeded per-store via RPC or app logic.
-- Idempotent seed example (run after inserting store):
-- INSERT INTO public.payment_methods (store_id, name, type, sort_order) VALUES
--   ('<store_id>', 'Cash',   'cash',           1),
--   ('<store_id>', 'bKash',  'mobile_banking',  2),
--   ('<store_id>', 'Nagad',  'mobile_banking',  3),
--   ('<store_id>', 'Card',   'card',            4)
-- ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) discounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discounts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        text        NOT NULL,  -- 'Staff Discount', 'Promo 10%'
  type        public.discount_type NOT NULL DEFAULT 'percentage',
  value       numeric(10,2) NOT NULL CHECK (value >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_discounts_updated_at ON public.discounts;
CREATE TRIGGER set_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------------------------
-- 3) receipt_config  (one row per store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_config (
  store_id          uuid    PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name        text,                        -- printed at top of receipt
  header_text       text,                        -- e.g. 'Thank you for shopping!'
  footer_text       text,                        -- e.g. 'Return policy: 3 days'
  logo_url          text,                        -- URL to logo for PDF receipts
  currency_symbol   text    NOT NULL DEFAULT '৳',
  show_tax          boolean NOT NULL DEFAULT false,
  -- Receipt printer
  receipt_printer_type  text DEFAULT 'bluetooth_escpos',  -- 'bluetooth_escpos' | 'pdf'
  receipt_printer_name  text,                   -- BT device name to auto-connect
  -- Label printer
  label_printer_type    text DEFAULT 'tspl_bluetooth',    -- 'tspl_bluetooth'
  label_printer_name    text,                   -- BT device name to auto-connect
  label_width_mm        integer DEFAULT 40,
  label_height_mm       integer DEFAULT 30,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) pos_sessions  (cashier shift tracking)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.session_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number  text        NOT NULL UNIQUE,  -- 'SES-20260420-0001'
  store_id        uuid        NOT NULL REFERENCES public.stores(id),
  cashier_id      uuid        NOT NULL REFERENCES public.users(id),
  status          public.session_status NOT NULL DEFAULT 'open',
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  opening_cash    numeric(12,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(12,2),
  total_sales     numeric(12,2) NOT NULL DEFAULT 0,
  total_cash      numeric(12,2) NOT NULL DEFAULT 0,
  notes           text
);

CREATE OR REPLACE FUNCTION public.generate_session_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_number IS NULL OR NEW.session_number = '' THEN
    NEW.session_number := 'SES-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                          || LPAD(nextval('public.session_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_session_number ON public.pos_sessions;
CREATE TRIGGER auto_session_number
  BEFORE INSERT ON public.pos_sessions
  FOR EACH ROW EXECUTE FUNCTION public.generate_session_number();

-- ---------------------------------------------------------------------------
-- 5) sales
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq START 1;

-- sales table may already exist (referenced in analytics RPCs).
-- Create it if needed, then ensure all POS-specific columns exist.
CREATE TABLE IF NOT EXISTS public.sales (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number     text        NOT NULL UNIQUE,  -- 'SALE-20260420-0001'
  store_id        uuid        NOT NULL REFERENCES public.stores(id),
  cashier_id      uuid        NOT NULL REFERENCES public.users(id),
  status          public.sale_status NOT NULL DEFAULT 'completed',
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  amount_tendered numeric(12,2),
  change_due      numeric(12,2),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Add columns that may not exist yet (idempotent)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS session_id      uuid        REFERENCES public.pos_sessions(id),
  ADD COLUMN IF NOT EXISTS voided_by       uuid        REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS voided_at       timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason     text;

CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'SALE-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                       || LPAD(nextval('public.sale_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_sale_number ON public.sales;
CREATE TRIGGER auto_sale_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.generate_sale_number();

DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_sales_store_created   ON public.sales (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_created ON public.sales (cashier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_session         ON public.sales (session_id);
CREATE INDEX IF NOT EXISTS idx_sales_status          ON public.sales (status);

-- ---------------------------------------------------------------------------
-- 6) sale_items  (line items)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid        NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id     uuid        NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  qty         integer     NOT NULL CHECK (qty > 0),
  unit_price  numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  cost        numeric(12,2) NOT NULL DEFAULT 0,   -- cost at time of sale (for margin analytics)
  discount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  line_total  numeric(12,2) NOT NULL,              -- (unit_price - discount) * qty
  UNIQUE (sale_id, item_id)  -- one row per SKU per sale; qty handles multiples
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item ON public.sale_items (item_id);

-- ---------------------------------------------------------------------------
-- 7) sale_payments  (tender — supports split payments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             uuid        NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method_id   uuid        NOT NULL REFERENCES public.payment_methods(id),
  amount              numeric(12,2) NOT NULL CHECK (amount > 0),
  reference           text,   -- bKash TrxID, card last-4 digits, etc.
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON public.sale_payments (sale_id);

-- ---------------------------------------------------------------------------
-- 8) RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments    ENABLE ROW LEVEL SECURITY;

-- payment_methods: all authenticated can read; manager/admin can write
CREATE POLICY "pm_select" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "pm_write"  ON public.payment_methods FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));

-- discounts: same
CREATE POLICY "disc_select" ON public.discounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "disc_write"  ON public.discounts FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));

-- receipt_config: all read; admin only write
CREATE POLICY "rc_select" ON public.receipt_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "rc_write"  ON public.receipt_config FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'));

-- pos_sessions: cashier sees own; manager/admin sees all for their store
CREATE POLICY "ses_select_own"     ON public.pos_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.id = cashier_id));
CREATE POLICY "ses_select_manager" ON public.pos_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));
CREATE POLICY "ses_insert" ON public.pos_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager','cashier')));
CREATE POLICY "ses_update" ON public.pos_sessions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND (u.id = cashier_id OR u.role IN ('admin','manager'))));

-- sales: cashier inserts + sees own today; manager/admin sees all for store
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager','cashier')));
CREATE POLICY "sales_select_own" ON public.sales FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.id = cashier_id
                 AND created_at >= CURRENT_DATE));
CREATE POLICY "sales_select_manager" ON public.sales FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));
CREATE POLICY "sales_void" ON public.sales FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = (SELECT auth.uid()) AND u.role IN ('admin','manager')));

-- sale_items / sale_payments: follow sale access
CREATE POLICY "si_select" ON public.sale_items    FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s
    JOIN public.users u ON u.auth_id = (SELECT auth.uid())
    WHERE s.id = sale_id AND (u.id = s.cashier_id OR u.role IN ('admin','manager'))));
CREATE POLICY "si_insert" ON public.sale_items    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sp_select" ON public.sale_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s
    JOIN public.users u ON u.auth_id = (SELECT auth.uid())
    WHERE s.id = sale_id AND (u.id = s.cashier_id OR u.role IN ('admin','manager'))));
CREATE POLICY "sp_insert" ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 9) RPC: complete_sale()
-- Atomic: inserts sale + line items + payments + decrements stock.
-- Returns: { sale_id, sale_number, total_amount, change_due }
--
-- p_items:    [{ "item_id": "uuid", "qty": 2, "unit_price": 95.00,
--               "cost": 80.00, "discount": 0 }]
-- p_payments: [{ "payment_method_id": "uuid", "amount": 200.00,
--               "reference": "bKash TrxID" }]
-- ---------------------------------------------------------------------------
-- canonical definition in 20260426213841_domain_rpcs_trust_engine.sql
DROP FUNCTION IF EXISTS public.complete_sale();
-- (previous definition commented out to avoid migration conflicts)
-- CREATE OR REPLACE FUNCTION public.complete_sale(
--   p_store_id      uuid,
--   p_cashier_id    uuid,
--   p_session_id    uuid        DEFAULT NULL,
--   p_items         jsonb       DEFAULT '[]',
--   p_payments      jsonb       DEFAULT '[]',
--   p_discount      numeric     DEFAULT 0,
--   p_notes         text        DEFAULT NULL
-- )
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- DECLARE
--   v_user_id       uuid;
--   v_sale_id       uuid;
--   v_sale_number   text;
--   v_subtotal      numeric(12,2) := 0;
--   v_total         numeric(12,2);
--   v_tendered      numeric(12,2) := 0;
--   v_change        numeric(12,2);
--   v_item          record;
--   v_payment       record;
--   v_item_rec      public.items%ROWTYPE;
-- BEGIN
--   -- 1. Authenticate
--   SELECT id INTO v_user_id
--     FROM public.users WHERE auth_id = (SELECT auth.uid());
--   IF v_user_id IS NULL THEN
--     RAISE EXCEPTION 'Not authenticated';
--   END IF;

--   -- 2. Validate items array
--   IF jsonb_array_length(p_items) = 0 THEN
--     RAISE EXCEPTION 'Sale must have at least one item';
--   END IF;

--   -- 3. Insert sale (sale_number auto-generated by trigger)
--   INSERT INTO public.sales (store_id, cashier_id, session_id, status, notes)
--     VALUES (p_store_id, p_cashier_id, p_session_id, 'completed', p_notes)
--     RETURNING id, sale_number INTO v_sale_id, v_sale_number;

--   -- 4. Process each line item
--   FOR v_item IN
--     SELECT * FROM jsonb_to_recordset(p_items) AS x(
--       item_id    uuid,
--       qty        integer,
--       unit_price numeric,
--       cost       numeric,
--       discount   numeric
--     )
--   LOOP
--     -- Validate item exists and is active
--     SELECT * INTO v_item_rec FROM public.items WHERE id = v_item.item_id AND active = true;
--     IF v_item_rec.id IS NULL THEN
--       RAISE EXCEPTION 'Item % not found or inactive', v_item.item_id;
--     END IF;

--     IF v_item.qty <= 0 THEN
--       RAISE EXCEPTION 'Qty must be > 0 for item %', v_item_rec.name;
--     END IF;

--     DECLARE
--       v_line_total numeric(12,2);
--     BEGIN
--       v_line_total := ROUND((v_item.unit_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
--       v_subtotal   := v_subtotal + v_line_total;

--       INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, cost, discount, line_total)
--         VALUES (v_sale_id, v_item.item_id, v_item.qty,
--                 v_item.unit_price, COALESCE(v_item.cost, 0),
--                 COALESCE(v_item.discount, 0), v_line_total);
--     END;

--     -- Decrement stock (calls existing adjust_stock RPC)
--     PERFORM public.adjust_stock(
--       p_store_id,
--       v_item.item_id,
--       -v_item.qty,
--       'sale',
--       'Sale: ' || v_sale_number,
--       v_user_id
--     );
--   END LOOP;

--   -- 5. Compute totals
--   v_total := ROUND(v_subtotal - COALESCE(p_discount, 0), 2);
--   IF v_total < 0 THEN v_total := 0; END IF;

--   -- 6. Process payments
--   FOR v_payment IN
--     SELECT * FROM jsonb_to_recordset(p_payments) AS x(
--       payment_method_id uuid,
--       amount            numeric,
--       reference         text
--     )
--   LOOP
--     v_tendered := v_tendered + v_payment.amount;

--     INSERT INTO public.sale_payments (sale_id, payment_method_id, amount, reference)
--       VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
--   END LOOP;

--   v_change := ROUND(v_tendered - v_total, 2);
--   IF v_change < 0 THEN
--     RAISE EXCEPTION 'Payment insufficient. Total: %, Tendered: %', v_total, v_tendered;
--   END IF;

--   -- 7. Update sale totals
--   UPDATE public.sales
--     SET subtotal        = v_subtotal,
--         discount_amount = COALESCE(p_discount, 0),
--         total_amount    = v_total,
--         amount_tendered = v_tendered,
--         change_due      = v_change
--     WHERE id = v_sale_id;

--   -- 8. Update session totals
--   IF p_session_id IS NOT NULL THEN
--     UPDATE public.pos_sessions
--       SET total_sales = total_sales + v_total
--       WHERE id = p_session_id;
--   END IF;

--   RETURN jsonb_build_object(
--     'sale_id',      v_sale_id,
--     'sale_number',  v_sale_number,
--     'subtotal',     v_subtotal,
--     'discount',     COALESCE(p_discount, 0),
--     'total_amount', v_total,
--     'tendered',     v_tendered,
--     'change_due',   v_change
--   );
-- END;
-- $$;

REVOKE ALL ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_sale(uuid,uuid,uuid,jsonb,jsonb,numeric,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) RPC: void_sale()
-- Voids a completed sale, restores stock, records who voided and why.
-- Only manager/admin can void.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_sale(
  p_sale_id     uuid,
  p_reason      text DEFAULT 'Voided by manager'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_sale    public.sales%ROWTYPE;
  v_item    record;
BEGIN
  -- Auth: manager/admin only
  SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = (SELECT auth.uid()) AND role IN ('admin','manager');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Only managers and admins can void sales';
  END IF;

  -- Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot void a sale with status: %', v_sale.status;
  END IF;

  -- Restore stock for each line item
  FOR v_item IN
    SELECT item_id, qty FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.adjust_stock(
      v_sale.store_id,
      v_item.item_id,
      v_item.qty,          -- positive = restore
      'void',
      'Void: ' || v_sale.sale_number,
      v_user_id
    );
  END LOOP;

  -- Mark sale voided
  UPDATE public.sales
    SET status      = 'voided',
        voided_by   = v_user_id,
        voided_at   = now(),
        void_reason = p_reason
    WHERE id = p_sale_id;

  -- Adjust session totals
  IF v_sale.session_id IS NOT NULL THEN
    UPDATE public.pos_sessions
      SET total_sales = total_sales - v_sale.total_amount
      WHERE id = v_sale.session_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',     p_sale_id,
    'sale_number', v_sale.sale_number,
    'status',      'voided'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.void_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_sale(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Verification queries (run after migration):
--   SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public'
--     AND table_name IN ('sales','sale_items','sale_payments',
--                        'payment_methods','discounts','pos_sessions');
-- ---------------------------------------------------------------------------
