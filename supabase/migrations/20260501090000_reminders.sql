-- Reminders table for general store reminders (payments, follow-ups, stock checks, etc.)
CREATE TABLE reminders (
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

CREATE INDEX idx_reminders_tenant_store ON reminders(tenant_id, store_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_type ON reminders(reminder_type);
CREATE INDEX idx_reminders_completed ON reminders(is_completed);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select" ON reminders FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id));

CREATE POLICY "reminders_insert" ON reminders FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

CREATE POLICY "reminders_update" ON reminders FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

CREATE POLICY "reminders_delete" ON reminders FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = reminders.tenant_id AND u.role IN ('admin', 'manager')));

-- RPC: get_upcoming_reminders
-- Lists reminders for a store, ordered by date ascending, with optional completed filter
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

-- RPC: create_reminder
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

-- RPC: update_reminder
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
GRANT EXECUTE ON FUNCTION public.update_reminder(UUID, TEXT, DATE, TEXT, BOOLEAN) TO authenticated;

-- RPC: delete_reminder
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