CREATE OR REPLACE FUNCTION public.record_expense_batch(
  p_store_id uuid,
  p_expenses jsonb -- JSON array of: [{"date": "YYYY-MM-DD", "vendor": "...", "description": "...", "amount": 100, "payment_type": "...", "category": "..."}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expense_record jsonb;
  v_batch_result jsonb;
  v_count integer := 0;
BEGIN
  -- Verify user authentication first
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR v_expense_record IN SELECT * FROM jsonb_array_elements(p_expenses) LOOP
    SELECT public.record_expense(
      p_store_id,
      (v_expense_record->>'date')::date,
      v_expense_record->>'vendor',
      v_expense_record->>'description',
      (v_expense_record->>'amount')::numeric,
      v_expense_record->>'payment_type',
      v_expense_record->>'category'
    ) INTO v_batch_result;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('status', 'SUCCESS', 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_expense_batch(uuid, jsonb) TO authenticated;
