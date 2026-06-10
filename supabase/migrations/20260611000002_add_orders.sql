-- supabase/migrations/20260611000002_add_orders.sql

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tenant_id uuid not null, -- Blocker #5
  store_id uuid not null default '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  items jsonb not null,          -- [{id, name, price, qty, unit}]
  subtotal numeric not null,
  delivery_fee numeric not null,
  total numeric not null,
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  payment_method text not null default 'cod',
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_tenant_store_created on public.orders(tenant_id, store_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);

alter table public.orders enable row level security;

-- Anon can insert
create policy "Allow anon insert orders"
on public.orders for insert
to anon
with check (true);

-- Admin/tenant-scoped read
create policy "Allow tenant read orders"
on public.orders for select
to authenticated
using (tenant_id = public.get_current_user_tenant_id());

-- RPC: atomic order + stock decrement from stock_levels
-- This is the fixed version that uses stock_levels table (not items.stock)
create or replace function public.create_order_with_stock(
  p_order_number text,
  p_tenant_id uuid,            -- parameterized
  p_store_id uuid,             -- parameterized (not hardcoded)
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,               -- [{id, name, price, qty, unit}]
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_id uuid;
  v_qty int;
  v_stock int;
  v_result jsonb;
begin
  -- Validate stock for all items first (SELECT FOR UPDATE on stock_levels)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    select qty into v_stock 
    from public.stock_levels 
    where item_id = v_id and store_id = p_store_id 
    for update;
    
    if not found then
      raise exception 'Item % not found in stock_levels for store %', v_id, p_store_id;
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for item % (available: %, requested: %)', v_id, v_stock, v_qty;
    end if;
  end loop;

  -- Decrement stock in stock_levels
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    update public.stock_levels 
    set qty = qty - v_qty 
    where item_id = v_id and store_id = p_store_id;
  end loop;

  -- Insert order and capture result
  insert into public.orders (
    order_number, tenant_id, store_id, customer_name, customer_phone, customer_address, notes,
    items, subtotal, delivery_fee, total, payment_method
  ) values (
    p_order_number, p_tenant_id, p_store_id,
    p_customer_name, p_customer_phone, p_customer_address, p_notes,
    p_items, p_subtotal, p_delivery_fee, p_total, 'cod'
  ) returning jsonb_build_object('id', id, 'order_number', order_number)
  into v_result;

  return v_result;
end;
$$;

-- Grant anon execute on the RPC
grant execute on function public.create_order_with_stock(text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text) to anon;
