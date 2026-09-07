-- Persist the customer-selected delivery payment method while retaining the
-- existing RPC during the storefront rollout. Supabase's Data API does not
-- support overloaded functions, so the payment-aware contract uses a v2 name.

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'bkash'))
  not valid;

alter table public.orders
  validate constraint orders_payment_method_check;

create function public.create_order_with_stock_v2(
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
  p_delivery_slot text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_item jsonb;
  v_id uuid;
  v_qty integer;
  v_stock integer;
  v_result jsonb;
begin
  if p_payment_method is null or p_payment_method not in ('cod', 'bkash') then
    raise exception 'Unsupported payment method';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Item quantity must be a positive integer';
    end if;

    select qty
    into v_stock
    from public.stock_levels
    where item_id = v_id
      and store_id = p_store_id
    for update;

    if not found then
      raise exception 'Item % not found in stock_levels for store %', v_id, p_store_id;
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for item % (available: %, requested: %)', v_id, v_stock, v_qty;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::integer;

    update public.stock_levels
    set qty = qty - v_qty
    where item_id = v_id
      and store_id = p_store_id;
  end loop;

  insert into public.orders (
    order_number,
    tenant_id,
    store_id,
    customer_name,
    customer_phone,
    customer_address,
    notes,
    items,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    delivery_slot
  ) values (
    p_order_number,
    p_tenant_id,
    p_store_id,
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_notes,
    p_items,
    p_subtotal,
    p_delivery_fee,
    p_total,
    p_payment_method,
    p_delivery_slot
  )
  returning jsonb_build_object('id', id, 'order_number', order_number)
  into v_result;

  return v_result;
end;
$function$;

revoke all on function public.create_order_with_stock_v2(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text
) from public;

grant execute on function public.create_order_with_stock_v2(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text
) to anon, authenticated;

do $migration$
begin
  if not has_function_privilege(
    'anon',
    'public.create_order_with_stock_v2(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text,text)',
    'execute'
  ) then
    raise exception 'anonymous checkout payment-method RPC execute privilege is missing';
  end if;
end;
$migration$;
