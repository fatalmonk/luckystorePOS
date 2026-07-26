-- Caller review found no application, Edge Function, or test usage of this
-- legacy signature. The active storefront uses the 12-argument overload.
drop function if exists public.create_order_with_stock(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text
);
