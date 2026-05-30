# Schema Authority

## Canonical Tables
- `public.items`: The single source of truth for all physical products.
- `public.stores`: The canonical representation of physical stores.
- `public.stock_levels`: Composite mapping of `(store_id, item_id)` to track available quantities.
- `public.users`: The primary user table containing role information.

## Compatibility Tables / Fields
- `public.users.auth_id`: Exists solely for backward compatibility with early RLS policies and RPCs. Enforced to exactly mirror `users.id`.
- `public.inventory_items`: This table is explicitly **DEPRECATED and REMOVED**. `items` should be used instead.

## Deprecated Paths
- Do not reference `inventory_items` in RPCs or Migrations.
- Do not use surrogate UUIDs for `users.id` that don't match `auth.users(id)`.

## Tenant & RLS Model
- Most core tables feature `tenant_id` mapping back to `public.tenants`.
- `tenant_id` was injected idempotently into tables like `stores`, `users`, and `stock_movements` during the foundation migration.
- RLS policies use `auth.uid()` mapped against `users.id` (or `users.auth_id`) to verify access.

## Migration Rules
- Use `CREATE TABLE IF NOT EXISTS` for all structural entities.
- Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` for expanding schemas.
- Use idempotent `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks for enumerations and types.
- Ensure that foreign key constraints can be applied incrementally without destructive drops.
