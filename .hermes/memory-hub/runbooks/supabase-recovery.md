# Runbook: Supabase Recovery

## Connectivity Failure

### Symptom: Cannot connect to Supabase
1. Check network connectivity
2. Verify Supabase status at https://status.supabase.com
3. Check project URL in `.env.local`

### Symptom: Auth failure
1. Verify `VITE_SUPABASE_ANON_KEY` matches project
2. Check RLS policies haven't blocked access
3. Verify user exists in `auth.users`

## Local Stack Recovery

```bash
supabase stop
supabase start
```

**NEVER run against production/staging**:
```bash
# FORBIDDEN without explicit approval:
# supabase db reset
# supabase db push
# supabase migration repair
```

## Schema Drift Detection

1. Run migration replay in isolated Docker environment
2. Compare `schema-baseline.sql` vs `schema-after.sql`
3. Check governance baseline for unexpected hash changes

## RLS Emergency Check

```sql
-- Check for tables without RLS
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_policies WHERE schemaname = 'public'
  );
```
