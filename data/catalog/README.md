# Catalog control plane

Supabase `public.items` owns product records and `public.stock_levels` owns stock by store. Cloudflare R2 owns runtime image bytes. This directory stores reviewed schemas, templates, source metadata, and batch provenance; it is not a second live catalog.

## Source inventory

Generate a deterministic, metadata-only source inventory from a local checkout:

```sh
PYTHONPATH=. python3 scripts/catalog/reconcile_inventory_snapshots.py \
  --source-inventory-root "$LUCKYSTORE_SOURCE_ROOT" \
  --r2-snapshot "$LUCKYSTORE_R2_METADATA" \
  --source-inventory-output data/catalog/source-inventory.json
```

Set `LUCKYSTORE_SOURCE_ROOT` to the checkout whose local staging files should be inventoried. This matters when a worktree does not contain ignored local data. The generator reads only the configured inventory, image, template, importer, tooling, migration, and image Worker paths. It records file paths, types, byte sizes, SHA-256 hashes, static caller references, classifications, and review notes. It does not copy source rows, make network calls, or mutate product, stock, URL, bucket, or object state.

`item_key` extracted from a `sku-named/` filename is a candidate only. It is not a live product match. Product joins require an exact unique item ID or tenant-scoped SKU/barcode from an approved snapshot; duplicate matches remain ambiguous. Product names and image similarity never authorize a join.

The optional R2 snapshot contains listing metadata only (keys, sizes, ETags, content types, and modification times); it does not contain object bytes. Omit `--r2-snapshot` when no reviewed local metadata snapshot is available. The API ETag is not treated as SHA-256. The report never infers a bucket from credentials; the snapshot must name the configured binding and bucket. External URLs are sanitized to omit query strings and fragments; old object keys are preserved verbatim after URL decoding.

`source-inventory.json` contains metadata only. Do not add raw inventory exports, credentials, or image binaries here. Locally managed product images belong under the Git-ignored `data/catalog/images/` directory after the image-library review.

The current read-only reconciliation snapshot is under ignored `batches/legacy-reconciliation/`. Its per-item CSV strips URL query strings and fragments and compares `items.image_key` and URL paths with the recorded R2 key listing. The source-image CSV records exact filename-stem SKU candidates for review; because those source rows lack verified tenant/item IDs, none is an approved mapping. The original listing has no SHA-256. A follow-up read-only check on 2026-10-28 fetched and hashed the 416 product keys not referenced by current `items.image_key` values or URL paths; `r2-candidate-review.csv` records these hashes alongside R2 cache metadata. It found 345 distinct hashes (71 excess copies within exact-hash groups); 349 candidates still have an unexpired one-year cache directive and 67 have no cache directive recorded. This does not verify other URL, code, campaign, or retention references, so `delete_approved` remains false for every object. No URL, key, or object was changed, and the proposed backfill list is empty until unresolved references are reviewed.

`batches/legacy-reconciliation/image-disposition-report.md` records the conservative local-file and R2 disposition. All source aliases and R2 candidates remain retained because exact mappings, code/campaign references, and retention checks are incomplete; the report authorizes no deletions.

`batches/legacy-reconciliation/r2-disposition-report.md` reconciles the read-only R2 key/hash and item-reference snapshots. It retains all 1,067 product-prefix objects, including 416 direct-reference candidates, because old-URL/code/campaign references and cache/retention requirements are not cleared.

`image-manifest.csv` is the tracked metadata index for 844 source aliases. The ignored `images/` directory contains 677 unique hash-verified copies; 80 exact duplicate groups retain all source paths in the manifest. Per-row `item_id` is blank unless an exact item mapping is verified; `reference_status` and `reference_files` record bounded repository text-scan clues; `disposition` is `unresolved` until exact mapping and usage review support a decision. The scan found filename terms for 29 aliases, SKU-only terms for 515, and no name/SKU term for 300. These are review signals, not proof of image use or orphan status. See `batches/legacy-reconciliation/image-disposition-report.md` for scope and limitations.

The 2026-10-28 live reference check found 651 of 1,067 product objects referenced by item keys or current image URL paths. The 416 remaining candidates have byte hashes in `r2-candidate-review.csv`; deletion remains unapproved because code/campaign references and full retention requirements are not cleared.

## Target batch layout

```text
data/catalog/
  contracts/                 # versioned validation schema
  templates/                 # canonical input template
  images/                    # ignored local bytes; manifest holds metadata
  batches/<batch-id>/         # provenance, preview, and later authorized report
```

Batch files describe intent and evidence. They do not authorize live writes. A live batch requires separate review of its environment, authenticated tenant/store, bucket, exact mapping, and intended changes.

## Catalog import v1 contract

`contracts/catalog-import-v1.schema.json` defines the batch envelope and its product, stock, and image fields. Product-only rows must say `stock: {"mode":"none"}`. Stock changes must explicitly use `set` or `delta`; zero is a valid set quantity. `requested_store_id` is only a UI selection and must be verified against the authenticated user server-side. `tenant_id` and `store_id` are not accepted in the batch or rows. SKUs are preserved as provided; the contract imposes no universal SKU pattern.

The canonical CSV template is `templates/catalog-import-v1.csv`. It is a flat editing adapter for the nested JSON batch contract and deliberately has no tenant or store authorization columns. `scripts/catalog/catalog_import_contract.py` validates batches and adapts the existing formats without writing to Supabase or storage.

