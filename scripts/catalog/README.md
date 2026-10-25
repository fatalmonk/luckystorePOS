# Inventory snapshot reconciliation

This utility compares exported inventory-sheet snapshots with a Supabase catalog snapshot. It is offline by default and read-only: it does not connect to Google Sheets or Supabase and has no remote write path.

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
