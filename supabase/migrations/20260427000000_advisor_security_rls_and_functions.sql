-- Signup: authenticated users may insert their own profile row (RLS was blocking inserts)
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check ((select auth.uid()) = auth_id);

-- sale_items / stock_movements had RLS on with zero policies (denied everything; noisy linter)
drop policy if exists "sale_items_select_staff" on public.sale_items;
create policy "sale_items_select_staff"
  on public.sale_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.auth_id = (select auth.uid())
        and u.role in ('admin', 'manager', 'cashier', 'stock')
    )
  );

drop policy if exists "stock_movements_select_staff" on public.stock_movements;
create policy "stock_movements_select_staff"
  on public.stock_movements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.auth_id = (select auth.uid())
        and u.role in ('admin', 'manager', 'cashier', 'stock')
    )
  );

-- Tables exposed without RLS (advisor ERROR): enable + match prior “open to authenticated” for stores/categories
alter table public.stores enable row level security;

drop policy if exists "stores_select_authenticated" on public.stores;
create policy "stores_select_authenticated"
  on public.stores for select to authenticated using (true);

drop policy if exists "stores_insert_authenticated" on public.stores;
create policy "stores_insert_authenticated"
  on public.stores for insert to authenticated with check (true);

drop policy if exists "stores_update_authenticated" on public.stores;
create policy "stores_update_authenticated"
  on public.stores for update to authenticated using (true) with check (true);

drop policy if exists "stores_delete_authenticated" on public.stores;
create policy "stores_delete_authenticated"
  on public.stores for delete to authenticated using (true);

alter table public.categories enable row level security;

drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
  on public.categories for select to authenticated using (true);

drop policy if exists "categories_insert_authenticated" on public.categories;
create policy "categories_insert_authenticated"
  on public.categories for insert to authenticated with check (true);

drop policy if exists "categories_update_authenticated" on public.categories;
create policy "categories_update_authenticated"
  on public.categories for update to authenticated using (true) with check (true);

drop policy if exists "categories_delete_authenticated" on public.categories;
create policy "categories_delete_authenticated"
  on public.categories for delete to authenticated using (true);

-- No client usage; block PostgREST while satisfying “has at least one policy”
alter table public.batches enable row level security;

drop policy if exists "batches_no_client_access" on public.batches;
create policy "batches_no_client_access"
  on public.batches for all to authenticated using (false) with check (false);

alter table public.receipt_counters enable row level security;

drop policy if exists "receipt_counters_no_client_access" on public.receipt_counters;
create policy "receipt_counters_no_client_access"
  on public.receipt_counters for all to authenticated using (false) with check (false);

alter table public.returns enable row level security;

drop policy if exists "returns_no_client_access" on public.returns;
create policy "returns_no_client_access"
  on public.returns for all to authenticated using (false) with check (false);

-- Security advisor: mutable search_path on SECURITY DEFINER / RPC functions
alter function public.decrement_stock(uuid, uuid, integer) set search_path = public, pg_temp;
alter function public.get_new_receipt(uuid) set search_path = public, pg_temp;
alter function public.import_apply_stock_delta(uuid, uuid, integer) set search_path = public, pg_temp;
alter function public.update_competitor_price_timestamp() set search_path = public, pg_temp;
alter function public.update_timestamp() set search_path = public, pg_temp;
alter function public.upsert_stock_level(uuid, uuid, integer) set search_path = public, pg_temp;
