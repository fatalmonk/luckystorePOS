-- Harden the sole storefront checkout RPC while preserving its PostgREST
-- signature. The storefront is intentionally limited to one public store.
create or replace function public.create_order_with_stock(
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
  p_notes text default null,
  p_delivery_slot text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  c_store_id constant uuid := '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
  c_free_delivery_threshold constant numeric := 500;
  c_delivery_fee constant numeric := 40;
  v_tenant_id uuid;
  v_line record;
  v_item_name text;
  v_item_price numeric;
  v_stock integer;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_delivery_fee numeric;
  v_total numeric;
  v_result jsonb;
begin
  if p_store_id is distinct from c_store_id then
    raise exception using errcode = '22023', message = 'Invalid storefront store';
  end if;

  select s.tenant_id
    into v_tenant_id
  from public.stores as s
  where s.id = c_store_id;

  if not found or v_tenant_id is null or p_tenant_id is distinct from v_tenant_id then
    raise exception using errcode = '22023', message = 'Invalid storefront tenant';
  end if;

  if p_order_number is null
     or p_order_number !~ '^LSO-[0-9]{8}-[A-Z0-9]{8}$'
     or length(p_customer_name) not between 1 and 120
     or length(p_customer_phone) not between 5 and 32
     or length(p_customer_address) not between 1 and 500
     or length(coalesce(p_notes, '')) > 1000
     or length(coalesce(p_delivery_slot, '')) > 120 then
    raise exception using errcode = '22023', message = 'Invalid checkout details';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Cart must contain 1 to 100 items';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(id uuid, qty integer)
    where x.id is null or x.qty is null or x.qty not between 1 and 999
  ) then
    raise exception using errcode = '22023', message = 'Invalid cart item';
  end if;

  -- A repeated item id is combined before the stock check, preventing duplicate
  -- JSON rows from independently passing the availability test.
  for v_line in
    select x.id, sum(x.qty)::integer as qty, max(left(x.unit, 40)) as unit
    from jsonb_to_recordset(p_items) as x(id uuid, qty integer, unit text)
    group by x.id
    order by x.id
  loop
    if v_line.qty not between 1 and 999 then
      raise exception using errcode = '22023', message = 'Invalid aggregate item quantity';
    end if;

    select i.name, i.price, sl.qty
      into v_item_name, v_item_price, v_stock
    from public.items as i
    join public.stock_levels as sl
      on sl.item_id = i.id
     and sl.store_id = c_store_id
    where i.id = v_line.id
      and i.tenant_id = v_tenant_id
      and i.is_active is true
    for update of sl;

    if not found or v_item_price is null or v_item_price < 0 then
      raise exception using errcode = '22023', message = 'Item is unavailable';
    end if;

    if coalesce(v_stock, 0) < v_line.qty then
      raise exception using errcode = '23514', message = 'Insufficient stock';
    end if;

    v_item_price := round(v_item_price, 2);
    v_subtotal := v_subtotal + (v_item_price * v_line.qty);
    v_items := v_items || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', v_line.id,
          'name', v_item_name,
          'price', v_item_price,
          'qty', v_line.qty,
          'unit', v_line.unit
        )
      )
    );
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_delivery_fee := case
    when v_subtotal >= c_free_delivery_threshold then 0
    else c_delivery_fee
  end;
  -- Preserve the storefront's existing promotion contract: orders at or above
  -- the threshold receive the same 40-unit discount currently calculated by
  -- the Next.js checkout route.
  v_total := case
    when v_subtotal >= c_free_delivery_threshold
      then v_subtotal - c_delivery_fee
    else v_subtotal + c_delivery_fee
  end;

  if abs(coalesce(p_subtotal, -1) - v_subtotal) > 0.01
     or abs(coalesce(p_delivery_fee, -1) - v_delivery_fee) > 0.01
     or abs(coalesce(p_total, -1) - v_total) > 0.01 then
    raise exception using errcode = '22023', message = 'Price mismatch; refresh the cart';
  end if;

  select jsonb_build_object('id', o.id, 'order_number', o.order_number)
    into v_result
  from public.orders as o
  where o.order_number = p_order_number
    and o.tenant_id = v_tenant_id
    and o.store_id = c_store_id;

  if found then
    return v_result;
  end if;

  for v_line in
    select x.id, sum(x.qty)::integer as qty
    from jsonb_to_recordset(p_items) as x(id uuid, qty integer)
    group by x.id
  loop
    update public.stock_levels
    set qty = qty - v_line.qty
    where item_id = v_line.id
      and store_id = c_store_id;
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
    v_tenant_id,
    c_store_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_customer_address),
    nullif(btrim(p_notes), ''),
    v_items,
    v_subtotal,
    v_delivery_fee,
    v_total,
    'cod',
    nullif(btrim(p_delivery_slot), '')
  )
  returning jsonb_build_object('id', id, 'order_number', order_number)
    into v_result;

  return v_result;
end;
$function$;

revoke execute on function public.create_order_with_stock(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text
) from public;
revoke execute on function public.create_order_with_stock(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text
) from authenticated;
grant execute on function public.create_order_with_stock(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text
) to anon, service_role;

-- Retire the old overload from every Data API role without dropping it.
revoke execute on function public.create_order_with_stock(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text
) from public, anon, authenticated;
