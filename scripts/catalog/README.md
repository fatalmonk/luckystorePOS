# Inventory snapshot reconciliation

This utility compares exported inventory-sheet snapshots with a Supabase catalog snapshot. It is offline by default and read-only: it does not connect to Google Sheets or Supabase and has no remote write path.

## Metadata-only source inventory

To classify configured local source files and static import/image callers, run:

```sh
PYTHONPATH=. python3 scripts/catalog/reconcile_inventory_snapshots.py \
  --source-inventory-root "$LUCKYSTORE_SOURCE_ROOT" \
  --r2-snapshot /path/to/read-only-r2-metadata.json \
  --source-inventory-output data/catalog/source-inventory.json
```

The output is deterministic and contains paths, file formats, byte sizes, SHA-256 hashes for local files, static caller paths, authority labels, and migration notes. It does not include inventory row values or image bytes. Use the checkout that contains ignored local staging data as the root. The report makes no remote calls; R2 listing metadata remains `not_supplied` unless a separate read-only snapshot is reviewed and supplied. R2 ETags are recorded separately and are not claimed as SHA-256.

## Catalog import v1 contract

`data/catalog/contracts/catalog-import-v1.schema.json` is the canonical batch schema. Validate a JSON batch and normalize one legacy CSV row offline with:

```python
from scripts.catalog.catalog_import_contract import adapt_legacy_row, validate_batch

adapted = adapt_legacy_row("admin_template", source_row, source_row=2)
errors = validate_batch({
    "contract_version": 1,
    "batch_id": "reviewed-batch-id",
    "source": "admin_template",
    "rows": [adapted["row"]],
})
```

Use `"operational"` for the existing `import-inventory` CSV format. Both adapters preserve source row numbers, leave product-only stock at `none`, and return unsupported columns with their original values. `store_code` is never treated as authorization; a caller must supply a separately selected `requested_store_id`, which the server must verify. `validate_batch` is local structural/identifier validation only and does not authorize writes.

Run the contract and reconciliation suites with:

```sh
python3 -m unittest scripts.catalog.test_catalog_import_contract
PYTHONPATH=. python3 scripts/catalog/test_reconcile_inventory_snapshots.py
```

## Tests

Run the unit tests from the repository root:

```sh
PYTHONPATH=. python3 scripts/catalog/test_reconcile_inventory_snapshots.py
```

## Snapshot formats

Save the Google Sheets connector's `structuredContent` for each bounded range as JSON. The sheet snapshot must contain its header row and rows under `values`, for example:

```json
{
  "range": "'LS-inventory-01'!A1:J700",
  "majorDimension": "ROWS",
  "values": [
    ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
    ["Example Product", "Tea & Coffee", "Example Brand", 10, "TC-EXAMPLE-001"]
  ]
}
```

The Supabase snapshot is a JSON array of rows, or an object containing that array under `rows`. Keep the active/inactive scope consistent with the audit question. Include `id`, `sku`, `name`, `brand`, `category`, and `price`; `category_id`, `updated_at`, and `is_active` are compared when supplied.

## Run a deterministic comparison

```sh
python3 scripts/catalog/reconcile_inventory_snapshots.py \
  --master /path/to/master-sheet.json \
  --copy /path/to/copied-sheet.json \
  --supabase /path/to/supabase-items.json \
  --output /path/to/inventory-audit.json
```

Rows match only by a unique Supabase item ID or unique exact SKU. Duplicate keys remain ambiguous. Name and brand do not authorize a join in deterministic mode. The report includes row coverage, duplicate keys, per-field matches and differences, and freshness only when both matched rows have parseable timestamps. Missing timestamps are reported as unknown.

## Optional TypeSafe candidate review

Use this only when a human wants semantic suggestions for unresolved rows:

```sh
python3 scripts/catalog/reconcile_inventory_snapshots.py \
  --master /path/to/master-sheet.json \
  --copy /path/to/copied-sheet.json \
  --supabase /path/to/supabase-items.json \
  --output /path/to/inventory-audit.json \
  --typesafe-candidates --typesafe-limit 25
```

This requires the existing TypeSafe client and `TYPESAFE_API_KEY` in its supported local credential source. At most 25 candidate pairs are sent by default; the hard maximum is 50. The request contains only the bounded candidate's SKU, product name, brand, and price for each side, plus the Supabase category when available. Internal database IDs are excluded. No images, full rows, descriptions, stock values, or sheet exports are sent. TypeSafe responses are marked `inferred_typesafe` and require human review. They never alter the deterministic match, sheet, or database.

If TypeSafe is unavailable or a request fails, the report records a sanitized status/error type and still preserves the deterministic comparison. The provider's error text and credentials are not copied into the report.

## Report interpretation

Supabase agreement measures consistency with the selected database snapshot, not whether a price, package size, SKU, image, or category is factually correct. Verify disagreements against authoritative product evidence before changing a catalog. A spreadsheet file modification time is not a row-level freshness signal.

## Product image library

`data/catalog/image-manifest.csv` is metadata-only. It records original paths, hashes, exact duplicate groups, and proposed collision-safe filenames; `item_key` and filename-derived SKU values remain candidates until a tenant-scoped item match is verified. Source bytes must be copied and re-hashed before any source deletion. Run `python3 -m unittest scripts.catalog.test_product_image_library` and `python3 scripts/catalog/check_no_tracked_product_images.py` to validate the manifest rules and reject tracked product images in the known packshot paths. Application logos and UI images outside those paths remain allowed.
