-- Make anonymous checkout retries durable and atomic across storefront processes.
-- The existing create_order_with_stock_v2 RPC remains unchanged for callers that
-- do not supply an idempotency key.

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
begin
  if nullif(trim(p_idempotency_key), '') is not null then
    insert into public.idempotency_keys (idempotency_key, tenant_id, locked_at)
    values (trim(p_idempotency_key), p_tenant_id, clock_timestamp())
    on conflict (idempotency_key) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select response_body into v_response
      from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = p_tenant_id;

      if v_response is not null then
        return v_response;
      end if;

      raise exception 'This order is already being processed';
    end if;
  end if;

  begin
    v_response := public.create_order_with_stock_v2(
      p_order_number,
      p_tenant_id,
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
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = p_tenant_id;
    end if;

    return v_response;
  exception when others then
    if nullif(trim(p_idempotency_key), '') is not null then
      delete from public.idempotency_keys
      where idempotency_key = trim(p_idempotency_key)
        and tenant_id = p_tenant_id
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
