-- Contain the unused legacy online-order tables. Their public policies exposed
-- customer contact/address data and permitted anonymous writes.
drop policy if exists online_orders_tenant_isolation on public.online_orders;
drop policy if exists "public insert orders" on public.online_orders;
drop policy if exists "public select orders" on public.online_orders;
drop policy if exists "staff update orders" on public.online_orders;

drop policy if exists "public insert items" on public.online_order_items;
drop policy if exists "public select items" on public.online_order_items;

revoke all privileges
  on table public.online_orders, public.online_order_items
  from anon;

-- Keep the legacy authenticated RPC available until its external ownership and
-- double-reservation defect are resolved in a separate reviewed change.
do $migration$
begin
  if has_table_privilege('anon', 'public.online_orders', 'select')
     or has_table_privilege('anon', 'public.online_orders', 'insert')
     or has_table_privilege('anon', 'public.online_orders', 'update')
     or has_table_privilege('anon', 'public.online_orders', 'delete')
     or has_table_privilege('anon', 'public.online_order_items', 'select')
     or has_table_privilege('anon', 'public.online_order_items', 'insert')
     or has_table_privilege('anon', 'public.online_order_items', 'update')
     or has_table_privilege('anon', 'public.online_order_items', 'delete') then
    raise exception 'anonymous legacy online-order table access remains';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.place_online_order(uuid,text,text,text,jsonb,integer,integer,integer)',
    'execute'
  ) then
    raise exception 'authenticated legacy online-order RPC execute privilege is missing';
  end if;
end;
$migration$;
