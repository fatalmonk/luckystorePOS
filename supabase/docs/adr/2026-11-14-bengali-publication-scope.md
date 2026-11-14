# Bengali catalog translation publication scope

**Status:** Existing implementation contract verified for PR #634, 14 November 2026. This records current behavior; it does not authorize a future cross-store policy change.

## Decision recorded

Bengali item and category translations are **tenant-owned editorial records**, not store-owned publication records. The translation tables carry `tenant_id` and a unique entity-plus-locale identity; they contain no `store_id`. One approved Bengali translation is therefore shared between the tenant's public storefronts for the same catalog entity.

Publication is still conditional. The anonymous translation RLS predicate requires attributed review/publish state, a source-evidence snapshot matching the current canonical item/category, an active canonical entity, and at least one public storefront for the tenant. An individual mobile catalog request must separately provide an existing **public** `p_store_id`. The privileged RPC resolves its tenant from that store and restricts the catalog and stock joins to that tenant and requested store. Private stores must return an empty public catalog, even if another store in the tenant is public.

A translation must **not** cross tenant boundaries. This distinction is separate from sharing one tenant's published translation across that tenant's public stores.

## Verification

The transactional regression in `supabase/tests/bengali_translation_publication_test.sql` now creates a second public store and a private store in one tenant and asserts that only the public one exposes the shared Bengali publication via `search_storefront_mobile_catalog_v1`. The test also checks private-tenant isolation, attribution, evidence drift, draft/review/publish transitions, and disallowed mutations.

On 14 November 2026, migrations `20261113090000`, `20261113090001`, and `20261113090002` and this regression passed against a separate PostgreSQL 17.11 database initialized locally, including one run through Supabase CLI 2.118.0 `db push --db-url` pointed exclusively at a verified Unix socket. This does not constitute a hosted-project migration.

Both the dedicated test project and production project were inspected read-only before testing and neither contained the three migration versions.

## Future change

If distinct stores need different Bengali approval states, the model must be changed deliberately: add store-scoped publication ownership, scoped uniqueness, store-aware RLS and privileged RPC predicates, migration/backfill decisions and tests for the individual store. Do not approximate that requirement by relying on the existing tenant-wide predicate.

## Publication revocation freshness

The Bengali product detail route deliberately renders dynamically so that withdrawn or evidence-invalidated translations are checked on each request instead of relying on a time-based ISR page. This applies only to the publication-sensitive Bengali product route, not the entire storefront. Monitor request volume and database egress before considering cache optimization; any future cache must support immediate invalidation for review revocation and canonical evidence drift.

## Anonymous presentation fields and editorial privacy

The anonymous Data API grant is now column-scoped. Public translation reads may retrieve catalog identity, locale, review status, localized presentation fields and timestamps used by the storefront, but may **not** read `evidence_snapshot`, `reviewed_by`, `reviewed_at`, `published_by`, or `published_at`. The RLS predicate checks those private fields through the existing secured database function. The storefront publication reader deliberately requests only permitted public columns, with the database as the authoritative evidence/attribution gate. Authenticated staff retain tenant-scoped access for editorial review.

A public `SELECT *` is intentionally unsupported. Add new public fields to the column allowlist only after security review.

## Safe publication foreign-key rollout

The publication-hardening migration adds nullable reviewer/publisher UUID columns without inline foreign-key validation. New migrations `20261114122652` and `20261114122748` respectively add the four reviewer/publisher foreign keys as `NOT VALID` (enforcing future writes) and validate preexisting rows in a separate phase. Both phases set bounded lock and statement timeouts. The original hardening migration still includes PostgreSQL DDL that can obtain `AccessExclusiveLock`; this design reduces validation work inside that transaction but does **not** prove a zero-lock deployment. Check row counts, lock contention and migration duration on the dedicated test project before production rollout. Neither remote project was migrated during development.

The mobile catalog RPC additionally checks `tr.review_status = 'published'` in both translation joins, while preserving the trusted eligibility and details validators. This permits the published partial index to be considered; query-planner performance improvement is not claimed without `EXPLAIN` measurements.
