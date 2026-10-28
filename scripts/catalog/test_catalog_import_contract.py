import csv
import unittest

from scripts.catalog.catalog_import_contract import TEMPLATE_PATH, adapt_legacy_row, validate_batch


def batch_for(*rows):
    return {
        "contract_version": 1,
        "batch_id": "batch-test-001",
        "source": "synthetic-test",
        "rows": list(rows) or [
            {
                "source_row": 2,
                "product": {"sku": "SKU-001", "name": "Example product"},
                "stock": {"mode": "none"},
            }
        ],
    }


class CatalogImportContractTests(unittest.TestCase):
    def test_valid_product_only_batch_has_explicit_no_stock_intent(self):
        batch = batch_for()

        self.assertEqual(validate_batch(batch), [])
        self.assertEqual(batch["rows"][0]["stock"], {"mode": "none"})

    def test_stock_set_and_delta_are_valid_explicit_intents(self):
        batch = batch_for(
            {
                "source_row": 2,
                "product": {"sku": "SET-1", "name": "Set example"},
                "stock": {"mode": "set", "quantity": 0},
            },
            {
                "source_row": 3,
                "product": {"sku": "DELTA-1", "name": "Delta example"},
                "stock": {"mode": "delta", "quantity": -2},
            },
        )

        self.assertEqual(validate_batch(batch), [])

    def test_missing_sku_is_invalid(self):
        batch = batch_for()
        del batch["rows"][0]["product"]["sku"]

        self.assertTrue(validate_batch(batch))

    def test_duplicate_sku_or_barcode_within_authenticated_tenant_fails_closed(self):
        batch = batch_for(
            {"source_row": 2, "product": {"sku": "DUP-SKU", "name": "One"}, "stock": {"mode": "none"}},
            {"source_row": 3, "product": {"sku": "DUP-SKU", "name": "Two"}, "stock": {"mode": "none"}},
        )

        self.assertTrue(any("duplicate sku" in error.lower() for error in validate_batch(batch)))

        barcode_batch = batch_for(
            {"source_row": 2, "product": {"sku": "ONE", "name": "One", "barcode": "DUP"}, "stock": {"mode": "none"}},
            {"source_row": 3, "product": {"sku": "TWO", "name": "Two", "barcode": "DUP"}, "stock": {"mode": "none"}},
        )
        self.assertTrue(any("duplicate barcode" in error.lower() for error in validate_batch(barcode_batch)))

    def test_catalog_identifier_duplicates_are_scoped_to_trusted_tenant_context(self):
        batch = batch_for()
        catalog = [
            {"id": "item-other-tenant", "tenant_id": "tenant-b", "sku": "SKU-001", "barcode": None},
            {"id": "item-a", "tenant_id": "tenant-a", "sku": "SKU-001", "barcode": None},
            {"id": "item-b", "tenant_id": "tenant-a", "sku": "SKU-001", "barcode": "894000000001"},
        ]

        self.assertEqual(validate_batch(batch, catalog_rows=catalog, tenant_id="tenant-b"), [])
        self.assertTrue(any("ambiguous sku" in error.lower() for error in validate_batch(batch, catalog_rows=catalog, tenant_id="tenant-a")))

    def test_invalid_price_and_cost_are_rejected(self):
        batch = batch_for()
        batch["rows"][0]["product"].update(cost=-1, price=-0.01)

        self.assertTrue(validate_batch(batch))

    def test_unsafe_malformed_and_credential_bearing_image_urls_are_rejected(self):
        for url in ("javascript:alert(1)", "https:///missing-host.png", "https://user:pass@example.test/a.png?token=secret"):
            with self.subTest(url=url):
                batch = batch_for()
                batch["rows"][0]["image"] = {"kind": "url", "url": url}
                self.assertTrue(validate_batch(batch))

    def test_asset_image_requires_catalog_path_and_sha256(self):
        batch = batch_for()
        batch["rows"][0]["image"] = {
            "kind": "asset",
            "path": "data/catalog/images/example.webp",
            "sha256": "a" * 64,
        }
        self.assertEqual(validate_batch(batch), [])

        batch["rows"][0]["image"]["path"] = "data/catalog/images/../../secrets.txt"
        self.assertTrue(validate_batch(batch))

    def test_tenant_and_store_authorization_fields_are_not_allowed_in_batch(self):
        batch = batch_for()
        batch["rows"][0]["tenant_id"] = "untrusted"
        batch["rows"][0]["store_id"] = "untrusted"

        self.assertTrue(validate_batch(batch))

    def test_unsupported_contract_version_is_rejected(self):
        batch = batch_for()
        batch["contract_version"] = 2

        self.assertTrue(validate_batch(batch))

    def test_admin_template_adapter_preserves_headers_and_defaults_stock_to_none(self):
        source = {
            "Product Name": "Example product",
            "Sales Price (৳)": "0",
            "Purchase Price (৳)": "12.50",
            "Item Code (SKU)": "SKU / keep-case",
            "Barcode": "894000123456",
            "Image URL": "",
            "Category": "Grocery",
        }

        adapted = adapt_legacy_row("admin_template", source, source_row=2)

        self.assertEqual(adapted["row"]["product"]["sku"], "SKU / keep-case")
        self.assertEqual(adapted["row"]["product"]["price"], 0)
        self.assertEqual(adapted["row"]["product"]["cost"], 12.5)
        self.assertEqual(adapted["source_values"]["Purchase Price (৳)"], "12.50")
        self.assertEqual(adapted["row"]["stock"], {"mode": "none"})
        self.assertEqual(adapted["unsupported_fields"], [])

    def test_operational_adapter_maps_present_quantity_to_explicit_set(self):
        adapted = adapt_legacy_row(
            "operational",
            {
                "name": "Example product",
                "sku": "OP-1",
                "barcode": "894000123456",
                "stock_qty": "0",
                "store_code": "MAIN",
                "description": "Preserve for future adapter work",
            },
            source_row=4,
        )

        self.assertEqual(adapted["row"]["stock"], {"mode": "set", "quantity": 0})
        self.assertEqual(
            adapted["unsupported_fields"],
            [
                {"source_column": "description", "value": "Preserve for future adapter work"},
                {"source_column": "store_code", "value": "MAIN"},
            ],
        )
        self.assertEqual(validate_batch(batch_for(adapted["row"])), [])

    def test_unknown_operational_stock_intent_is_not_coerced_to_zero(self):
        adapted = adapt_legacy_row("operational", {"name": "Example", "sku": "OP-2", "stock_qty": ""}, source_row=2)

        self.assertEqual(adapted["row"]["stock"], {"mode": "none"})
        self.assertEqual(adapted["row"]["product"]["sku"], "OP-2")

    def test_canonical_csv_template_examples_keep_stock_intent_explicit(self):
        with TEMPLATE_PATH.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["stock_mode"], "none")
        self.assertEqual(rows[1]["stock_mode"], "set")
        self.assertEqual(rows[1]["stock_quantity"], "0")
        self.assertNotIn("tenant_id", rows[0])
        self.assertNotIn("store_id", rows[0])


if __name__ == "__main__":
    unittest.main()
