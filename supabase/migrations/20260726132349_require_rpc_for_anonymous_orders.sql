-- Anonymous checkout must pass through create_order_with_stock so prices,
-- tenant/store scope, quantities, and stock are validated atomically.
drop policy if exists "Allow anon insert orders" on public.orders;
revoke insert on table public.orders from anon;

-- Fail closed if the intended checkout API is not still callable.
do $migration$
begin
  if not has_function_privilege(
    'anon',
    'public.create_order_with_stock(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text)',
    'execute'
  ) then
    raise exception 'anonymous checkout RPC execute privilege is missing';
  end if;
end;
$migration$;
