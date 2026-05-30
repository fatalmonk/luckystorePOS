-- Migration: Audit Logs Infrastructure
-- Description: Creates the audit_logs table and trigger for immutable logging of inventory/transaction changes.

-- 1. Create the audit_logs table (append‑only, no DELETE/UPDATE allowed)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  primary_key jsonb NOT NULL,
  old_row jsonb,
  new_row jsonb,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure the table cannot be modified after creation (immutable).
REVOKE ALL ON public.audit_logs FROM PUBLIC;
GRANT INSERT ON public.audit_logs TO service_role;
GRANT SELECT ON public.audit_logs TO authenticated; -- Allow staff to see logs

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins/managers can view audit logs for their tenant
CREATE POLICY audit_logs_select_staff ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('admin', 'manager')
        )
    );

-- 2. Helper function to log changes.
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Resolve the performing user (service_role calls may not have auth.uid())
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();

  INSERT INTO public.audit_logs (
    table_name,
    operation,
    primary_key,
    old_row,
    new_row,
    performed_by,
    performed_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
        WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) 
        ELSE to_jsonb(NEW) 
    END, -- Simplified primary key capture (entire row)
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_user_id,
    now()
  );
  RETURN NULL; -- trigger is AFTER, result ignored
END;
$$;

-- 3. Attach triggers to tables we want to audit.
DROP TRIGGER IF EXISTS audit_stock_levels_ins ON public.stock_levels;
CREATE TRIGGER audit_stock_levels_ins
AFTER INSERT OR UPDATE OR DELETE ON public.stock_levels
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_stock_movements_ins ON public.stock_movements;
CREATE TRIGGER audit_stock_movements_ins
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 4. Secure the function
REVOKE ALL ON FUNCTION public.log_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit() TO authenticated;
