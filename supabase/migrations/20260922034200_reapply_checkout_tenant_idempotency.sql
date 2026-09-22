-- Reapply the storefront checkout idempotency RPC after the later migration
-- changes idempotency_keys from global-key uniqueness to tenant-scoped
-- uniqueness. Environments that already recorded the earlier checkout RPC
-- migration otherwise retain ON CONFLICT (idempotency_key), which no longer
-- matches any unique/exclusion constraint.

create or replace function public.create_order_with_stock_idempotent(
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
set search_path = pg_catalog, public
as $function$
declare
  v_response jsonb;
  v_rows integer;
  v_expected_tenant_id uuid;
  v_item jsonb;
  v_id uuid;
  v_qty integer;
  v_canonical_items jsonb;
  v_subtotal numeric;
  v_delivery_fee numeric;
  v_total numeric;
begin
  if p_store_id <> '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid then
    raise exception 'Unsupported storefront store';
  end if;

  select tenant_id into v_expected_tenant_id
  from public.stores
  where id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid;

  if v_expected_tenant_id is null or p_tenant_id is distinct from v_expected_tenant_id then
    raise exception 'Invalid storefront tenant';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Items must be a JSON array';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Each cart item must be a JSON object';
    end if;
    begin
      v_id := (v_item->>'id')::uuid;
      v_qty := (v_item->>'qty')::integer;
    exception when invalid_text_representation then
      raise exception 'Cart item id and quantity are invalid';
    end;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Item quantity must be a positive integer';
    end if;
    if not exists (
      select 1
      from public.items i
      join public.stock_levels sl on sl.item_id = i.id and sl.store_id = p_store_id
      where i.id = v_id
        and i.tenant_id = v_expected_tenant_id
        and i.is_active is true
        and i.price is not null
        and i.price >= 0
    ) then
      raise exception 'Item is not available in the storefront catalog';
    end if;
  end loop;

  select
    jsonb_agg(
      jsonb_build_object(
        'id', requested.item_id,
        'name', i.name,
        'price', i.price,
        'qty', requested.qty,
        'unit', requested.unit
      ) order by requested.first_ordinal
    ),
    coalesce(sum(i.price * requested.qty), 0)
  into v_canonical_items, v_subtotal
  from (
    select
      (entry.item->>'id')::uuid as item_id,
      sum((entry.item->>'qty')::integer)::integer as qty,
      min(entry.ordinality) as first_ordinal,
      (array_agg(nullif(entry.item->>'unit', '') order by entry.ordinality))[1] as unit
    from jsonb_array_elements(p_items) with ordinality as entry(item, ordinality)
    group by (entry.item->>'id')::uuid
  ) requested
  join public.items i
    on i.id = requested.item_id
   and i.tenant_id = v_expected_tenant_id
   and i.is_active is true;

  if v_canonical_items is null then
    raise exception 'Cart is empty';
  end if;
  v_delivery_fee := case when v_subtotal >= 500 then 0 else 40 end;
  v_total := v_subtotal + v_delivery_fee;

  if round(coalesce(p_subtotal, -1), 2) is distinct from round(v_subtotal, 2) then
    raise exception 'Subtotal does not match catalog prices';
  end if;
  if round(coalesce(p_delivery_fee, -1), 2) is distinct from round(v_delivery_fee, 2) then
    raise exception 'Delivery fee does not match store policy';
  end if;
  if round(coalesce(p_total, -1), 2) is distinct from round(v_total, 2) then
    raise exception 'Total does not match catalog prices';
  end if;

  if nullif(trim(p_idempotency_key), '') is not null then
    insert into public.idempotency_keys (idempotency_key, tenant_id, locked_at)
    values (trim(p_idempotency_key), v_expected_tenant_id, clock_timestamp())
    on conflict (tenant_id, idempotency_key) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select response_body into v_response
      from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = v_expected_tenant_id;
      if v_response is not null then
        return jsonb_build_object('order', v_response, 'replayed', true);
      end if;
      raise exception 'This order is already being processed';
    end if;
  end if;

  begin
    v_response := public.create_order_with_stock_v2(
      p_order_number, v_expected_tenant_id, p_store_id, p_customer_name,
      p_customer_phone, p_customer_address, v_canonical_items,
      v_subtotal, v_delivery_fee, v_total, p_payment_method, p_notes,
      p_delivery_slot
    );
    if nullif(trim(p_idempotency_key), '') is not null then
      update public.idempotency_keys
      set response_body = v_response, completed_at = clock_timestamp()
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = v_expected_tenant_id;
    end if;
    return jsonb_build_object('order', v_response, 'replayed', false);
  exception when others then
    if nullif(trim(p_idempotency_key), '') is not null then
      delete from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = v_expected_tenant_id
        and response_body is null;
    end if;
    raise;
  end;
end;
$function$;

revoke all on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) to anon, authenticated;

revoke all on function public.create_order_with_stock_v2(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text
) from public, anon, authenticated;
