-- Core stock_levels table (applied via Supabase MCP as version 20260325110027; idempotent).
-- Depends on public.items and public.stores existing.

CREATE TABLE IF NOT EXISTS public.stock_levels (
  store_id uuid NOT NULL,
  item_id uuid NOT NULL,
  qty integer NULL DEFAULT 0,
  reserved integer NULL DEFAULT 0,
  CONSTRAINT stock_levels_pkey PRIMARY KEY (store_id, item_id),
  CONSTRAINT stock_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items (id) ON DELETE CASCADE,
  CONSTRAINT stock_levels_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE CASCADE
);

ALTER TABLE public.stock_levels
  ADD COLUMN IF NOT EXISTS reserved integer NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stock_levels_store_item ON public.stock_levels USING btree (store_id, item_id);
