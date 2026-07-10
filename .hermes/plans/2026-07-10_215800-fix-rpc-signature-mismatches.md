# Fix RPC Signature Mismatches — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Restore the `search_items_pos` 5-param storefront contract, fix the `get_inventory_list_v2` `active` → `is_active` bug, and harden all remaining `active` references to `is_active`.

**Architecture:** Single corrective migration that overwrites the broken 2-param `search_items_pos` with the working 5-param version, fixes the `is_active` bug in `get_inventory_list_v2`, and adds a safeguard block to prevent future param-count regressions.

**Tech Stack:** PostgreSQL (Supabase), SQL migrations.

---

## Verified Context

### Issue 1 — `search_items_pos` Signature Overwritten (CRITICAL)

- **Storefront call site:** `apps/customer_storefront/app/lib/products.ts:68`
  ```js
  supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: q ?? '',
    p_category_id: categoryId && !categoryIds?.length ? categoryId : null,
    p_limit: limit + 1,
    p_offset: page * limit,
  })
  ```
- **Storefront expects fields:** `id`, `category`, `category_id`, `qty_on_hand`, `mrp`, `image_url`, `brand`, `sku`, `barcode`, `short_code`, `cost`, `group_tag`, `name`, `price`
- **Broken migration:** `supabase/migrations/20260612015717_ensure_rpc_functions.sql` drops the 5-param version and replaces it with a 2-param version returning only `item_id`, `name`, `price`, `stock`.
- **Working 5-param version:** Exists in `supabase/migrations/20260523000000_fix_pos_search_is_active.sql` (lines 17–71).

### Issue 2 — `get_inventory_list_v2` Uses `i.active` (CRITICAL)

- **File:** `supabase/migrations/20260626203613_get_inventory_list_v2.sql:63`
  ```sql
  WHERE i.active = true
  ```
- The `items` table column was renamed from `active` → `is_active` in `20260523000000_fix_pos_search_is_active.sql`. The v2 migration uses the old name and will fail or return zero rows.

### Issue 3 — Stale `i.active` References in Old Migrations (MEDIUM)

- **File:** `supabase/migrations/20260301000000_baseline_core_tables.sql` and others still reference `i.active`.
- These are historical baseline files; if ever re-run (e.g., fresh DB setup), they will break because the column no longer exists.

### Issue 4 — Categories Column `name` vs `category` (MEDIUM)

- **DB schema:** `categories.name` (confirmed from `20231117000000_bootstrap.sql:73`).
- **Storefront query:** `apps/customer_storefront/app/lib/products.ts:152` selects `category`:
  ```js
  .select('id, slug, category, emoji')
  ```
- This will return `undefined` for `category` since the column is `name`. The storefront already has a fallback (`c.slug ?? c.category`), but the `name` field is never fetched.
- **Admin portal:** `apps/admin_web/src/features/inventory/InventoryListPage.tsx:174` uses `c.name || c.category || ''` — works because `name` exists.

---

## Task 1: Fix `search_items_pos` — Restore 5-Param Version

**Objective:** Overwrite the broken 2-param `search_items_pos` with the correct 5-param version that returns all fields the storefront expects.

