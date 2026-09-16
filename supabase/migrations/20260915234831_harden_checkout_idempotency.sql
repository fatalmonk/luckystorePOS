-- Harden the anonymous storefront checkout wrapper.
-- Idempotency keys remain globally unique (the existing table primary key),
-- so all reads and writes use the same global-key semantics.

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
begin
  -- This RPC is public because guest checkout is supported. Restrict it to
  -- the configured storefront and derive the tenant from that store.
  if p_store_id <> '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid then
    raise exception 'Unsupported storefront store';
  end if;

  select tenant_id into v_expected_tenant_id
  from public.stores
  where id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid;

  if v_expected_tenant_id is null or p_tenant_id is distinct from v_expected_tenant_id then
    raise exception 'Invalid storefront tenant';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if not exists (
      select 1
      from public.items i
      join public.stock_levels sl on sl.item_id = i.id and sl.store_id = p_store_id
      where i.id = (v_item->>'id')::uuid
        and i.tenant_id = v_expected_tenant_id
        and i.active is true
    ) then
      raise exception 'Item is not available in the storefront catalog';
    end if;
  end loop;

  if nullif(trim(p_idempotency_key), '') is not null then
    insert into public.idempotency_keys (idempotency_key, tenant_id, locked_at)
    values (trim(p_idempotency_key), v_expected_tenant_id, clock_timestamp())
    on conflict (idempotency_key) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select response_body into v_response
      from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key);

      if v_response is not null then
        return jsonb_build_object('order', v_response, 'replayed', true);
      end if;

      raise exception 'This order is already being processed';
    end if;
  end if;

  begin
    v_response := public.create_order_with_stock_v2(
      p_order_number,
      v_expected_tenant_id,
      p_store_id,
      p_customer_name,
      p_customer_phone,
      p_customer_address,
      p_items,
      p_subtotal,
      p_delivery_fee,
      p_total,
      p_payment_method,
      p_notes,
      p_delivery_slot
    );

    if nullif(trim(p_idempotency_key), '') is not null then
      update public.idempotency_keys
      set response_body = v_response,
          completed_at = clock_timestamp()
      where idempotency_key = trim(p_idempotency_key);
    end if;

    return jsonb_build_object('order', v_response, 'replayed', false);
  exception when others then
    if nullif(trim(p_idempotency_key), '') is not null then
      delete from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key)
        and response_body is null;
    end if;
    raise;
  end;
end;
$function$;

revoke all on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) from public;

grant execute on function public.create_order_with_stock_idempotent(
  text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, text
) to anon, authenticated;