The admin product importer sends v1 `preview` and `apply` operations to the authenticated `import-inventory` Edge Function. Apply requires the exact approved preview hash and an idempotency key. The server derives the tenant from the verified user profile, checks any requested store against that tenant and the user's store scope, and persists per-row outcomes for safe retries. Product-only rows use `stock: {"mode":"none"}` and cannot change `stock_levels`.

Image attachments use the multipart v1 envelope (`operation`, `batch`, and optional `image_<source_row>` WebP file parts). Attachments are validated in memory before preview; the preview hash includes each attachment SHA-256. Apply requests a one-use ticket from `issue-image-upload-ticket`, writes only through the configured Cloudflare Worker, and publishes through `publish_item_image_if_current`. Keys are tenant-scoped and deterministic for an idempotent row/content pair, so retry reuses the same immutable object. A failed CAS reports the candidate key and retains the object; cleanup is a separate verified operation. New attachments must already be WebP and no larger than 10 MiB.

### Existing CSV adapters

The admin template headers remain `Product Name`, `Sales Price (৳)`, `Purchase Price (৳)`, `Item Code (SKU)`, `Barcode`, `Image URL`, and `Category`. Example input:

```text
Product Name=Example product; Sales Price (৳)=0; Purchase Price (৳)=12.50; Item Code (SKU)=SKU / keep-case; Barcode=894000123456; Image URL=; Category=Grocery
```

It normalizes to `source_row: 2`, product `{sku: "SKU / keep-case", name: "Example product", barcode: "894000123456", category: "Grocery", cost: 12.5, price: 0}`, and stock `{mode: "none"}`. The adapter also returns the exact source values (including the original `"12.50"`) and any unsupported fields. A blank or missing stock value never becomes an implicit stock write.

The operational adapter preserves its `name,barcode,sku,...,stock_qty,store_code,image_url` headings. For example, `name=Example product`, `sku=OP-1`, and `stock_qty=0` normalize to an explicit `set` of zero. `store_code` is returned in `unsupported_fields` for review; it is never used to authorize a store. Other unsupported source columns and their original values are surfaced instead of silently discarded. Optional legacy columns such as description, supplier, batch code, expiry date, short code, and group tag remain unsupported until the contract is deliberately extended.

### Batch lifecycle

1. Capture the approved source under `batches/<batch-id>/source.csv`; keep live exports out unless their contents are reviewed and approved for version control.
2. Normalize to the v1 contract and record any unsupported columns without dropping their source values.
3. Resolve product rows only by exact item ID or unique exact SKU/barcode in the authenticated tenant. Keep duplicates and missing matches unresolved for human review.
4. Record image provenance and exact item/SKU mapping in `image-map.csv`; verify each local asset against `checksums.sha256` before preview.
5. Store the read-only preview and its reviewed decisions in `preview.json`. Both v1 JSON preview and legacy multipart `dry_run=true` are read-only; legacy preview processes the complete CSV in one request and does not create resumable import rows.
6. Create `apply-report.json` only after the exact batch, environment, tenant/store, and intended changes receive separate execution authorization.

`staging/` and `batches/` are Git-ignored by `data/catalog/.gitignore`. Never put credentials or service keys in batch files. Commit reviewed schemas, templates, and sanitized metadata only.

### Canary monitoring and cleanup gate

Before expanding a canary, retain a bounded observation report with the UTC window and sources queried. Count importer preview/apply outcomes, upload-ticket responses, image-publication successes and conflicts, ambiguous/duplicate rows, and missing-image responses; explain each non-2xx result from correlated evidence. Exercise image GETs separately and record status, MIME type, and byte length. A short pilot-driven window establishes connectivity only, not sustained reliability; require a longer clean window before expansion or retiring adapters.

The 24-hour Security Tests log sample for 2026-10-27 19:53–2026-10-28 19:53 UTC showed importer 15 POST/200 and 3 POST/500, upload tickets 4 POST/200, and image publication 1 POST/200, 2 POST/409, and 1 POST/500. A sanitized function log identifies the publish 500 as PostgreSQL `Invalid tenant image publication metadata`; the preview-host and preview-key test migrations were applied afterward. The two 409s fall between those fixes, but request logs do not show whether CAS failed or post-publish metadata confirmation returned 409. The three importer 500s have no matching batch/import-run rows or diagnostic error log. All three unlinked/linked fixture objects serve identical valid WebP bytes and remain as-is. This sample includes only minutes after successful publication and is not a sustained clean window; rollout expansion remains NO-GO. Corrected function-edge metadata shows importer requests used macOS Chrome; five successful POSTs carried a `supabase-js` web client header, while the remaining successes and all 500s did not. This suggests browser usage but cannot identify an exact code caller or prove Flutter is unused. Keep adapters. The follow-up `function_edge_logs` query for 19:53–20:21 UTC had no requests, only a short no-traffic interval. Detailed evidence is in the ignored `batches/security-test-preview-20261028/pilot-validation-report.md`.

Production readiness is tracked in `tasks/inventory-catalog-consolidation/production-readiness.md`. Production `import-inventory` v55 now includes v1 preview; its legacy branch still uploads attachments before the legacy dry-run guard, so do not use that branch for image dry-runs. The exact product-only v1 preview reads catalog rows only and requires an authenticated production caller, but no migration. The core audit/apply and image-CAS migrations are required for later writes. Preview-only Security Tests migrations are excluded.
