# Sync Remote Supabase Data To Local

Use this when the local Supabase stack is missing realistic data and you need to reproduce Supabase-related issues against a local copy.

This workflow is one-way:

- remote Supabase project -> local Supabase stack
- service-role API keys only
- merge/upsert by default

It does not modify the remote project.

## Required env vars

Set the remote project credentials in your shell or a local ignored env file:

```bash
export REMOTE_SUPABASE_URL="https://your-project-ref.supabase.co"
export REMOTE_SUPABASE_SERVICE_ROLE_KEY="your-remote-service-role-key"
```

Optional local overrides:

```bash
export LOCAL_SUPABASE_URL="http://127.0.0.1:54321"
export LOCAL_SUPABASE_SERVICE_ROLE_KEY="your-local-service-role-key"
```

If the local overrides are omitted, the script will try `supabase status -o env` first and then fall back to repo env values.

## Start local Supabase

```bash
supabase start
```

## Dry run

Check connectivity and row counts before writing anything:

```bash
npm run supabase:sync-remote-data -- --dry-run
```

## Merge selected tables into local

```bash
npm run supabase:sync-remote-data -- --tables=tenants,stores,users,categories,items,stock_levels,sales,sale_items,sale_payments
```

Default mode is merge/upsert. Existing local rows are preserved unless they share the same primary key as remote rows.

## Replace local table contents first

Only use this if you want the selected local tables to match remote data more closely:

```bash
npm run supabase:sync-remote-data -- --tables=tenants,stores,users,items,stock_levels --truncate
```

## Notes

- Never use anon keys for this script.
- Never point `LOCAL_SUPABASE_URL` at a non-local host.
- Sync related tables together. Pulling `sales` without `sale_items`, `sale_payments`, `stores`, or `users` can create an incomplete local reproduction.
- The local schema must already be compatible with the remote data.
