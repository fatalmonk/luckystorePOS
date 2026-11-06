# Security-test-only migrations

SQL files in this directory record migrations applied only to the Security Tests project. The standard Supabase CLI workflow reads `supabase/migrations`; do not move these files there or include them in production deploys. Apply them only through a separately reviewed, target-specific test workflow.

Production migration sources belong in `supabase/migrations` and must match the versions and SQL recorded by the production project.

The SQL recorded for the two October preview-image migrations differs materially from their same-version files in this directory. Exact applied strings are preserved as inert evidence in `ledger-snapshots/`. Do not replay the October files or mark their versions repaired.

On 2026-11-06, six separately verified forward migrations were applied only to the Security Tests project:

- `20261106024618_restrict_preview_image_cas_to_test_tenant.sql`: reject preview-host publication for other tenants and URL/checksum metadata without an image key.
- `20261106024841_fix_catalog_import_null_stock_mode_test.sql`: reject null stock mode; function body matches the reviewed production migration.
- `20261106025141_conservative_competitor_matching_test.sql`: bring conservative matcher functions and grants to the reviewed production definition.
- `20261106025547_restrict_preview_image_trigger_to_cas_test.sql`: reject direct preview URL inserts and non-test-tenant preview URLs.
- `20261106030019_guard_preview_host_variants_test.sql`: also recognize mixed-case preview hostnames and the default HTTPS port in direct writes.
- `20261106040500_preserve_preview_image_key_on_unrelated_update.sql`: preserve existing image_key on unrelated product updates when preview URL is unchanged, and reject empty-port or immediate query/fragment preview host variants.

These versions match the Security Tests migration ledger. The historical October SQL remains unchanged in the ledger. See `system-docs/audits/2026-11-06-supabase-egress-phase3-results.md` for verification and remaining differences.
