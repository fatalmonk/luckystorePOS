"""Unit test suite for Lucky Store Receipt Intelligence SQL pipeline logic and synthetic fixtures."""

import json
import unittest
from decimal import Decimal
from pathlib import Path


def simulate_sql_reconciliation(
    doc_type: str,
    supplier_name: str | None,
    invoice_number: str | None,
    invoice_date: str | None,
    invoice_total: Decimal | None,
    extract_error: str | None,
    line_items: list[dict] | None,
) -> dict:
    """Simulates the exact SQL logic from purchase_reconciliation table in receipt_intelligence.sql.

    Mirrors the aggregate, CASE, and decimal math executed in Databricks Spark SQL.
    """
    if line_items is None:
        calculated_total = Decimal("0.00")
        line_items_valid = True
    else:
        calculated_total = Decimal("0.00")
        line_items_valid = True
        for item in line_items:
            # try_cast line_total
            lt_raw = item.get("line_total")
            qty_raw = item.get("quantity")
            up_raw = item.get("unit_price")

            lt = Decimal(str(lt_raw)) if lt_raw is not None else None
            qty = Decimal(str(qty_raw)) if qty_raw is not None else None
            up = Decimal(str(up_raw)) if up_raw is not None else None

            # item total resolution
            if lt is not None:
                item_total = lt
            elif qty is not None and up is not None:
                item_total = (qty * up).quantize(Decimal("0.01"))
            else:
                item_total = Decimal("0.00")

            calculated_total += item_total

            # validity checks
            item_valid = True
            if qty is not None and qty <= 0:
                item_valid = False
            if up is not None and up < 0:
                item_valid = False

            if lt is not None:
                if lt < 0:
                    item_valid = False
            else:
                if qty is None or qty <= 0 or up is None or up < 0:
                    item_valid = False

            if not item_valid:
                line_items_valid = False

    # CASE classification
    if doc_type != "purchase_invoice":
        status = "not_purchase_invoice"
    elif extract_error is not None:
        status = "extraction_error"
    elif invoice_total is None:
        status = "missing_invoice_total"
    elif invoice_total < 0:
        status = "invalid_invoice_total"
    elif (
        supplier_name is None
        or not supplier_name.strip()
        or invoice_number is None
        or not invoice_number.strip()
    ):
        status = "missing_invoice_metadata"
    elif line_items is None or len(line_items) == 0:
        status = "missing_line_items"
    elif not line_items_valid:
        status = "invalid_line_items"
    elif abs(invoice_total - calculated_total) <= Decimal("0.05"):
        status = "matched"
    else:
        status = "needs_review"

    return {
        "calculated_total": calculated_total,
        "line_items_valid": line_items_valid,
        "reconciliation_status": status,
        "totals_match": (status == "matched"),
    }


