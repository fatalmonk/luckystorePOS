# LuckyStorePOS Mitigation Summaries

## M1: Port Mismatch
**When**: Running migration replay locally
**Check**: Is `DATABASE_URL` set? Is Supabase running on expected port?
**Fix**: `export DATABASE_URL="postgresql://postgres:***@127.0.0.1:54322/postgres"` before running replay
**Prevention**: Add port auto-detection to `replay.sh` or fail with explicit message about port mismatch

## M2: Legacy Field Drift
**When**: RPC failure with column not found, or eval harness static mode
**Check**: grep for legacy field names in changed files
**Fix**: Replace `product_id` with `item_id`, `qty` with `quantity`, `active` with `is_active`
**Prevention**: Add governance check for legacy field references in application code

## M3: RLS Regression
**When**: Permission denied after migration, or data invisible to legitimate user
**Check**: Run `supabase db reset` then verify all tables have RLS policies
**Fix**: Add missing RLS policy migration, or fix policy function reference
**Prevention**: Include RLS verification query in every table-creating migration

## M4: Orphan Privilege Accumulation
**When**: Audit confusion, unexpected access levels
**Check**: Run `npm run governance:check`
**Fix**: Long-term: create privilege consolidation migration. Short-term: baseline documents accepted orphans.
**Prevention**: Governance check catches new orphans on each migration PR.

## M5: SECURITY DEFINER Search Path
**When**: Security audit flags injection vulnerability
**Check**: `SELECT proname, prosecdef FROM pg_proc WHERE prosecdef = true AND proconfig IS NULL;`
**Fix**: Add `SET search_path = ''` to function definition
**Prevention**: Governance baseline tracks known instances. New functions must include search_path.

## M6: Queue Schema Drift
**When**: App restart with old queue file, or sync parse error
**Check**: Inspect queue file format in app documents directory
**Fix**: Startup invalidation logic already exists (v1 -> legacy_v1.json). Verify it triggers.
**Prevention**: Runtime test SOP 7.

## M7: Duplicate Replay
**When**: Concern about financial impact from double-posting
**Check**: Query by `client_transaction_id` for duplicate sales
**Fix**: Server-side idempotency exists via `inventory_movements.operation_id`. Verify `complete_sale` path.
**Prevention**: Execute SOP 4 with server-side SQL verification.

## M8: Eval Harness Staleness
**When**: Attempting to use eval scripts for operational proof
**Check**: Read eval script source for legacy column references
**Fix**: Update column names or explicitly exclude from proof claims
**Prevention**: CI check that eval scripts compile against current schema.
