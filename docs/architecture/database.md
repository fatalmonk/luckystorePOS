# Database Architecture

## Tenant Model
Defines multi-store isolation using `tenant_id`.

## Ownership Model
Defines user/store relationships.

## Naming Rules
Use `snake_case` for all tables, columns, and relations.

## UUID Rules
All primary keys and foreign keys use UUID generation strategy (`uuid_generate_v4()`).

## Timestamp Rules
All tables must include `created_at` and `updated_at` (timestamptz) updated via triggers.

## Soft Delete Rules
Use an `is_active` boolean or `archived_at` timestamp instead of deleting rows.

## Indexing Rules
Guidance for performant queries.