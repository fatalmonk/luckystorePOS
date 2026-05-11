-- rate_limits_table.sql
-- Persisted rate limiting using database-backed storage.
-- Replaces in-memory Map-based rate limiting that resets on cold starts.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key       text PRIMARY KEY,
  count     integer NOT NULL DEFAULT 1,
  reset_at  timestamptz NOT NULL
);

-- RPC: check and enforce a rate limit by key.
-- Returns: { allowed, remaining, reset_after_seconds }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key        text,
  p_max        integer,
  p_window_sec integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry       public.rate_limits%ROWTYPE;
  v_now         timestamptz := now();
  v_allowed     boolean;
  v_remaining   integer;
  v_reset_after integer;
BEGIN
  -- Try to read existing entry
  SELECT * INTO v_entry FROM public.rate_limits WHERE key = p_key;

  IF NOT FOUND OR v_now > v_entry.reset_at THEN
    -- First request or window expired: upsert with fresh window
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_sec || ' seconds')::interval)
    ON CONFLICT (key) DO UPDATE
      SET count = 1, reset_at = v_now + (p_window_sec || ' seconds')::interval;
    v_allowed     := true;
    v_remaining   := p_max - 1;
    v_reset_after := p_window_sec;
  ELSIF v_entry.count >= p_max THEN
    -- Limit exceeded
    v_allowed     := false;
    v_remaining   := 0;
    v_reset_after := extract(epoch FROM (v_entry.reset_at - v_now))::integer;
  ELSE
    -- Increment count
    UPDATE public.rate_limits
      SET count = count + 1
      WHERE key = p_key;
    v_allowed     := true;
    v_remaining   := p_max - v_entry.count - 1;
    v_reset_after := extract(epoch FROM (v_entry.reset_at - v_now))::integer;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_after_seconds', v_reset_after
  );
END;
$$;

-- Periodic cleanup: remove expired entries.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH deleted AS (
    DELETE FROM public.rate_limits WHERE reset_at < now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;
