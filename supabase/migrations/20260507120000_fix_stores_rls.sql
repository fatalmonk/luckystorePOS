-- Fix RLS policy for stores after the table has been created
-- This migration drops any stale policy and (re)creates it with the correct USING clause.
-- Adjust the USING clause as needed for your security model.

-- Only apply if stores table exists (safe for fresh databases)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stores'
  ) THEN
    -- Drop old policy if it exists
    DROP POLICY IF EXISTS "stores_insert_authenticated" ON public.stores;
    
    -- Create new policy with proper USING clause
    CREATE POLICY "stores_insert_authenticated"
      ON public.stores
      FOR INSERT
      TO authenticated
      USING (
        tenant_id = public.get_current_user_tenant_id()
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.auth_id = (SELECT auth.uid())
            AND u.role IN ('admin', 'manager')
        )
      );
  ELSE
    RAISE NOTICE 'Table stores does not exist, skipping policy creation';
  END IF;
END $$;
