import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reconcile_inventory_snapshots import add_typesafe_reviews, load_snapshot, reconcile


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


if __name__ == "__main__":
    unittest.main()
