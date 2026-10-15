-- A product-specific online checkout offer for the first Deal of the Week.
-- The listed prices are the reviewed catalogue basis. A product stops qualifying
-- automatically if either its selling price or MRP changes before the offer ends.

create table public.storefront_item_promotions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  store_id uuid not null references public.stores(id),
  item_id uuid not null references public.items(id),
  expected_name text not null,
  campaign_key text not null,
  revision integer not null default 1 check (revision > 0),
  is_current boolean not null default true,
  discount_percent numeric(5, 2) not null check (discount_percent > 0 and discount_percent <= 100),
  expected_price numeric(12, 2) not null check (expected_price >= 0),
  expected_mrp numeric(12, 2) not null check (expected_mrp >= expected_price and expected_price <= round(expected_mrp * 0.90, 2)),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  offer_terms text not null,
  selection_reason text not null,
  evidence_source text not null,
  evidence_checked_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (campaign_key, item_id, revision)
);

create unique index storefront_item_promotions_one_current_pick
  on public.storefront_item_promotions (campaign_key, item_id)
  where is_current is true;

alter table public.storefront_item_promotions enable row level security;
revoke all on public.storefront_item_promotions from public;
revoke all on public.storefront_item_promotions from anon, authenticated;
grant select on public.storefront_item_promotions to anon, authenticated;
grant all on public.storefront_item_promotions to service_role;

create policy storefront_item_promotions_current_campaign_read
  on public.storefront_item_promotions
  for select
  to anon, authenticated
  using (
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    and store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid
    and is_current is true
    and ends_at > statement_timestamp()
  );

insert into public.storefront_item_promotions (
  tenant_id, store_id, item_id, expected_name, campaign_key, discount_percent, offer_terms,
  expected_price, expected_mrp, starts_at, ends_at,
  selection_reason, evidence_source, evidence_checked_at
) values
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '685b9d11-a04a-4ef4-8753-712b21fdb75b', 'Awei Data Cable Micro USB (CL-115M)', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 150, 207, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '0c815bf1-c506-44f5-88dd-b504db60d7af', 'Buldak Ramen Cheese Cup', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 150, 190, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'b79a6606-3eb8-425e-bf53-57c5788dc7ea', 'Buldak Ramen Noodles 2x Spicy Cup', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 150, 190, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '4bbb76d4-f058-430f-9fd1-87db15d71b5c', 'Buldak Ramen Original Cup', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 150, 190, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '16eece31-f416-4db2-9c0c-371d2696a917', 'Avonee Pant Style Baby Diaper (9-14 kg) - L 48 pcs', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 1000, 1265, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'a0e370df-8e43-4368-ac84-b083b96cce2f', 'Dove Conditioner Intensive Repair 50 ml', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 19, 24, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'f49fa080-07f8-4ec3-926a-6f64e315802f', 'Buldak Ramen 2x Spicy', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '315a1ef1-49ef-470e-a0ff-818aa0400739', 'Buldak Ramen 3x Spicy', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', 'e04a2efd-9a26-411a-9984-eaf227f72cdc', 'Buldak Ramen Cream Carbonara', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '8169739f-dd49-4588-928e-837a22faa388', 'Buldak Ramen Original', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '7fd83cfc-2eac-45d1-aa90-0002ca5a0222', 'Buldak Ramen Quattro Cheese', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00'),
  ('00000000-0000-0000-0000-000000000001', '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '841b013d-e7bd-46a6-9e69-282f84aa2781', 'Buldak Ramen Rose', 'dealoftheweek-2026-10-19', 5, 'Online checkout only; extra 5% off the verified current selling price; valid 19–25 October 2026, Asia/Dhaka.', 160, 200, '2026-10-18 18:00:00+00', '2026-10-25 18:00:00+00', 'Selected as one of the 12 highest-discount active catalogue products in the verification snapshot.', 'Lucky Store production catalogue snapshot', '2026-10-15 15:52:22.275871+00');

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
        'price', priced.unit_price,
        'base_price', i.price,
        'discount_percent', promo.discount_percent,
        'campaign_key', promo.campaign_key,
        'qty', requested.qty,
        'unit', requested.unit
      ) order by requested.first_ordinal
    ),
    coalesce(sum(priced.unit_price * requested.qty), 0)
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
   and i.is_active is true
  left join lateral (
    select p.discount_percent, p.campaign_key
    from public.storefront_item_promotions p
    where p.tenant_id = v_expected_tenant_id
      and p.store_id = p_store_id
      and p.item_id = i.id
      and p.is_current is true
      and p.expected_name = i.name
      and p.expected_price = i.price
      and p.expected_mrp = i.mrp
      and p.starts_at <= statement_timestamp()
      and p.ends_at > statement_timestamp()
      and exists (
        select 1
        from public.stock_levels sl
        where sl.item_id = i.id
          and sl.store_id = p_store_id
          and greatest(0, coalesce(sl.qty, 0) - coalesce(sl.reserved, 0) - coalesce(sl.qty_reserved_online, 0)) > 0
      )
    order by p.discount_percent desc
    limit 1
  ) promo on true
  cross join lateral (
    select round(i.price * (1 - coalesce(promo.discount_percent, 0) / 100), 2) as unit_price
  ) priced;

  if v_canonical_items is null then
    raise exception 'Cart is empty';
  end if;
  v_delivery_fee := case when v_subtotal >= 500 then 0 else 40 end;
  v_total := v_subtotal + v_delivery_fee;

  if round(coalesce(p_subtotal, -1), 2) is distinct from round(v_subtotal, 2) then
    raise exception 'Subtotal does not match catalog prices and active offers';
  end if;
  if round(coalesce(p_delivery_fee, -1), 2) is distinct from round(v_delivery_fee, 2) then
    raise exception 'Delivery fee does not match store policy';
  end if;
  if round(coalesce(p_total, -1), 2) is distinct from round(v_total, 2) then
    raise exception 'Total does not match catalog prices and active offers';
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
