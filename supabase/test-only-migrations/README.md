# Security-test-only migrations

SQL files in this directory record migrations applied only to the Security Tests project. The standard Supabase CLI workflow reads `supabase/migrations`; do not move these files there or include them in production deploys. Apply them only through a separately reviewed, target-specific test workflow.

Production migration sources belong in `supabase/migrations` and must match the versions and SQL recorded by the production project.
