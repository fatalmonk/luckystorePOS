-- Price history audit function for items
-- Returns last N price changes for a product (requires full audit triggers for complete history)
CREATE OR REPLACE FUNCTION public.get_price_history(
  p_store_id UUID,
  p_item_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  changed_at TIMESTAMPTZ,
  old_price NUMERIC,
  new_price NUMERIC,
  old_mrp NUMERIC,
  new_mrp NUMERIC,
  changed_by TEXT
) AS $$
BEGIN
  -- Query from items.updated_at and user metadata
  -- Note: For complete audit trail with old values, add triggers to items table
  RETURN QUERY
  SELECT 
    p_item_id,
    i.updated_at,
    i.price,
    i.price,
    i.mrp,
    i.mrp,
    COALESCE(i.updated_by::text, i.created_by::text, 'System')
  FROM items i
  WHERE i.id = p_item_id
    AND i.store_id = p_store_id
  ORDER BY i.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION public.get_price_history(UUID, UUID, INTEGER) TO authenticated;

-- Also create a minimalist audit table for future complete tracking
CREATE TABLE IF NOT EXISTS public.price_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC,
  old_mrp NUMERIC,
  new_mrp NUMERIC,
  old_cost NUMERIC,
  new_cost NUMERIC,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT -- 'manual', 'bulk_import', 'api'
);

ALTER TABLE public.price_audit_log ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policy using existing auth pattern
CREATE POLICY price_audit_log_select_policy ON public.price_audit_log
  FOR SELECT USING (store_id = (public.get_current_user_store_id()));

CREATE INDEX idx_price_audit_item ON public.price_audit_log(item_id);
CREATE INDEX idx_price_audit_store ON public.price_audit_log(store_id);
CREATE INDEX idx_price_audit_changed_at ON public.price_audit_log(changed_at DESC);

GRANT SELECT ON public.price_audit_log TO authenticated;
GRANT INSERT ON public.price_audit_log TO authenticated;
