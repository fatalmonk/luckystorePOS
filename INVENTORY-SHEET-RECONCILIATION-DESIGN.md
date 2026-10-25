# Inventory sheet reconciliation design

## Intent

Build a repeatable, report-only audit of `LS-inventory-01` and `Copy of LS-inventory-01` against the connected Lucky Store Supabase catalog. The report should show which source agrees with the database by field and identify records that need human review. This addresses the user's request to find the key differences and determine which sheet is the more current database match.

## Goals and boundaries

- Compare records by Supabase item ID when present, then by unique exact SKU; use normalized name and brand only to propose candidate matches.
- Report row counts, unmatched records, duplicate keys, SKU/name/brand/category/price disagreements, and timestamp freshness where both sources have row timestamps.
- Treat Supabase as the current catalog reference for this comparison while making clear that database agreement is not proof that a catalog value is factually correct.
- Keep the utility read-only: no Sheets writes, Supabase mutations, image uploads, catalog imports, or automatic corrections.
- Keep source snapshots and evidence provenance visible in the report; do not claim row-level freshness for the main sheet because it has no row timestamp.
- Preserve TypeSafe as an optional semantic candidate reviewer for unresolved name/brand matches, not as an authority to merge or change products. Require explicit opt-in; include only the bounded candidate fields; label its output as inferred and require human review.

## Approaches considered

1. **Direct Google Sheets and Supabase API client.** This could fetch current records in one command, but it would add credential handling and duplicate connected integrations already available in the user's environment.
2. **Deterministic local snapshot reconciliation with optional TypeSafe review — recommended.** Read connector-exported JSON snapshots, match exact identifiers in code, and write a local JSON/Markdown report. It is reproducible, testable without network access, and keeps the TypeSafe call limited to ambiguous candidate pairs.
3. **AI-first full-catalog matching or auto-sync.** This could find fuzzy relationships, but would risk false joins and silently mutate inventory/catalog data. It conflicts with the report-only audit goal and is excluded.

## Source findings informing the design

Observed 2026-10-25 from the connected Sheets and Supabase integrations:

- `LS-inventory-01`: 573 non-empty data rows.
- `Copy of LS-inventory-01`: 578 non-empty data rows.
- Supabase: 684 active item rows.
- 573 copied-sheet row IDs matched active Supabase items. Among these, copied SKU matched in 554 rows, name in 562, brand in 573, price in 565, and category ID in 528. Seventy-seven matched rows differed in at least one of those fields.
- The copied sheet's `updated_at` predates Supabase for 533 ID-matched records; 40 records did not yield comparable timestamps. The Google Drive file was modified at 2026-10-25 17:45:56 UTC, but that is file-level metadata and cannot establish freshness of each main-sheet row.
- Main-sheet rows had 555 unique exact-SKU matches to Supabase. Within those matches, name matched in 187, brand in 498, price in 535, and category label in 253. This makes the copy a better categorical snapshot of the live database, while its row timestamps show it is stale. The main sheet has no row-level timestamp, so there is no defensible single winner for overall freshness.

These are snapshot observations, not an endorsement of every database value; each disagreement should retain both values and source provenance.

## Implementation plan after approval

- Add a small Python CLI under `scripts/catalog/` that accepts JSON snapshots for the two sheets and Supabase, validates their headers and fields, performs deterministic ID/SKU matching, and emits a structured report with observed versus inferred match status.
- Include optional TypeSafe candidate resolution only behind an explicit flag and only for unresolved candidates. Reuse the existing TypeSafe client and key resolution; never log credentials or send complete catalog rows. Do not allow the model result to update data.
- Add standard-library unit tests for exact matching, duplicate SKUs, field disagreements, missing timestamps, candidate labeling, invalid input, and the invariant that the tool never writes to remote services.
- Document the connector snapshot shape and a sample invocation in a focused README. No dependencies or credentials are required for the deterministic mode.

## Anti-goals and remaining choices

- No Sheets/Supabase changes or product corrections.
- No claim that a higher match count proves factual accuracy.
- No autonomous use of semantic matches for SKU, category, price, stock, image, or product-name changes.
- The audit will produce a field-level comparison rather than a forced overall “newest sheet” label, because the main tab lacks row timestamps and the copied tab is demonstrably behind the database on many records.
