-- Repair missing stock deduction and reminder functions
-- These functions were defined in earlier migrations but didn't persist to remote

-- =============================================================================
-- Stock Deduction RPC
-- =============================================================================
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_store_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
BEGIN
  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;
    v_movement_id := gen_random_uuid();

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.stock_ledger (
      store_id,
      product_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      transaction_type,
      reason,
      movement_id,
      metadata
    ) VALUES (
      p_store_id,
      p_product_id,
      v_current_quantity,
      v_new_quantity,
      -p_quantity,
      'sale_deduction',
      'POS transaction sale',
      v_movement_id,
      p_metadata
    );

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_stock(uuid, uuid, integer, jsonb) TO authenticated;

-- =============================================================================
-- Reminders table
-- =============================================================================
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    reminder_date DATE NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('payment_due', 'follow_up', 'stock_check', 'other')),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_tenant_store ON reminders(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_select" ON reminders;
CREATE POLICY "reminders_select" ON reminders FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id));

DROP POLICY IF EXISTS "reminders_insert" ON reminders;
CREATE POLICY "reminders_insert" ON reminders FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

DROP POLICY IF EXISTS "reminders_update" ON reminders;
CREATE POLICY "reminders_update" ON reminders FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

DROP POLICY IF EXISTS "reminders_delete" ON reminders;
CREATE POLICY "reminders_delete" ON reminders FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

-- =============================================================================
-- Reminder RPCs
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_upcoming_reminders(UUID, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.get_upcoming_reminders(
    p_store_id UUID,
    p_include_completed BOOLEAN DEFAULT false
)
RETURNS SETOF reminders
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT r.*
    FROM reminders r
    WHERE r.store_id = p_store_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
      AND (p_include_completed OR r.is_completed = false)
    ORDER BY r.reminder_date ASC, r.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_upcoming_reminders(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_upcoming_reminders(UUID, BOOLEAN) TO authenticated;

DROP FUNCTION IF EXISTS public.create_reminder(UUID, UUID, TEXT, TEXT, DATE, TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.create_reminder(
    p_tenant_id UUID,
    p_store_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_reminder_date DATE,
    p_reminder_type TEXT,
    p_created_by UUID DEFAULT NULL
)
RETURNS reminders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_row reminders%ROWTYPE;
BEGIN
    INSERT INTO reminders (tenant_id, store_id, title, description, reminder_date, reminder_type, created_by)
    VALUES (p_tenant_id, p_store_id, p_title, p_description, p_reminder_date, p_reminder_type, p_created_by)
    RETURNING * INTO new_row;
    RETURN new_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_reminder(UUID, UUID, TEXT, TEXT, DATE, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reminder(UUID, UUID, TEXT, TEXT, DATE, TEXT, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.update_reminder(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.update_reminder(
    p_reminder_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reminder_date DATE DEFAULT NULL,
    p_reminder_type TEXT DEFAULT NULL,
    p_is_completed BOOLEAN DEFAULT NULL
)
RETURNS reminders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_row reminders%ROWTYPE;
BEGIN
    UPDATE reminders r
    SET
        title = COALESCE(p_title, r.title),
        description = COALESCE(p_description, r.description),
        reminder_date = COALESCE(p_reminder_date, r.reminder_date),
        reminder_type = COALESCE(p_reminder_type, r.reminder_type),
        is_completed = COALESCE(p_is_completed, r.is_completed),
        updated_at = now()
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
    RETURNING * INTO updated_row;

    IF updated_row.id IS NULL THEN
        RAISE EXCEPTION 'Reminder not found or access denied';
    END IF;

    RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_reminder(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_reminder(UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_reminder(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_reminder(
    p_reminder_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM reminders r
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id);

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_reminder(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_reminder(UUID) TO authenticated;
