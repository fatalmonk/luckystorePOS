-- Ledger posting queue infrastructure
-- 1) Worker registration table
-- 2) Job queue for asynchronous ledger posting
-- 3) Base functions for heartbeats and registration

CREATE TABLE IF NOT EXISTS public.ledger_workers (
  worker_id text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_posting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'POSTED', 'FAILED')),
  priority integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 10,
  last_error text,
  locked_by text REFERENCES public.ledger_workers(worker_id) ON DELETE SET NULL,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpq_status_priority ON public.ledger_posting_queue (status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_lpq_sale_id ON public.ledger_posting_queue (sale_id);
CREATE INDEX IF NOT EXISTS idx_lpq_store_id ON public.ledger_posting_queue (store_id);

ALTER TABLE public.ledger_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_posting_queue ENABLE ROW LEVEL SECURITY;

-- Base worker functions
CREATE OR REPLACE FUNCTION public.register_ledger_worker(p_worker_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat)
  VALUES (p_worker_id, true, now())
  ON CONFLICT (worker_id) DO UPDATE
  SET active = true, last_heartbeat = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_ledger_worker(p_worker_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.ledger_workers
  SET last_heartbeat = now(), active = true
  WHERE worker_id = p_worker_id;
  RETURN FOUND;
END;
$$;

-- Permissions
REVOKE ALL ON TABLE public.ledger_workers FROM PUBLIC;
REVOKE ALL ON TABLE public.ledger_posting_queue FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_ledger_worker(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_ledger_worker(text) TO authenticated;
