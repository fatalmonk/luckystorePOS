-- Migration: add_storefront_prefix_resolver
-- Purpose : Replace full-catalog UUID-prefix scans with a bounded indexed lookup.
-- Safety  : Additive only. Existing catalog v1/v2 RPCs are untouched.
--           No table grants, RLS policies or indexes are added.
-- Review  : SECURITY DEFINER is deliberate for parity with the deployed public
--           catalog RPCs (search_storefront_catalog / _v2). The function owner
--           must be the migration execution role, which already has the same
--           table-read privilege used by existing catalog functions. Do not
--           deploy without verifying owner, search_path and role grants on the
--           target Supabase project.
-- Rollback: DROP FUNCTION public.resolve_storefront_item_prefix_v1(uuid,text);
--           (safe while app is on the old code path; leave additive until all
--            callers are removed and separately approved for drop.)

BEGIN;

-- ─── Resolver function ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_storefront_item_prefix_v1(
  p_store_id uuid,
  p_prefix   text
)
RETURNS TABLE(item_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
-- Explicit empty search_path prevents search-path injection.
SET search_path = ''
AS $function$
DECLARE
  v_prefix text := lower(btrim(p_prefix));
  v_tenant uuid;
  v_public boolean;
  v_low    uuid;
  v_high   uuid;
BEGIN
  -- Reject null store, null/blank prefix, or non-hex / out-of-range prefix.
  -- Accepts 4–32 contiguous hex characters (case-insensitive after normalisation).
  IF p_store_id IS NULL
     OR v_prefix IS NULL
     OR v_prefix !~ '^[0-9a-f]{4,32}$'
  THEN
    RETURN;
  END IF;

  -- Resolve tenant and public-storefront flag for the requested store.
  -- COALESCE(…, true) preserves parity with the deployed catalog v1 and v2 RPCs:
  -- stores without an explicit is_public_storefront=false are treated as public.
  SELECT s.tenant_id,
         COALESCE((s.metadata->>'is_public_storefront')::boolean, true)
  INTO   v_tenant, v_public
  FROM   public.stores AS s
  WHERE  s.id = p_store_id;

  -- Reject unknown stores (v_tenant IS NULL) and non-public stores.
  IF v_tenant IS NULL OR v_public IS NOT TRUE THEN
    RETURN;
  END IF;

  -- Build UUID lower/upper bounds from the hex prefix.
  -- PostgreSQL accepts 32 unhyphenated hex digits as a UUID literal.
  -- Padding with '0' / 'f' gives the inclusive range that the existing
  -- items primary-key B-tree can satisfy without a text cast or LIKE.
  v_low  := rpad(v_prefix, 32, '0')::uuid;
  v_high := rpad(v_prefix, 32, 'f')::uuid;

  -- Return at most 2 candidates — enough for unique/ambiguous detection.
  -- Tenant and active-item checks mirror the catalog v1/v2 visibility contract.
  -- Stock is intentionally not filtered: a zero-stock or stock-missing active
  -- item is still a valid catalog entry (consistent with existing catalog RPCs).
  RETURN QUERY
    SELECT i.id
    FROM   public.items AS i
    WHERE  i.tenant_id = v_tenant
      AND  i.is_active IS TRUE
      AND  i.id >= v_low
      AND  i.id <= v_high
    ORDER  BY i.id
    LIMIT  2;
END;
$function$;

-- ─── Grants ──────────────────────────────────────────────────────────────────
-- Revoke default PUBLIC execute, then grant only to the roles that the existing
-- storefront catalog RPCs are callable by.
REVOKE ALL ON FUNCTION
  public.resolve_storefront_item_prefix_v1(uuid, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.resolve_storefront_item_prefix_v1(uuid, text)
TO anon, authenticated, service_role;

COMMIT;

-- Optional partial index (DO NOT apply without staging EXPLAIN evidence):
-- A partial index on (tenant_id, id) WHERE is_active IS TRUE could accelerate
-- the range scan when tenant cardinality is high and the active fraction is small.
-- The existing primary-key btree(id) is the baseline; add this only if measured
-- plans show a sequential scan on a large active partition.
--
-- CREATE INDEX CONCURRENTLY idx_items_active_tenant_id
--   ON public.items (tenant_id, id)
--   WHERE is_active IS TRUE;