**Files:**
- Create: `supabase/migrations/20260710215800_fix_search_items_pos_signature.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Migration: Fix search_items_pos — restore 5-param storefront contract
-- Date: 2026-07-10
-- Issue: 20260612015717_ensure_rpc_functions.sql overwrote the 5-param version
--        with a 2-param version, breaking the customer storefront.
-- =============================================================================

-- Drop the broken 2-param version (if it exists)
DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid);

-- Restore the correct 5-param version
CREATE OR REPLACE FUNCTION public.search_items_pos(
  p_store_id    uuid,
  p_query       text        DEFAULT '',
  p_category_id uuid        DEFAULT NULL,
  p_limit       integer     DEFAULT 50,
  p_offset      integer     DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $func$
  SELECT jsonb_agg(row_to_json(r))
  FROM (
    SELECT
      i.id,
      i.sku,
      i.barcode,
      i.short_code,
      i.name,
      i.brand,
      COALESCE(i.mrp, i.price) AS mrp,
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.name        AS category,
      c.id          AS category_id,
      COALESCE(sl.qty, 0) AS qty_on_hand
    FROM public.items i
    LEFT JOIN public.stock_levels sl
           ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.categories c
           ON c.id = i.category_id
    WHERE i.is_active = true
      AND (
        p_query = '' OR
        i.name        ILIKE '%' || p_query || '%' OR
        i.brand       ILIKE '%' || p_query || '%' OR
        i.sku         ILIKE '%' || p_query || '%' OR
        i.short_code  ILIKE '%' || p_query || '%' OR
        i.barcode     ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    ORDER BY i.name ASC
    LIMIT p_limit OFFSET p_offset
  ) r;
$func$;

REVOKE ALL ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_items_pos(uuid,text,uuid,integer,integer) TO anon;
```

**Step 2: Verify migration syntax**

Run: `cat supabase/migrations/20260710215800_fix_search_items_pos_signature.sql | head -70`
Expected: Clean SQL, no syntax errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260710215800_fix_search_items_pos_signature.sql
git commit -m "fix(migrations): restore search_items_pos 5-param storefront contract"
```

---

## Task 2: Fix `get_inventory_list_v2` — `active` → `is_active`

**Objective:** Patch the `get_inventory_list_v2` migration to use `i.is_active` instead of `i.active`.

**Files:**
- Modify: `supabase/migrations/20260626203613_get_inventory_list_v2.sql:63`

**Step 1: Apply patch**

Replace:
```sql
        WHERE i.active = true
```
With:
```sql
        WHERE i.is_active = true
```

**Step 2: Verify**

Run: `grep -n "is_active" supabase/migrations/20260626203613_get_inventory_list_v2.sql`
Expected: Line 63 shows `i.is_active = true`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260626203613_get_inventory_list_v2.sql
git commit -m "fix(migrations): get_inventory_list_v2 uses is_active not active"
```

---

## Task 3: Harden `20260612015717_ensure_rpc_functions.sql` — Prevent Regression

**Objective:** Modify the existing `ensure_rpc_functions` migration so it does NOT drop the 5-param `search_items_pos`. This protects against re-running the migration.

**Files:**
- Modify: `supabase/migrations/20260612015717_ensure_rpc_functions.sql:29–49`

**Step 1: Replace the broken section**

Replace lines 29–49:
```sql
-- search_items_pos (2-param version - the correct one)
DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid);

CREATE OR REPLACE FUNCTION public.search_items_pos(p_query text, p_store_id uuid)
RETURNS TABLE (item_id uuid, name text, price numeric, stock integer)
...  -- the 2-param body
```

With a comment block and a safeguard:
```sql
-- search_items_pos
-- NOTE: The 5-param version (uuid,text,uuid,integer,integer) is the storefront contract.
--       DO NOT replace it with a 2-param version — that breaks apps/customer_storefront/app/lib/products.ts.
--       If the 5-param version is missing, apply migration 20260710215800_fix_search_items_pos_signature.sql.
--
-- Safeguard: only create the 2-param version if the 5-param one does NOT exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'search_items_pos'
      AND pg_get_function_arguments(p.oid) LIKE 'uuid%'
  ) THEN
    -- No 5-param version exists; create the minimal 2-param fallback.
    CREATE OR REPLACE FUNCTION public.search_items_pos(p_query text, p_store_id uuid)
    RETURNS TABLE (item_id uuid, name text, price numeric, stock integer)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
    AS $$
        SELECT i.id AS item_id, i.name, i.price, COALESCE(sl.qty, 0)::integer AS stock
        FROM items i
        LEFT JOIN stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
        WHERE i.is_active = true
          AND (i.name ILIKE '%' || p_query || '%' OR i.barcode = p_query OR i.sku = p_query)
        LIMIT 20;
    $$;
  END IF;
END $$;
```

**Step 2: Verify**

