-- Forward revocation of anonymous execution from SECURITY DEFINER functions that have no
-- verified anonymous caller.
--
-- Intentionally retained anonymous application APIs:
--   * search_items_pos(uuid, text, uuid, integer, integer)
--   * create_order_with_stock(text, uuid, uuid, text, text, text, jsonb,
--       numeric, numeric, numeric, text, text)
--   * search_products(text, integer) -- legacy storefront contract
--
-- PostGIS-owned C functions named st_estimatedextent are held for a separate
-- extension/schema review.

-- Prevent new postgres-owned functions from automatically inheriting the same
-- anonymous/PUBLIC execution exposure. Public APIs must opt in explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT (
        (
          p.proname = 'search_items_pos'
          AND pg_get_function_identity_arguments(p.oid) =
            'p_store_id uuid, p_query text, p_category_id uuid, p_limit integer, p_offset integer'
        )
        OR (
          p.proname = 'create_order_with_stock'
          AND pg_get_function_identity_arguments(p.oid) =
            'p_order_number text, p_tenant_id uuid, p_store_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_notes text, p_delivery_slot text'
        )
        OR (
          p.proname = 'search_products'
          AND pg_get_function_identity_arguments(p.oid) =
            'search_query text, result_limit integer'
        )
        OR (
          l.lanname = 'c'
          AND p.proname = 'st_estimatedextent'
        )
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC',
      fn.signature
    );
  END LOOP;
END
$$;

-- Fail closed if a future signature mismatch would accidentally remove a
-- verified storefront API during replay.
DO $$
BEGIN
  IF NOT has_function_privilege(
    'anon',
    'public.search_items_pos(uuid,text,uuid,integer,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anonymous storefront search RPC grant is missing';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.create_order_with_stock(text,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anonymous storefront order RPC grant is missing';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.search_products(text,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Legacy anonymous storefront search RPC grant is missing';
  END IF;
END
$$;
