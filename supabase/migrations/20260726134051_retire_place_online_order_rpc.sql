-- Caller review found no runtime application or database caller. Retire the
-- unsafe legacy RPC without cascading into its historical tables or triggers.
drop function if exists public.place_online_order(
  uuid, text, text, text, jsonb, integer, integer, integer
);
