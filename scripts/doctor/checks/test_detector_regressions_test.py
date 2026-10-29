from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.doctor.checks import security_rls, test_gaps


class SecurityRlsDetectorTests(unittest.TestCase):
    def test_schema_qualified_rls_and_safe_search_paths_are_recognized(self) -> None:
        sql = """
        CREATE TABLE public.catalog_import_batches (id uuid);
        ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;
        CREATE FUNCTION public.apply_batch() RETURNS void
        LANGUAGE plpgsql SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $$ BEGIN RETURN; END; $$;
        """

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            migrations = root / "supabase" / "migrations"
            migrations.mkdir(parents=True)
            (migrations / "001_catalog.sql").write_text(sql, encoding="utf-8")
            result = security_rls.run(root)

        self.assertEqual([], result.findings)

    def test_unsafe_search_path_remains_a_finding(self) -> None:
        sql = """
        CREATE FUNCTION public.unsafe() RETURNS void
        LANGUAGE plpgsql SECURITY DEFINER
        SET search_path = public, pg_catalog
        AS $$ BEGIN RETURN; END; $$;
        """
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            migrations = root / "supabase" / "migrations"
            migrations.mkdir(parents=True)
            (migrations / "001_unsafe.sql").write_text(sql, encoding="utf-8")
            result = security_rls.run(root)

        self.assertIn("sec-definer-search-path", [finding.rule_id for finding in result.findings])

    def test_ci_checks_only_migrations_changed_from_main(self) -> None:
        unsafe_sql = """
        CREATE FUNCTION public.legacy_unsafe() RETURNS void
        LANGUAGE plpgsql SECURITY DEFINER
        AS $$ BEGIN RETURN; END; $$;
        """
        safe_sql = """
        CREATE TABLE public.catalog_import_batches (id uuid);
        ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;
        """
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            migrations = root / "supabase" / "migrations"
            migrations.mkdir(parents=True)
            (migrations / "001_legacy.sql").write_text(unsafe_sql, encoding="utf-8")
            (migrations / "002_pr.sql").write_text(safe_sql, encoding="utf-8")
            changed = subprocess.CompletedProcess(
                args=["git", "diff"],
                returncode=0,
                stdout="supabase/migrations/002_pr.sql\n",
                stderr="",
            )

            with patch("scripts.doctor.checks.security_rls.subprocess.run", return_value=changed):
                result = security_rls.run(root, ci=True)

        self.assertEqual([], result.findings)


class TestGapPathRecognitionTests(unittest.TestCase):
    def test_recognizes_repository_test_filename_conventions(self) -> None:
        for path in (
            "supabase/functions/import-inventory/index_test.ts",
            "scripts/catalog/test_reconcile_inventory_snapshots.py",
            "apps/admin/src/import.test.tsx",
            "packages/catalog/__tests__/contract.ts",
            "scripts/tests/doctor_checks.py",
        ):
            with self.subTest(path=path):
                self.assertTrue(test_gaps._is_test_path(path))

    def test_does_not_mistake_production_source_for_test(self) -> None:
        self.assertFalse(test_gaps._is_test_path("supabase/functions/import-inventory/index.ts"))


if __name__ == "__main__":
    unittest.main()
