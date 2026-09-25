-- Bind storefront orders to an authenticated customer or a high-entropy guest token.
alter table public.orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_customer_user_created
  on public.orders (customer_user_id, created_at desc)
  where customer_user_id is not null;

create table public.storefront_order_tracking (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.storefront_order_tracking enable row level security;
revoke all on public.storefront_order_tracking from public, anon, authenticated;
grant select on public.storefront_order_tracking to service_role;

alter table public.idempotency_keys
  add column if not exists request_hash text;

alter table public.idempotency_keys
  add constraint idempotency_keys_request_hash_check
  check (request_hash is null or request_hash ~ '^[0-9a-f]{64}$');

-- Keep the old implementation private, then wrap it so ownership is attached
-- in the same transaction as order creation and idempotency persistence.
alter function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) rename to create_order_with_stock_idempotent_unowned;

revoke all on function public.create_order_with_stock_idempotent_unowned(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) from public, anon, authenticated;

create function public.create_order_with_stock_idempotent(
  p_order_number text,
  p_tenant_id uuid,
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_notes text default null,
  p_delivery_slot text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, auth
as $function$
declare
  v_result jsonb;
  v_order jsonb;
  v_request_hash text;
  v_existing_hash text;
  v_tracking_hash text;
  v_linked boolean;
  v_guest_tracked boolean := false;
begin
  if p_idempotency_key is null
    or p_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'A valid checkout idempotency key is required';
  end if;

  v_request_hash := encode(digest(jsonb_build_object(
    'order_number', p_order_number,
    'tenant_id', p_tenant_id,
    'store_id', p_store_id,
    'customer_name', p_customer_name,
    'customer_phone', p_customer_phone,
    'customer_address', p_customer_address,
    'items', p_items,
    'subtotal', p_subtotal,
    'delivery_fee', p_delivery_fee,
    'total', p_total,
    'payment_method', p_payment_method,
    'notes', p_notes,
    'delivery_slot', p_delivery_slot
  )::text, 'sha256'), 'hex');

  v_result := public.create_order_with_stock_idempotent_unowned(
    p_order_number, p_tenant_id, p_store_id, p_customer_name,
    p_customer_phone, p_customer_address, p_items, p_subtotal,
    p_delivery_fee, p_total, p_payment_method, p_notes,
    p_delivery_slot, p_idempotency_key
  );
  v_order := coalesce(v_result->'order', v_result);

  select request_hash into v_existing_hash
  from public.idempotency_keys
  where tenant_id = p_tenant_id
    and idempotency_key = p_idempotency_key;

  if v_existing_hash is null and coalesce((v_result->>'replayed')::boolean, false) is true then
    if not exists (
      select 1 from public.orders o
      where o.id = (v_order->>'id')::uuid
        and o.order_number = p_order_number
        and o.customer_name = p_customer_name
        and o.customer_phone = p_customer_phone
        and o.customer_address = p_customer_address
        and (
          select jsonb_agg(jsonb_build_object(
            'id', entry.item->>'id',
            'name', entry.item->>'name',
            'price', (entry.item->>'price')::numeric,
            'qty', (entry.item->>'qty')::integer
          ) order by entry.ordinality)
          from jsonb_array_elements(o.items) with ordinality as entry(item, ordinality)
        ) = (
          select jsonb_agg(jsonb_build_object(
            'id', entry.item->>'id',
            'name', entry.item->>'name',
            'price', (entry.item->>'price')::numeric,
            'qty', (entry.item->>'qty')::integer
          ) order by entry.ordinality)
          from jsonb_array_elements(p_items) with ordinality as entry(item, ordinality)
        )
        and o.subtotal = p_subtotal
        and o.delivery_fee = p_delivery_fee
        and o.total = p_total
        and o.payment_method = p_payment_method
        and o.notes is not distinct from p_notes
        and o.delivery_slot is not distinct from p_delivery_slot
    ) then
      raise exception 'Idempotency key replay payload mismatch';
    end if;
  elsif v_existing_hash is not null and v_existing_hash is distinct from v_request_hash then
    raise exception 'Idempotency key replay payload mismatch';
  end if;

  update public.idempotency_keys
  set request_hash = v_request_hash
  where tenant_id = p_tenant_id
    and idempotency_key = p_idempotency_key
    and request_hash is null;

  v_tracking_hash := encode(digest(p_idempotency_key, 'sha256'), 'hex');
  if auth.uid() is null then
    insert into public.storefront_order_tracking (order_id, token_hash)
    select o.id, v_tracking_hash
    from public.orders o
    where o.id = (v_order->>'id')::uuid
      and o.customer_user_id is null
    on conflict (order_id) do update
      set token_hash = excluded.token_hash
      where public.storefront_order_tracking.token_hash = excluded.token_hash;
    v_linked := found;
    v_guest_tracked := v_linked;
  else
    update public.orders
    set customer_user_id = auth.uid()
    where id = (v_order->>'id')::uuid
      and (customer_user_id is null or customer_user_id = auth.uid())
      and not exists (
        select 1 from public.storefront_order_tracking t
        where t.order_id = orders.id
      );
    v_linked := found;
    if not v_linked then
      select exists (
        select 1
        from public.storefront_order_tracking t
        join public.orders o on o.id = t.order_id
        where t.order_id = (v_order->>'id')::uuid
          and t.token_hash = v_tracking_hash
          and o.customer_user_id is null
      ) into v_guest_tracked;
      v_linked := v_guest_tracked;
    end if;
  end if;

  if not v_linked then
    raise exception 'Order is already linked to a different customer';
  end if;

  if v_guest_tracked then
    if v_result ? 'order' then
      v_result := jsonb_set(v_result, '{order,trackingToken}', to_jsonb(p_idempotency_key), true);
    else
      v_result := jsonb_set(v_result, '{trackingToken}', to_jsonb(p_idempotency_key), true);
    end if;
  end if;

  return v_result;
end;
$function$;

revoke all on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) to anon, authenticated;
alter function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) owner to postgres;

revoke update on public.orders from public, anon, authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Allow tenant update orders" on public.orders;
create policy "Allow fulfillment staff update orders"
on public.orders for update
to authenticated
using (
  tenant_id = public.get_current_user_tenant_id()
  and exists (
    select 1 from public.users u
    where u.auth_id = (select auth.uid())
      and u.tenant_id = orders.tenant_id
      and (
        u.role in ('admin', 'manager')
        or (u.role = 'stock' and u.store_id = orders.store_id)
      )
  )
)
with check (
  tenant_id = public.get_current_user_tenant_id()
  and exists (
    select 1 from public.users u
    where u.auth_id = (select auth.uid())
      and u.tenant_id = orders.tenant_id
      and (
        u.role in ('admin', 'manager')
        or (u.role = 'stock' and u.store_id = orders.store_id)
      )
  )
);

-- Restrict state changes to fulfillment roles and prevent arbitrary field edits
-- or invalid transitions through direct authenticated updates.
create or replace function public.enforce_storefront_order_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    if current_user = pg_get_userbyid((select relowner from pg_class where oid = 'public.orders'::regclass)) then
      return new;
    end if;
    raise exception 'Only order status may be changed';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('preparing', 'cancelled'))
    or (old.status = 'preparing' and new.status in ('out_for_delivery', 'cancelled'))
    or (old.status = 'out_for_delivery' and new.status = 'delivered')
  ) then
    raise exception 'Invalid order status transition: % to %', old.status, new.status;
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_storefront_order_status_transition on public.orders;
create trigger enforce_storefront_order_status_transition
before update on public.orders
for each row execute function public.enforce_storefront_order_status_transition();
