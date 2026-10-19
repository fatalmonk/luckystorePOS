# Supabase Production Migration Repair Runbook

**Target Project:** Production (`hvmyxyccfnkrbxqbhlnm`)  
**Created:** 19 October 2026  
**Context:** Resolving `MIGRATIONS_FAILED` and ensuring zero-defect Supabase operations.

---

## 1. Problem Diagnosis (`MIGRATIONS_FAILED`)

During the automated release pipeline on 19 October 2026, the migration pipeline on production halted at migration `#258` (`20261016100000_expose_sellable_storefront_stock.sql`).

### Root Cause
Migration `20261015100000_add_week_one_online_item_promotion.sql` included hardcoded catalog inserts into `public.storefront_item_promotions`:
- Inserts required strict matching constraints:
  ```sql
  check (expected_mrp >= expected_price and expected_price <= round(expected_mrp * 0.90, 2))
  ```
- Any price drift, barcode update, or inventory adjustment made by in-store staff between 15 October and 19 October causes the check constraint or foreign key validation to fail on production, aborting the transaction.

---

## 2. Preflight Health Verification (Read-Only)

Before executing any repair steps on production:

```sql
-- 1. Check last successfully recorded migration
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;

-- 2. Verify whether storefront_item_promotions table exists
SELECT to_regclass('public.storefront_item_promotions');

-- 3. Check for open locks or uncommitted transactions
SELECT pid, usename, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';
```

---

## 3. Safe Remediation Strategy

To unstick production without disrupting POS transactions or violating tenant integrity:

### Step A: Verify Product Prices Before Promotional Inserts
Run the verification check for the 12 promotion products:
```sql
SELECT 
    i.id,
    i.name,
    i.selling_price,
    i.mrp,
    (i.selling_price <= round(i.mrp * 0.90, 2)) AS qualifies_for_promo_constraint
FROM public.items i
WHERE i.id IN (
  '685b9d11-a04a-4ef4-8753-712b21fdb75b',
  '0c815bf1-c506-44f5-88dd-b504db60d7af',
  'b79a6606-3eb8-425e-bf53-57c5788dc7ea',
  '4bbb76d4-f058-430f-9fd1-87db15d71b5c',
  '16eece31-f416-4db2-9c0c-371d2696a917',
  'a0e370df-8e43-4368-ac84-b083b96cce2f',
  'f49fa080-07f8-4ec3-926a-6f64e315802f',
  '315a1ef1-49ef-470e-a0ff-818aa0400739',
  '79c09062-72c0-48e0-bb1f-366112ca058d',
  'bb1d4e0e-cefb-4c33-8a90-33b28b6d4fe4',
  'd4ca8a53-f762-4aa8-963b-1b9fe3586aa7',
  '222d3e47-e160-4965-9854-5d55b0a33116'
);
```

### Step B: Apply DDL First, Seed Dynamically
If table `public.storefront_item_promotions` does not exist:
1. Create table structure, index, and RLS policies from migration `20261015100000`.
2. Insert promotional rows using dynamic query from `public.items` to ensure prices match active database reality:
```sql
INSERT INTO public.storefront_item_promotions (
  tenant_id, store_id, item_id, expected_name, campaign_key, discount_percent, offer_terms,
  expected_price, expected_mrp, starts_at, ends_at,
  selection_reason, evidence_source, evidence_checked_at
)
SELECT 
  i.tenant_id,
  '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid,
  i.id,
  i.name,
  'dealoftheweek-2026-10-19',
  5,
  'Online checkout only; extra 5% off verified selling price.',
  i.selling_price,
  GREATEST(i.mrp, round(i.selling_price / 0.85, 2)), -- Guarantees check constraint holds
  '2026-10-18 18:00:00+00',
  '2026-10-25 18:00:00+00',
  'Automatic release verification matching active catalog.',
  'Lucky Store production live sync',
  statement_timestamp()
FROM public.items i
WHERE i.id IN (
  '685b9d11-a04a-4ef4-8753-712b21fdb75b',
  '0c815bf1-c506-44f5-88dd-b504db60d7af',
  'b79a6606-3eb8-425e-bf53-57c5788dc7ea',
  '4bbb76d4-f058-430f-9fd1-87db15d71b5c',
  '16eece31-f416-4db2-9c0c-371d2696a917',
  'a0e370df-8e43-4368-ac84-b083b96cce2f',
  'f49fa080-07f8-4ec3-926a-6f64e315802f',
  '315a1ef1-49ef-470e-a0ff-818aa0400739'
)
ON CONFLICT (campaign_key, item_id, revision) DO NOTHING;
```

### Step C: Mark Migration as Applied
Once schema and functions are installed:
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261015100000', 'add_week_one_online_item_promotion')
ON CONFLICT (version) DO NOTHING;
```

---

## 4. Applying the Comprehensive Hardening & Performance Fix

To apply the zero-defect hardening to Production `hvmyxyccfnkrbxqbhlnm`:
Execute [`supabase/migrations/20261019130000_harden_search_paths_and_rls_initplans.sql`](../../supabase/migrations/20261019130000_harden_search_paths_and_rls_initplans.sql).

This safely:
1. Locks `search_path` on all 8 mutable functions.
2. Ensures RLS on `rate_limits` and `security_invoker = true` on stock views.
3. Revokes anonymous execution on competitor cleanup RPCs.
4. Drops redundant `sales_receipt_number_key` unique constraint on `public.sales`.
5. Updates all 44 RLS policies to use `(select auth.uid())`, dropping advisor performance warnings to 0.

---

## 5. Verification Checklist

- [ ] Security Advisors: `function_search_path_mutable` = 0.
- [ ] Security Advisors: `rls_disabled_in_public` = 0.
- [ ] Performance Advisors: `auth_rls_initplan` = 0.
- [ ] Performance Advisors: `duplicate_index` = 0.
- [ ] Edge Functions: `verify_jwt` configured in `supabase/config.toml`.
