-- Route sale creation through the authenticated SECURITY DEFINER RPC boundary.
-- Runtime caller review found no direct client inserts into these tables.

DROP POLICY IF EXISTS sales_insert_cashier ON public.sales;
DROP POLICY IF EXISTS si_insert ON public.sale_items;
DROP POLICY IF EXISTS sp_insert ON public.sale_payments;
DROP POLICY IF EXISTS payments_insert_cashier ON public.payments;

REVOKE INSERT ON TABLE public.sales FROM anon, authenticated;
REVOKE INSERT ON TABLE public.sale_items FROM anon, authenticated;
REVOKE INSERT ON TABLE public.sale_payments FROM anon, authenticated;
REVOKE INSERT ON TABLE public.payments FROM anon, authenticated;

-- Keep trusted backend access explicit. Existing SELECT policies and grants are
-- intentionally unchanged.
GRANT INSERT ON TABLE public.sales TO service_role;
GRANT INSERT ON TABLE public.sale_items TO service_role;
GRANT INSERT ON TABLE public.sale_payments TO service_role;
GRANT INSERT ON TABLE public.payments TO service_role;

-- No runtime caller was found. This SECURITY DEFINER overload accepted
-- caller-supplied store, cashier, prices, totals, and payments without binding
-- them to auth.uid(), so it must not remain an authenticated API endpoint.
DROP FUNCTION IF EXISTS public.complete_sale_v2(
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  numeric,
  numeric,
  timestamp with time zone,
  text
);
