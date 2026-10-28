import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reconcile_inventory_snapshots import (
    add_typesafe_reviews,
    build_source_inventory,
    classify_image_reference,
    load_snapshot,
    reconcile,
    reconcile_source_reference,
)


ROOT = Path(__file__).resolve().parents[2]


def sheet_snapshot(headers, rows):
    return {"values": [headers, *rows]}


class ReconcileInventorySnapshotsTests(unittest.TestCase):
    def setUp(self):
        self.master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [["Radhuni Cumin Powder 50 g", "Cooking", "Radhuni", 5, "SP-RAD-CUM-050G"]],
        )
        self.copy = sheet_snapshot(
            ["id", "sku", "name", "brand", "price", "category_id", "updated_at"],
            [["item-1", "SP-RAD-CUM-050G", "Radhuni Cumin Powder 50 g", "Radhuni", "5.00", "cat-cook", "2026-10-01T00:00:00Z"]],
        )
        self.database = [
            {
                "id": "item-1",
                "sku": "SP-RAD-CUM-050G",
                "name": "Radhuni Cumin Powder 50 g",
                "brand": "Radhuni",
                "category_id": "cat-cook",
                "category": "Cooking",
                "price": 5,
                "updated_at": "2026-10-02T00:00:00Z",
                "is_active": True,
            }
        ]

    def test_matches_copy_by_id_and_master_by_unique_sku_and_compares_decimal_prices(self):
        report = reconcile(self.master, self.copy, self.database)

        self.assertEqual(report["comparisons"]["copy"]["matches"][0]["match_method"], "id")
        self.assertEqual(report["comparisons"]["master"]["matches"][0]["match_method"], "sku")
        self.assertEqual(report["comparisons"]["copy"]["field_counts"]["price"]["matched"], 1)
        self.assertEqual(report["comparisons"]["copy"]["freshness_vs_supabase"]["older"], 1)
        self.assertEqual(report["comparisons"]["master"]["freshness_vs_supabase"]["unknown"], 1)

    def test_id_match_reports_sku_disagreement_instead_of_falling_back_to_sku(self):
        changed = [dict(self.database[0], sku="TC-RAD-CUM-050G")]
        report = reconcile(self.master, self.copy, changed)

        match = report["comparisons"]["copy"]["matches"][0]
        self.assertEqual(match["match_method"], "id")
        self.assertIn("sku", match["field_differences"])

    def test_category_label_matches_database_label_when_sheet_has_no_category_id(self):
        report = reconcile(self.master, self.copy, self.database)

        category = report["comparisons"]["master"]["matches"][0]["field_states"]["category"]
        self.assertEqual(category, "matched")

    def test_blank_required_cell_is_reported_as_unknown_instead_of_aborting(self):
        incomplete_master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [["Radhuni Cumin Powder 50 g", "", "Radhuni", 5, "SP-RAD-CUM-050G"]],
        )

        report = reconcile(incomplete_master, self.copy, self.database)

        match = report["comparisons"]["master"]["matches"][0]
        self.assertEqual(match["field_states"]["category"], "unknown")
        self.assertEqual(report["comparisons"]["master"]["matched_count"], 1)

    def test_duplicate_skus_are_reported_as_ambiguous(self):
        duplicate_master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [
                ["Radhuni Cumin Powder 50 g", "Cooking", "Radhuni", 5, "DUPLICATE"],
                ["Radhuni Cumin Powder 100 g", "Cooking", "Radhuni", 10, "DUPLICATE"],
            ],
        )
        duplicate_db = [dict(self.database[0], sku="DUPLICATE")]

        report = reconcile(duplicate_master, self.copy, duplicate_db)

        summary = report["comparisons"]["master"]
        self.assertEqual(summary["ambiguous_count"], 2)
        self.assertEqual(summary["matched_count"], 0)

    def test_invalid_snapshot_headers_fail_before_a_report_is_created(self):
        with self.assertRaisesRegex(ValueError, "missing required columns"):
            reconcile({"values": [["wrong", "headers"]]}, self.copy, self.database)

    def test_object_snapshot_missing_required_fields_fails(self):
        invalid_database = [{"id": "item-1", "sku": "SP-RAD-CUM-050G"}]
        with self.assertRaisesRegex(ValueError, "missing required columns"):
            reconcile(self.master, self.copy, invalid_database)

    def test_object_snapshot_duplicate_canonical_keys_fails(self):
        duplicate_obj = [
            {
                "id": "item-1",
                "sku": "SP-RAD-CUM-050G",
                "item code": "SP-RAD-CUM-050G",
                "name": "Radhuni Cumin Powder 50 g",
                "brand": "Radhuni",
                "category": "Cooking",
                "price": 5,
            }
        ]
        with self.assertRaisesRegex(ValueError, "duplicate columns"):
            reconcile(self.master, self.copy, duplicate_obj)

    def test_same_active_recognizes_numeric_zero_as_false(self):
        inactive_db = [dict(self.database[0], is_active=False)]
        copy_with_zero = sheet_snapshot(
            ["id", "sku", "name", "brand", "price", "is_active", "category_id"],
            [["item-1", "SP-RAD-CUM-050G", "Radhuni Cumin Powder 50 g", "Radhuni", "5.00", 0, "cat-cook"]],
        )
        report = reconcile(self.master, copy_with_zero, inactive_db)
        match = report["comparisons"]["copy"]["matches"][0]
        self.assertEqual(report["comparisons"]["copy"]["field_counts"]["is_active"]["matched"], 1)
        self.assertNotIn("is_active", match["field_differences"])

    def test_load_snapshot_rejects_malformed_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "broken.json"
            path.write_text("{", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "invalid JSON"):
                load_snapshot(path)

    def test_empty_sheet_snapshot_still_validates_headers(self):
        with self.assertRaisesRegex(ValueError, "missing required columns"):
            reconcile({"values": [["wrong", "headers"]]}, self.copy, self.database)

    def test_duplicate_database_skus_are_not_resolved_by_row_order(self):
        duplicated = [self.database[0], dict(self.database[0], id="item-2")]
        report = reconcile(self.master, self.copy, duplicated)

        self.assertEqual(report["comparisons"]["master"]["ambiguous_count"], 1)
        self.assertEqual(report["comparisons"]["master"]["matched_count"], 0)

    def test_malformed_sheet_rows_fail_instead_of_being_dropped(self):
        malformed = {"values": [self.master["values"][0], "not a row"]}

        with self.assertRaisesRegex(ValueError, "must be an array"):
            reconcile(malformed, self.copy, self.database)

    def test_duplicate_headers_are_rejected(self):
        malformed = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code", "SKU"],
            [],
        )

        with self.assertRaisesRegex(ValueError, "duplicate columns: sku"):
            reconcile(malformed, self.copy, self.database)

    def test_cli_writes_a_local_report_and_never_calls_remote_services(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            master_path = root / "master.json"
            copy_path = root / "copy.json"
            db_path = root / "supabase.json"
            output_path = root / "report.json"
            master_path.write_text(json.dumps(self.master), encoding="utf-8")
            copy_path.write_text(json.dumps(self.copy), encoding="utf-8")
            db_path.write_text(json.dumps(self.database), encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/catalog/reconcile_inventory_snapshots.py"),
                    "--master", str(master_path),
                    "--copy", str(copy_path),
                    "--supabase", str(db_path),
                    "--output", str(output_path),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output_path.is_file())
            self.assertEqual(json.loads(output_path.read_text(encoding="utf-8"))["schema_version"], 1)

    def test_typesafe_is_not_called_by_default(self):
        report = reconcile(self.master, self.copy, self.database)

        self.assertEqual(report["typesafe_reviews"]["status"], "not_requested")

    def test_opt_in_typesafe_reviews_are_labeled_as_inferred_and_review_only(self):
        unmatched_master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [["AMA Classic Coffee 1 g", "Tea & Coffee", "AMA", 85, "DE-AMA-GEN-1G"]],
        )
        database = [dict(self.database[0], sku="TC-AMA-CLS-075G", name="AMA Classic Coffee Sachet 0.75 g", brand="AMA")]
        report = reconcile(unmatched_master, self.copy, database)

        with patch("scripts.receipts.typesafe_client.TypeSafeClient.__init__", return_value=None), patch(
            "scripts.receipts.typesafe_client.TypeSafeClient.evaluate", return_value={"relationship": {"score": 0.8}}
        ) as evaluate:
            add_typesafe_reviews(report, database, limit=5)

        self.assertEqual(evaluate.call_count, 1)
        self.assertEqual(report["typesafe_reviews"]["status"], "completed")
        result = report["typesafe_reviews"]["results"][0]
        self.assertEqual(result["provenance"], "inferred_typesafe")
        self.assertTrue(result["review_required"])
        self.assertEqual(result["candidate"]["sheet"]["sku"], "DE-AMA-GEN-1G")
        self.assertTrue(report["read_only"])
        self.assertNotIn("id", evaluate.call_args.kwargs["state"]["database_candidate"])

    def test_typesafe_limit_is_bounded(self):
        report = reconcile(self.master, self.copy, self.database)

        with self.assertRaisesRegex(ValueError, "between 1 and 50"):
            add_typesafe_reviews(report, self.database, limit=51)

    def test_typesafe_failure_is_reported_without_copying_provider_error_text(self):
        unmatched_master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [["AMA Classic Coffee 1 g", "Tea & Coffee", "AMA", 85, "DE-AMA-GEN-1G"]],
        )
        database = [dict(self.database[0], sku="TC-AMA-CLS-075G", name="AMA Classic Coffee Sachet 0.75 g", brand="AMA")]
        report = reconcile(unmatched_master, self.copy, database)

        with patch("scripts.receipts.typesafe_client.TypeSafeClient.__init__", return_value=None), patch(
            "scripts.receipts.typesafe_client.TypeSafeClient.evaluate", side_effect=RuntimeError("private provider response")
        ):
            add_typesafe_reviews(report, database, limit=1)

        serialized = json.dumps(report)
        self.assertEqual(report["typesafe_reviews"]["status"], "failed")
        self.assertNotIn("private provider response", serialized)
        self.assertEqual(report["typesafe_reviews"]["results"][0]["error_type"], "RuntimeError")

    def test_non_json_typesafe_result_is_reported_as_sanitized_failure(self):
        unmatched_master = sheet_snapshot(
            ["Item Name", "Category", "Brand", "Sales Price", "Item Code"],
            [["AMA Classic Coffee 1 g", "Tea & Coffee", "AMA", 85, "DE-AMA-GEN-1G"]],
        )
        database = [dict(self.database[0], sku="TC-AMA-CLS-075G", name="AMA Classic Coffee Sachet 0.75 g", brand="AMA")]
        report = reconcile(unmatched_master, self.copy, database)

        with patch("scripts.receipts.typesafe_client.TypeSafeClient.__init__", return_value=None), patch(
            "scripts.receipts.typesafe_client.TypeSafeClient.evaluate", return_value=object()
        ):
            add_typesafe_reviews(report, database, limit=1)

        serialized = json.dumps(report, allow_nan=False)
        self.assertEqual(report["typesafe_reviews"]["status"], "failed")
        result = report["typesafe_reviews"]["results"][0]
        self.assertEqual(result["error_type"], "InvalidTypeSafeResult")
        self.assertNotIn("result", result)
        self.assertIn("InvalidTypeSafeResult", serialized)

    def test_no_candidate_rows_skip_typesafe_client_creation(self):
        report = reconcile(self.master, self.copy, self.database)

        with patch("scripts.receipts.typesafe_client.TypeSafeClient.__init__", side_effect=AssertionError("must not initialize")):
            add_typesafe_reviews(report, self.database)

        self.assertEqual(report["typesafe_reviews"]["status"], "no_candidates")

    def test_cli_does_not_create_report_when_input_is_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            master_path = root / "master.json"
            copy_path = root / "copy.json"
            db_path = root / "supabase.json"
            output_path = root / "report.json"
            master_path.write_text(json.dumps({"values": [["wrong"]]}), encoding="utf-8")
            copy_path.write_text(json.dumps(self.copy), encoding="utf-8")
            db_path.write_text(json.dumps(self.database), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/catalog/reconcile_inventory_snapshots.py"),
                    "--master", str(master_path),
                    "--copy", str(copy_path),
                    "--supabase", str(db_path),
                    "--output", str(output_path),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 2)
            self.assertFalse(output_path.exists())
            self.assertIn("missing required columns", result.stderr)

    def test_cli_refuses_to_overwrite_an_input_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            master_path = root / "master.json"
            copy_path = root / "copy.json"
            db_path = root / "supabase.json"
            master_contents = json.dumps(self.master)
            master_path.write_text(master_contents, encoding="utf-8")
            copy_path.write_text(json.dumps(self.copy), encoding="utf-8")
            db_path.write_text(json.dumps(self.database), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/catalog/reconcile_inventory_snapshots.py"),
                    "--master", str(master_path),
                    "--copy", str(copy_path),
                    "--supabase", str(db_path),
                    "--output", str(master_path),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 2)
            self.assertIn("must not overwrite", result.stderr)
            self.assertEqual(master_path.read_text(encoding="utf-8"), master_contents)

    def test_source_reference_maps_by_unique_exact_sku(self):
        result = reconcile_source_reference(
            {"source_path": "catalog-images/sku-named/EXACT-SKU.webp", "sku": "EXACT-SKU", "tenant_id": "tenant-a"},
            [{"id": "item-1", "sku": "EXACT-SKU", "tenant_id": "tenant-a"}],
        )

        self.assertEqual(result["match_status"], "matched")
        self.assertEqual(result["match_method"], "sku")
        self.assertEqual(result["item_id"], "item-1")

    def test_duplicate_sku_within_tenant_remains_ambiguous(self):
        rows = [
            {"id": "item-1", "sku": "DUPLICATE", "tenant_id": "tenant-a"},
            {"id": "item-2", "sku": "DUPLICATE", "tenant_id": "tenant-a"},
        ]
        result = reconcile_source_reference({"sku": "DUPLICATE", "tenant_id": "tenant-a"}, rows)

        self.assertEqual(result["match_status"], "ambiguous")
        self.assertIsNone(result["item_id"])

    def test_same_sku_in_different_tenants_maps_only_with_tenant_scope(self):
        rows = [
            {"id": "item-a", "sku": "SHARED", "tenant_id": "tenant-a"},
            {"id": "item-b", "sku": "SHARED", "tenant_id": "tenant-b"},
        ]
        result = reconcile_source_reference({"sku": "SHARED", "tenant_id": "tenant-b"}, rows)

        self.assertEqual(result["match_status"], "matched")
        self.assertEqual(result["item_id"], "item-b")

    def test_old_image_prefix_is_preserved_as_a_legacy_object_key(self):
        result = classify_image_reference("https://cdn.example.test/item-images/tenant-a/item.webp")

        self.assertEqual(result["reference_kind"], "legacy_remote")
        self.assertEqual(result["object_key"], "item-images/tenant-a/item.webp")
        self.assertEqual(result["status"], "legacy")

    def test_legacy_product_prefixes_report_the_parser_rule_and_ignore_query_strings(self):
        cases = [
            ("https://cdn.example.test/product-images/SKU-1.webp?cache=3", "product-images/SKU-1.webp", "product-images-prefix"),
            ("https://cdn.example.test/products/tenant-a/SKU-2.webp?token=secret", "products/tenant-a/SKU-2.webp", "products-prefix"),
            ("https://cdn.example.test/brands/ama/products/SKU-3.webp", "brands/ama/products/SKU-3.webp", "brand-prefix"),
        ]
        for url, expected_key, expected_rule in cases:
            with self.subTest(url=url):
                result = classify_image_reference(url)
                self.assertEqual(result["object_key"], expected_key)
                self.assertEqual(result["parser_rule"], expected_rule)
                self.assertNotIn("secret", json.dumps(result))

    def test_bare_legacy_object_keys_are_not_misclassified_as_local_files(self):
        result = classify_image_reference("products/legacy-sku.webp")
        self.assertEqual(result["reference_kind"], "legacy_object_key")
        self.assertEqual(result["object_key"], "products/legacy-sku.webp")
        self.assertEqual(result["parser_rule"], "products-prefix")

    def test_empty_or_missing_r2_reference_stays_unresolved_without_network_access(self):
        for reference in (None, ""):
            result = classify_image_reference(reference)
            self.assertEqual(result["status"], "unresolved")
            self.assertFalse(result["exists"])
        missing = classify_image_reference(
            "products/tenant-a/not-in-snapshot.webp",
            known_object_keys={"products/tenant-a/present.webp"},
        )
        self.assertEqual(missing["status"], "unresolved")
        self.assertFalse(missing["exists"])

    def test_external_image_url_is_recorded_without_fetching(self):
        result = classify_image_reference("https://images.example.test/product.webp?token=private#preview")

        self.assertEqual(result["reference_kind"], "external_url")
        self.assertIsNone(result["object_key"])
        self.assertEqual(result["status"], "unresolved")
        self.assertEqual(result["reference"], "https://images.example.test/product.webp")
        self.assertNotIn("private", json.dumps(result))

    def test_missing_local_image_is_unresolved_and_reconciliation_is_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            existing = root / "candidate.webp"
            existing.write_bytes(b"synthetic-image-bytes")
            before = existing.read_bytes()
            entries_before = sorted(path.name for path in root.iterdir())

            with patch("socket.create_connection", side_effect=AssertionError("network access is forbidden")):
                result = classify_image_reference("missing.webp", root=root)
                reconcile_source_reference({"sku": "NO-MATCH"}, [])

            self.assertEqual(result["status"], "unresolved")
            self.assertFalse(result["exists"])
            self.assertIsNone(result["sha256"])
            self.assertEqual(existing.read_bytes(), before)
            self.assertEqual(sorted(path.name for path in root.iterdir()), entries_before)

    def test_source_inventory_is_deterministic_metadata_only_and_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            local_sources = {
                "data/inventory/batch.csv": b"sku,image_url\nEXACT-SKU,https://cdn.example.test/item-images/a.webp\n",
                "data/catalog/images/LOCAL-SOURCE.webp": b"preserved source bytes",
                "catalog-images/sku-named/EXACT-SKU.webp": b"synthetic image bytes",
                "templates/catalog.csv": b"Product Name,Item Code (SKU)\n",
                "scripts/images/upload.py": b"SOURCE_DIR = 'catalog-images/sku-named'\n",
                "apps/admin_web/src/features/import/ImportProductsPage.tsx": b"supabase.from('items').insert(payload)\n",
                "apps/admin_web/src/app/App.tsx": b"import('../features/import/ImportProductsPage')\n",
                "apps/mobile_app/lib/features/inventory/presentation/screens/inventory_import_screen.dart": b"/functions/v1/import-inventory\n",
                "supabase/functions/import-inventory/index.ts": b"const table = 'items'\n",
                "supabase/migrations/20261003010000_add_product_image_metadata.sql": b"alter table public.items\n",
                "cloudflare/workers/images/wrangler.toml": b"name = 'images'\n",
            }
            for relative_path, contents in local_sources.items():
                path = root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(contents)
            before = {path: (root / path).read_bytes() for path in local_sources}

            with patch("socket.create_connection", side_effect=AssertionError("network access is forbidden")):
                first = build_source_inventory(root)
                second = build_source_inventory(root)

            self.assertEqual(first, second)
            by_path = {row["source_path"]: row for row in first["sources"] if "source_row" not in row}
            self.assertEqual(by_path["data/inventory/batch.csv"]["source_kind"], "inventory_source")
            self.assertEqual(by_path["catalog-images/sku-named/EXACT-SKU.webp"]["item_key"], "EXACT-SKU")
            self.assertEqual(by_path["data/catalog/images/LOCAL-SOURCE.webp"]["source_kind"], "central_image_library")
            self.assertEqual(by_path["templates/catalog.csv"]["status"], "adapter")
            self.assertIn("apps/mobile_app/lib/features/inventory/presentation/screens/inventory_import_screen.dart", by_path["supabase/functions/import-inventory/index.ts"]["current_callers"])
            self.assertIn("apps/admin_web/src/app/App.tsx", by_path["apps/admin_web/src/features/import/ImportProductsPage.tsx"]["current_callers"])
            self.assertNotIn("apps/admin_web/src/features/import/ImportProductsPage.tsx", by_path["supabase/functions/import-inventory/index.ts"]["current_callers"])
            image_row = next(row for row in first["sources"] if row.get("source_row") == 2)
            self.assertEqual(image_row["item_key"], "EXACT-SKU")
            self.assertEqual(image_row["object_key_or_url"], "item-images/a.webp")
            self.assertEqual(image_row["match_status"], "unresolved")
            self.assertEqual({path: (root / path).read_bytes() for path in local_sources}, before)
            self.assertTrue(first["read_only"])

    def test_cli_writes_source_inventory_to_a_separate_local_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "data/inventory/batch.csv"
            source.parent.mkdir(parents=True)
            source.write_text("sku\nA-1\n", encoding="utf-8")
            output = root.parent / f"{root.name}-source-inventory.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/catalog/reconcile_inventory_snapshots.py"),
                    "--source-inventory-root", str(root),
                    "--source-inventory-output", str(output),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

            try:
                self.assertEqual(result.returncode, 0, result.stderr)
                manifest = json.loads(output.read_text(encoding="utf-8"))
                self.assertEqual(manifest["schema_version"], 1)
                self.assertTrue(manifest["read_only"])
            finally:
                output.unlink(missing_ok=True)

    def test_source_inventory_includes_r2_metadata_without_claiming_sha256(self):
        snapshot = {
            "read_only": True,
            "bucket_binding": "IMAGES",
            "bucket_name": "lucky-store-images",
            "total_bucket_objects": 2,
            "total_bucket_bytes": 300,
            "classified_prefix_counts": {"products": 1, "other_nested": 1},
            "products": [{"key": "products/tenant/SKU-uuid.webp", "size": 300, "etag": "abc123", "content_type": "image/webp", "last_modified": "2026-10-28T00:00:00Z"}],
        }

        report = build_source_inventory(Path.cwd(), r2_snapshot=snapshot)
        remote = next(row for row in report["sources"] if row["source_kind"] == "r2_object")

        self.assertEqual(remote["object_key_or_url"], "products/tenant/SKU-uuid.webp")
        self.assertEqual(remote["size_bytes"], 300)
        self.assertEqual(remote["etag"], "abc123")
        self.assertEqual(remote["content_type"], "image/webp")
        self.assertEqual(remote["last_modified"], "2026-10-28T00:00:00Z")
        self.assertIsNone(remote["sha256"])
        self.assertFalse(report["remote_sources"]["sha256_available"])


if __name__ == "__main__":
    unittest.main()
