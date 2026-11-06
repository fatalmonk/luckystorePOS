# Security Tests ledger snapshots

These `.sql.snapshot` files are the exact single `statements[1]` strings recorded in `supabase_migrations.schema_migrations` on test project `grxxenvdhfwzafzyykgo`, read on 2026-11-06. They are historical evidence, not runnable migrations. Their versions are already recorded in that project.

Five snapshots have no matching migration source path in available repository history. The two preview-image snapshots have same-version files in the parent directory, but their SQL and tenant/preview-host conditions differ. Preserve both sides of that difference. Do not replay, rename, or mark either version repaired from these files.

Use a new, separately reviewed test-only forward migration for any behavior change. Verify the target project, SQL effect, tenant isolation, and relevant transactional tests before applying it. Do not copy these snapshots into `supabase/migrations` or deploy them to production.
