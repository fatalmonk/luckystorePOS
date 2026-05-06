-- Ensure stock levels are readable in frontend and writable by admin/manager roles.
-- Root cause: RLS was enabled on stock_levels with no policies, so SELECT returned 0 rows.

alter table public.stock_levels enable row level security;

drop policy if exists "Authenticated users can read stock levels" on public.stock_levels;
create policy "Authenticated users can read stock levels"
on public.stock_levels
for select
to authenticated
using (true);

drop policy if exists "Admins managers can manage stock levels" on public.stock_levels;
create policy "Admins managers can manage stock levels"
on public.stock_levels
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.auth_id = auth.uid()
      and users.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.auth_id = auth.uid()
      and users.role in ('admin', 'manager')
  )
);
