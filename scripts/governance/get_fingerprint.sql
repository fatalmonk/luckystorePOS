-- Database-side Environment Fingerprint Query (V2.1 - Rigorous + Casts)
-- Targets: Migrations, RPCs, Triggers, RLS, Indexes, Constraints, Enums, Extensions
-- Purpose: Ephemeral Governance Introspection

WITH migration_hash AS (
    SELECT md5(string_agg(version::text, ',' ORDER BY version)) as hash 
    FROM "supabase_migrations"."schema_migrations"
),
rpc_hash AS (
    SELECT md5(string_agg(p.proname::text || ',' || oidvectortypes(p.proargtypes)::text || ',' || pg_get_functiondef(p.oid)::text, ',' ORDER BY p.proname)) as hash
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
),
trigger_hash AS (
    SELECT md5(string_agg(t.tgname::text || ',' || c.relname::text || ',' || pg_get_functiondef(p.oid)::text, ',' ORDER BY t.tgname)) as hash
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.tgisinternal = false
),
rls_hash AS (
    SELECT md5(string_agg(schemaname::text || ',' || tablename::text || ',' || policyname::text || ',' || permissive::text || ',' || roles::text || ',' || qual::text || ',' || with_check::text, ',' ORDER BY schemaname, tablename, policyname)) as hash
    FROM pg_policies
    WHERE schemaname = 'public'
),
index_hash AS (
    SELECT md5(string_agg(schemaname::text || ',' || tablename::text || ',' || indexname::text || ',' || indexdef::text, ',' ORDER BY schemaname, tablename, indexname)) as hash
    FROM pg_indexes
    WHERE schemaname = 'public'
),
constraint_hash AS (
    SELECT md5(string_agg(conname::text || ',' || contype::text || ',' || conrelid::regclass::text || ',' || pg_get_constraintdef(oid)::text, ',' ORDER BY conname)) as hash
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
),
enum_hash AS (
    SELECT md5(string_agg(t.typname::text || ',' || e.enumlabel::text, ',' ORDER BY t.typname, e.enumsortorder)) as hash
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
),
extension_hash AS (
    SELECT md5(string_agg(extname::text || ',' || extversion::text, ',' ORDER BY extname)) as hash
    FROM pg_extension
),
schema_hash AS (
    SELECT md5(string_agg(table_name::text || ',' || column_name::text || ',' || data_type::text, ',' ORDER BY table_name, column_name)) as hash
    FROM information_schema.columns
    WHERE table_schema = 'public'
)
SELECT json_build_object(
    'migration_hash', (SELECT hash FROM migration_hash),
    'rpc_hash', (SELECT hash FROM rpc_hash),
    'trigger_hash', (SELECT hash FROM trigger_hash),
    'rls_hash', (SELECT hash FROM rls_hash),
    'index_hash', (SELECT hash FROM index_hash),
    'constraint_hash', (SELECT hash FROM constraint_hash),
    'enum_hash', (SELECT hash FROM enum_hash),
    'extension_hash', (SELECT hash FROM extension_hash),
    'schema_hash', (SELECT hash FROM schema_hash)
) as fingerprint;
