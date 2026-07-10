-- =============================================================================
-- Migration: Ensure whatsapp_logs schema supports webhook events
-- Date: 2026-07-11
-- Purpose: The lucky-store-whatsapp-webhook Cloudflare Worker logs incoming
--            WhatsApp webhooks and outgoing auto-replies to this table.
--            Create the table if missing and add nullable columns for webhook
--            details without breaking the existing send-whatsapp-message edge
--            function (which inserts recipient, template, status, response).
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'whatsapp_logs'
  ) THEN
    CREATE TABLE public.whatsapp_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      recipient text,
      template text,
      status text,
      response jsonb,
      direction text CHECK (direction IN ('incoming', 'outgoing')),
      phone_number_id text,
      display_phone_number text,
      sender text,
      message_id text,
      message_type text,
      message_body text,
      payload jsonb DEFAULT '{}'::jsonb
    );
  END IF;
END $$;

ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('incoming', 'outgoing')),
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS display_phone_number text,
  ADD COLUMN IF NOT EXISTS sender text,
  ADD COLUMN IF NOT EXISTS message_id text,
  ADD COLUMN IF NOT EXISTS message_type text,
  ADD COLUMN IF NOT EXISTS message_body text,
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

-- Backfill existing rows (sent by the edge function) as outgoing
UPDATE public.whatsapp_logs
SET direction = 'outgoing'
WHERE direction IS NULL;

-- Enable RLS as defense-in-depth. The webhook Worker uses the service_role key,
-- which bypasses RLS, so no public policies are required.
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
