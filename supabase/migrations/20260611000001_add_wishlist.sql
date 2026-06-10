-- supabase/migrations/20260611000001_add_wishlist.sql

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.items(id) on delete cascade,
  customer_fingerprint text not null, -- localStorage fingerprint
  customer_phone text,                 -- optional, for back-in-stock SMS
  product_name text not null,          -- denormalized for notification
  created_at timestamptz not null default now(),
  unique (product_id, customer_fingerprint)
);

alter table public.wishlist enable row level security;

-- Anon can insert their own, but NOT read
create policy "Allow anon insert wishlist"
on public.wishlist for insert
to anon
with check (true);

-- Anon cannot select (prevents browsing others' wishlists)
create policy "Disallow anon select wishlist"
on public.wishlist for select
to anon
using (false);

-- Admin can read for restock planning
create policy "Allow admin read wishlist"
on public.wishlist for select
to authenticated
using (true);
