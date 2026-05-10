-- Replace permissive USING(true) mutations with role checks matching Dashboard visibility
-- Safe for fresh databases: check if tables exist before applying policies

DO $$
BEGIN
  -- Only apply if stores table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stores'
  ) THEN
    drop policy if exists "stores_insert_authenticated" on public.stores;
    drop policy if exists "stores_update_authenticated" on public.stores;
    drop policy if exists "stores_delete_authenticated" on public.stores;
    
    create policy "stores_insert_admin_manager"
      on public.stores for insert to authenticated
      with check (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role in ('admin', 'manager')
        )
      );
    
    create policy "stores_update_admin_manager"
      on public.stores for update to authenticated
      using (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role in ('admin', 'manager')
        )
      )
      with check (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role in ('admin', 'manager')
        )
      );
    
    create policy "stores_delete_admin_manager"
      on public.stores for delete to authenticated
      using (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role in ('admin', 'manager')
        )
      );
  ELSE
    RAISE NOTICE 'Table stores does not exist, skipping policy creation';
  END IF;
END $$;

DO $$
BEGIN
  -- Only apply if categories table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    drop policy if exists "categories_insert_authenticated" on public.categories;
    drop policy if exists "categories_update_authenticated" on public.categories;
    drop policy if exists "categories_delete_authenticated" on public.categories;
    
    create policy "categories_insert_admin"
      on public.categories for insert to authenticated
      with check (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role = 'admin'
        )
      );
    
    create policy "categories_update_admin"
      on public.categories for update to authenticated
      using (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role = 'admin'
        )
      );
    
    create policy "categories_delete_admin"
      on public.categories for delete to authenticated
      using (
        exists (
          select 1 from public.users u
          where u.auth_id = (select auth.uid())
            and u.role = 'admin'
        )
      );
  ELSE
    RAISE NOTICE 'Table categories does not exist, skipping policy creation';
  END IF;
END $$;