Run: `git diff supabase/migrations/20260612015717_ensure_rpc_functions.sql`
Expected: Only lines 29–49 changed; `DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid)` removed.

**Step 3: Commit**

```bash
git add supabase/migrations/20260612015717_ensure_rpc_functions.sql
git commit -m "fix(migrations): harden ensure_rpc_functions against search_items_pos regression"
```

---

## Task 4: Fix Storefront `fetchCategories` — Select `name` Instead of `category`

**Objective:** Update the storefront categories query to select the correct column `name` (not `category`).

**Files:**
- Modify: `apps/customer_storefront/app/lib/products.ts:152`

**Step 1: Apply patch**

Replace:
```js
      .select('id, slug, category, emoji')
```
With:
```js
      .select('id, slug, name, emoji')
```

Also update the mapping (line ~161) to use `c.name`:
Replace:
```js
      name: c.category,
```
With:
```js
      name: c.name,
```

**Step 2: Verify**

Run: `git diff apps/customer_storefront/app/lib/products.ts`
Expected: Two small changes — `select` field and `name` mapping.

**Step 3: Commit**

```bash
git add apps/customer_storefront/app/lib/products.ts
git commit -m "fix(storefront): fetchCategories selects correct name column"
```

---

## Task 5: Harden All Historical Migrations — `active` → `is_active` (Optional / Baseline)

**Objective:** Prevent old migrations from breaking if ever re-run on a fresh database. Replace `i.active` with `i.is_active` in all historical baseline files.

**Files:**
- Modify (targeted): `supabase/migrations/20260301000000_baseline_core_tables.sql` and any other pre-May-2025 migrations that still reference `i.active`.

**Step 1: Find all remaining `i.active` references**

Run:
```bash
grep -rn "i\.active\b" supabase/migrations/*.sql | grep -v "is_active"
```

**Step 2: Batch replace**

Replace `i.active` → `i.is_active` in every match.

**Step 3: Verify**

Run:
```bash
grep -rn "i\.active\b" supabase/migrations/*.sql | grep -v "is_active"
```
Expected: Zero matches.

**Step 4: Commit**

```bash
git add -u supabase/migrations/
git commit -m "fix(migrations): harden all historical migrations to use is_active"
```

---

## Verification Summary

| # | Check | Command |
|---|-------|---------|
| 1 | 5-param `search_items_pos` restored | `grep -A2 "CREATE OR REPLACE FUNCTION public.search_items_pos" supabase/migrations/20260710215800_fix_search_items_pos_signature.sql` |
| 2 | `get_inventory_list_v2` uses `is_active` | `grep "is_active" supabase/migrations/20260626203613_get_inventory_list_v2.sql` |
| 3 | `ensure_rpc_functions` no longer unconditionally drops 5-param version | `grep "DROP FUNCTION.*search_items_pos" supabase/migrations/20260612015717_ensure_rpc_functions.sql` — should return nothing |
| 4 | Storefront fetches `name` column | `grep "select.*name.*emoji" apps/customer_storefront/app/lib/products.ts` |
| 5 | No stale `i.active` references | `grep -rn "i\.active\b" supabase/migrations/*.sql \| grep -v "is_active"` — should return nothing |

---

## Risks & Tradeoffs

1. **Migration order:** `20260710215800` must run AFTER `20260612015717`. Since timestamps are sequential (July 10 > June 12), Supabase will apply it in the correct order.
2. **Fresh DB setup:** If someone runs all migrations from scratch, the `20260612015717` migration's safeguard block (Task 3) prevents the 2-param version from overwriting the 5-param one.
3. **Baseline bloat:** Task 5 touches large historical files. Only do this if fresh DB setup is a realistic concern.
4. **Rollback:** If the new migration fails, drop it and restore the 5-param version manually:
   ```sql
   DROP FUNCTION IF EXISTS public.search_items_pos(text, uuid);
   -- Then re-run the CREATE from 20260523000000_fix_pos_search_is_active.sql
   ```

---

## Execution Handoff

Plan complete and saved.

**Ready to execute using subagent-driven-development** — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
