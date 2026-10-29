import csv
import unittest
from pathlib import Path

from scripts.catalog.image_library import canonical_filename, exact_duplicate_groups, tracked_product_image_paths


class ProductImageLibraryTests(unittest.TestCase):
    def test_manifest_fixture_keeps_unverified_references_unresolved(self):
        manifest = Path(__file__).parent / "fixtures/image-manifest.csv"
        with manifest.open(newline="", encoding="utf-8") as source:
            reader = csv.DictReader(source)
            self.assertIn("item_id", reader.fieldnames)
            self.assertIn("reference_status", reader.fieldnames)
            self.assertIn("reference_files", reader.fieldnames)
            self.assertIn("disposition", reader.fieldnames)
            rows = list(reader)

        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row["disposition"] == "unresolved" for row in rows))
        self.assertTrue(all(row["item_id"] == "" for row in rows))
        self.assertTrue(all(row["reference_status"] in {
            "filename_term_found_review_only",
            "sku_term_only_review_only",
            "no_name_or_sku_term_found_in_scanned_repo_scope",
        } for row in rows))

    def test_exact_hashes_group_alias_paths_but_near_duplicates_stay_separate(self):
        same = "a" * 64
        near = "a" * 63 + "b"
        groups = exact_duplicate_groups([
            {"source_path": "catalog-images/a.webp", "sha256": same},
            {"source_path": "social-media/catalogue-images/b.webp", "sha256": same},
            {"source_path": "catalog-images/near.webp", "sha256": near},
            {"source_path": "catalog-images/no-hash.webp", "sha256": None},
        ])
        self.assertEqual(list(groups), [same, near])
        self.assertEqual([row["source_path"] for row in groups[same]], [
            "catalog-images/a.webp", "social-media/catalogue-images/b.webp",
        ])
        self.assertEqual(len(groups[near]), 1)

    def test_canonical_names_are_collision_safe_and_handle_missing_sku(self):
        first = canonical_filename("SKU / one", "source", "a" * 64, ".webp")
        second = canonical_filename("SKU / one", "source", "b" * 64, ".webp")
        unmatched = canonical_filename(None, "approved", "c" * 64, ".png")
        self.assertNotEqual(first, second)
        self.assertEqual(first, "SKU_one-source-aaaaaaaaaaaa.webp")
        self.assertEqual(unmatched, "unmatched-approved-cccccccccccc.png")
        with self.assertRaises(ValueError):
            canonical_filename("SKU", "source", "bad", ".webp")

    def test_git_guard_catches_packshots_but_leaves_application_artwork_alone(self):
        files = [
            "catalog-images/sku.webp",
            "social-media/catalogue-images/sku.jpg",
            "data/catalog/images/candidate.png",
            "apps/admin_web/public/products/sku.webp",
            "catalog-images/legacy.bmp",
            "social-media/catalogue-images/legacy.tif",
            "apps/customer_storefront/public/products/legacy.tiff",
            "apps/customer_storefront/public/images/logo.webp",
            "apps/customer_storefront/src/assets/cart.png",
            "data/catalog/image-manifest.csv",
        ]
        self.assertEqual(tracked_product_image_paths(files), sorted(files[:7]))

    def test_git_guard_is_case_insensitive_for_legacy_directories(self):
        self.assertEqual(
            tracked_product_image_paths(["Products/Legacy.JPG", "apps/site/public/Products/sku.WEBP"]),
            ["Products/Legacy.JPG", "apps/site/public/Products/sku.WEBP"],
        )


if __name__ == "__main__":
    unittest.main()
