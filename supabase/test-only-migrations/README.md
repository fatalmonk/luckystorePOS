# Security-test-only migrations

SQL files in this directory record migrations applied only to the Security Tests project. The standard Supabase CLI workflow reads `supabase/migrations`; do not move these files there or include them in production deploys. Apply them only through a separately reviewed, target-specific test workflow.

Production migration sources belong in `supabase/migrations` and must match the versions and SQL recorded by the production project.

As checked on 2026-11-06, the Security Tests project's recorded SQL for the two preview-image migrations in this directory differs materially from these files. Its live `publish_item_image_if_current` and `sync_item_image_metadata` bodies match the recorded SQL. Do not replay these files or mark their versions repaired until the tenant and preview-host conditions are reviewed against the ledger and intended test policy. See `system-docs/audits/2026-11-06-supabase-egress-phase3-results.md` for the reconciliation evidence.