class TestReceiptReconciliationSQL(unittest.TestCase):
    def test_sql_file_exists_and_declares_stages(self):
        sql_path = (
            Path(__file__).parent.parent
            / "src"
            / "pipelines"
            / "receipt_pipeline"
            / "receipt_intelligence.sql"
        )
        self.assertTrue(sql_path.is_file(), f"SQL file missing at {sql_path}")
        content = sql_path.read_text(encoding="utf-8")

        # Verify key pipeline stages
        self.assertIn("CREATE OR REFRESH STREAMING TABLE parsed_receipt_documents", content)
        self.assertIn("CREATE OR REFRESH STREAMING TABLE raw_parsed_receipts", content)
        self.assertIn("CREATE OR REFRESH STREAMING TABLE receipt_parse_errors", content)
        self.assertIn("CREATE OR REFRESH STREAMING TABLE classified_receipts", content)
        self.assertIn("CREATE OR REFRESH STREAMING TABLE extracted_purchase_items", content)
        self.assertIn("CREATE OR REFRESH LIVE TABLE purchase_reconciliation", content)

        # Verify advisory evidence comment
        self.assertIn("This result is evidence, not posting authorization", content)

    def test_synthetic_fixture_matched_invoice(self):
        """Valid synthetic Pran Foods receipt with matching line totals."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="Pran Foods Ltd",
            invoice_number="INV-2026-001",
            invoice_date="2026-10-18",
            invoice_total=Decimal("1550.00"),
            extract_error=None,
            line_items=[
                {"name": "Pran Frooto 250ml", "quantity": 24, "unit_price": 30.00, "line_total": 720.00},
                {"name": "Pran Mustard Oil 1L", "quantity": 5, "unit_price": 166.00, "line_total": 830.00},
            ],
        )
        self.assertEqual(res["reconciliation_status"], "matched")
        self.assertTrue(res["totals_match"])
        self.assertEqual(res["calculated_total"], Decimal("1550.00"))
        self.assertTrue(res["line_items_valid"])

    def test_synthetic_fixture_calculated_total_without_explicit_line_total(self):
        """Receipt where line_total is missing but quantity and unit_price multiply correctly."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="Square Consumer Products Ltd",
            invoice_number="INV-SQ-9912",
            invoice_date="2026-10-17",
            invoice_total=Decimal("450.00"),
            extract_error=None,
            line_items=[
                {"name": "Radhuni Turmeric Powder 200g", "quantity": 3, "unit_price": 150.00, "line_total": None},
            ],
        )
        self.assertEqual(res["reconciliation_status"], "matched")
        self.assertTrue(res["totals_match"])
        self.assertEqual(res["calculated_total"], Decimal("450.00"))

    def test_synthetic_fixture_arithmetic_mismatch_needs_review(self):
        """Receipt where line item sum differs from header total by more than 0.05 BDT."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="Akij Food & Beverage Ltd",
            invoice_number="INV-AFBL-102",
            invoice_date="2026-10-16",
            invoice_total=Decimal("2000.00"),
            extract_error=None,
            line_items=[
                {"name": "Mojo 500ml", "quantity": 24, "unit_price": 40.00, "line_total": 960.00},
            ],
        )
        self.assertEqual(res["reconciliation_status"], "needs_review")
        self.assertFalse(res["totals_match"])
        self.assertEqual(res["calculated_total"], Decimal("960.00"))

    def test_synthetic_fixture_delivery_challan_flagged(self):
        """Document is a delivery challan without authorized invoice pricing."""
        res = simulate_sql_reconciliation(
            doc_type="delivery_challan",
            supplier_name="Unilever Bangladesh Ltd",
            invoice_number="CH-2026-77",
            invoice_date="2026-10-15",
            invoice_total=Decimal("5000.00"),
            extract_error=None,
            line_items=[{"name": "Wheel Powder 1kg", "quantity": 50, "unit_price": 100.00, "line_total": 5000.00}],
        )
        self.assertEqual(res["reconciliation_status"], "not_purchase_invoice")
        self.assertFalse(res["totals_match"])

    def test_synthetic_fixture_extraction_error_quarantined(self):
        """AI extraction encountered an error during parsing."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="City Group",
            invoice_number="INV-TEER-009",
            invoice_date="2026-10-14",
            invoice_total=Decimal("3000.00"),
            extract_error="Model context length exceeded",
            line_items=[],
        )
        self.assertEqual(res["reconciliation_status"], "extraction_error")
        self.assertFalse(res["totals_match"])

    def test_synthetic_fixture_missing_metadata(self):
        """Receipt missing supplier name or invoice number."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="   ",
            invoice_number="INV-UNKNOWN",
            invoice_date="2026-10-14",
            invoice_total=Decimal("500.00"),
            extract_error=None,
            line_items=[{"name": "Item A", "quantity": 5, "unit_price": 100.00, "line_total": 500.00}],
        )
        self.assertEqual(res["reconciliation_status"], "missing_invoice_metadata")
        self.assertFalse(res["totals_match"])

    def test_synthetic_fixture_empty_line_items(self):
        """Invoice parsed but with no extracted items."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="Bashundhara Group",
            invoice_number="INV-BG-55",
            invoice_date="2026-10-13",
            invoice_total=Decimal("1200.00"),
            extract_error=None,
            line_items=[],
        )
        self.assertEqual(res["reconciliation_status"], "missing_line_items")
        self.assertFalse(res["totals_match"])

    def test_synthetic_fixture_negative_quantity_invalid(self):
        """Line items with invalid negative quantities fail validation."""
        res = simulate_sql_reconciliation(
            doc_type="purchase_invoice",
            supplier_name="Aromatic Ltd",
            invoice_number="INV-AR-12",
            invoice_date="2026-10-12",
            invoice_total=Decimal("100.00"),
            extract_error=None,
            line_items=[{"name": "Soap", "quantity": -2, "unit_price": 50.00, "line_total": -100.00}],
        )
        self.assertEqual(res["reconciliation_status"], "invalid_line_items")
        self.assertFalse(res["line_items_valid"])
        self.assertFalse(res["totals_match"])


if __name__ == "__main__":
    unittest.main()
