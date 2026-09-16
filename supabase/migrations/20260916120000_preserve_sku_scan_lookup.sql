-- Preserve legacy SKU scans when a catalog barcode is replaced by a verified GTIN.
-- Barcode and SKU are both accepted scan identifiers for the POS lookup RPC.

create or replace function public.lookup_item_by_scan(p_barcode text, p_store_id uuid)
returns table (item_id uuid, name text, price numeric, mrp numeric, stock integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id as item_id,
    i.name,
    i.price,
    i.mrp,
    coalesce(sl.qty, 0)::integer as stock
  from public.items i
  left join public.stock_levels sl
    on sl.item_id = i.id
   and sl.store_id = p_store_id
  where (i.barcode = p_barcode or i.sku = p_barcode)
    and i.is_active = true
  limit 1;
$$;

grant execute on function public.lookup_item_by_scan(text, uuid) to authenticated;
grant execute on function public.lookup_item_by_scan(text, uuid) to service_role;
grant execute on function public.lookup_item_by_scan(text, uuid) to anon;
