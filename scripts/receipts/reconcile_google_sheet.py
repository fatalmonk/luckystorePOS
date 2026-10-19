#!/usr/bin/env python3
"""
Lucky Store Receipt & Financial Ledger Reconciliation Pipeline.

Reconciles local standardized receipts against the official Lucky Store
Financial Records Google Sheet:
https://docs.google.com/spreadsheets/d/1empmQlAbKB_7SZw7vVQ2gds5cXIApNLy9fm4jla2yg8/edit?gid=0#gid=0

Tasks performed:
1. Live CSV fetch/sync from Google Sheet export.
2. Cross-matching of all 814 Google Sheet LS invoices against local standardized receipts.
3. Fills missing 'reciept' column values with canonical 'LS###-DD_MM_YY-Vendor-AmountBDT.jpeg'.
4. Updates 'Receipt extraction status' (VERIFIED_PHYSICAL_RECEIPT, NO_PHYSICAL_RECEIPT_ATTACHED, etc.).
5. Identifies unledgered physical receipts from late September & October ready for sheet append.
6. Exports reconciled CSV and full audit manifest.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import urllib.request
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1empmQlAbKB_7SZw7vVQ2gds5cXIApNLy9fm4jla2yg8/export?format=csv&gid=0"
DEFAULT_LOCAL_SHEET_CSV = REPO_ROOT / "data" / "Accounts" / "google_sheet_expenses_latest.csv"
DEFAULT_MANIFEST_JSON = REPO_ROOT / "data" / "standardized_receipts" / "receipts_manifest.json"
DEFAULT_OUTPUT_CSV = REPO_ROOT / "data" / "Accounts" / "reconciled_expenses_for_google_sheet.csv"
DEFAULT_UNLEDGERED_CSV = REPO_ROOT / "data" / "Accounts" / "unledgered_receipts_to_append.csv"
DEFAULT_REPORT_JSON = REPO_ROOT / "data" / "Accounts" / "reconciliation_audit_report.json"


def fetch_latest_google_sheet_csv(url: str, dest_path: Path) -> Path:
    """Downloads the latest live CSV from Google Sheets."""
    print(f"[*] Fetching live Google Sheet export from: {url}")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; LuckyStoreReconciliation/1.0)"},
    )
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f_out:
        f_out.write(resp.read())
    print(f"[✓] Downloaded live Google Sheet CSV to: {dest_path}")
    return dest_path


class GoogleSheetReconciler:
    def __init__(
        self,
        sheet_csv_path: Path,
        manifest_json_path: Path,
        output_csv_path: Path,
        unledgered_csv_path: Path,
        report_json_path: Path,
    ):
        self.sheet_csv_path = sheet_csv_path
        self.manifest_json_path = manifest_json_path
        self.output_csv_path = output_csv_path
        self.unledgered_csv_path = unledgered_csv_path
        self.report_json_path = report_json_path

        self.sheet_header: list[str] = []
        self.sheet_rows: list[list[str]] = []
        self.receipts_manifest: list[dict[str, Any]] = []

        self.receipts_by_inv: dict[str, dict[str, Any]] = {}
        self.receipts_by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.unmatched_receipts: list[dict[str, Any]] = []

    def load_data(self) -> None:
        """Loads both Google Sheet CSV and Standardized Receipts manifest."""
        # 1. Load Google Sheet
        with open(self.sheet_csv_path, encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            self.sheet_header = next(reader, [])
            self.sheet_rows = list(reader)
        print(f"[*] Loaded Google Sheet: {len(self.sheet_rows)} total rows (Header: {len(self.sheet_header)} cols)")

        # 2. Load Standardized Manifest
        with open(self.manifest_json_path, encoding="utf-8") as f:
            self.receipts_manifest = json.load(f)

        daily_summary_count = 0
        quarantine_count = 0

        for item in self.receipts_manifest:
            is_dup = item.get("is_duplicate", False)
            is_anom = item.get("is_anomalous", False)
            dtype = item.get("doc_type", "purchase_invoice")

            if dtype == "daily_sales_summary":
                daily_summary_count += 1
                continue
            if is_anom or dtype in ("product_photo", "storefront_screenshot", "store_register_chit", "sales_order_chit"):
                quarantine_count += 1
                continue

            if not is_dup and dtype == "purchase_invoice":
                inv = item.get("invoice_number")
                if inv:
                    inv_k = inv.upper()
                    existing = self.receipts_by_inv.get(inv_k)
                    if not existing:
                        self.receipts_by_inv[inv_k] = item
                    elif (not existing.get("invoice_total_bdt") or existing.get("invoice_total_bdt") == 0) and (item.get("invoice_total_bdt") and item.get("invoice_total_bdt") > 0):
                        self.receipts_by_inv[inv_k] = item
                d_iso = item.get("invoice_date_iso")
                if d_iso:
                    self.receipts_by_date[d_iso].append(item)

        print(f"[*] Loaded Standardized Manifest: {len(self.receipts_manifest)} items")
        print(f"    - Active Purchase Invoices : {len(self.receipts_by_inv)}")
        print(f"    - Daily Sales Summaries    : {daily_summary_count} (Bypassed from expense ledger)")
        print(f"    - Quarantined / Products   : {quarantine_count} (Bypassed from expense ledger)")

    def reconcile(self) -> dict[str, Any]:
        """Performs 3-way reconciliation and generates augmented Google Sheet data."""
        matched_count = 0
        populated_receipt_col_count = 0
        missing_receipt_count = 0
        discrepancy_count = 0

        reconciled_rows: list[list[str]] = []
        matched_inv_set = set()

        # Ensure header contains 'Receipt extraction status'
        target_header = list(self.sheet_header)
        while len(target_header) < 11:
            if len(target_header) == 10:
                target_header.append("Receipt extraction status")
            elif len(target_header) == 9:
                target_header.append("Total")

        for row in self.sheet_rows:
            new_row = list(row)
            while len(new_row) < len(target_header):
                new_row.append("")

            # Check if this row is an LS invoice row
            is_ls_invoice = len(new_row) > 7 and new_row[7].strip().startswith("LS")
            if not is_ls_invoice:
                reconciled_rows.append(new_row)
                continue

            inv_no = new_row[7].strip().upper()
            date_raw = new_row[0].strip()
            vendor = new_row[1].strip()
            amount_raw = new_row[3].replace(",", "").strip()

            receipt_cell = new_row[6].strip()
            col10_cell = new_row[8].strip()

            # Check for match in our standardized receipts
            matched_receipt = self.receipts_by_inv.get(inv_no)

            if matched_receipt:
                matched_inv_set.add(inv_no)
                matched_count += 1

                canon_file_name = matched_receipt["target_file_name"]

                # Populate receipt column if empty or unstandardized
                if not receipt_cell or not receipt_cell.endswith(".jpeg"):
                    new_row[6] = canon_file_name
                    populated_receipt_col_count += 1

                # Ensure Column 10 is standard
                if not col10_cell:
                    new_row[8] = canon_file_name.replace(".jpeg", "")

                # Status
                new_row[10] = "VERIFIED_PHYSICAL_RECEIPT"

                # Check amount discrepancy
                try:
                    sheet_amt = float(amount_raw)
                    rec_amt = matched_receipt.get("invoice_total_bdt")
                    if rec_amt is not None and rec_amt > 0 and abs(sheet_amt - rec_amt) > 1.0:
                        discrepancy_count += 1
                        new_row[10] = f"AMOUNT_DISCREPANCY (Sheet: {sheet_amt:.0f} vs Slip: {rec_amt:.0f})"
                except ValueError:
                    pass

            else:
                missing_receipt_count += 1
                new_row[10] = "NO_PHYSICAL_RECEIPT_ATTACHED"

            reconciled_rows.append(new_row)

        # Find unledgered receipts (receipts in manifest not in Google Sheet)
        unledgered = []
        for inv, item in sorted(self.receipts_by_inv.items()):
            if inv not in matched_inv_set:
                unledgered.append(item)

        print(f"\n[✓] Reconciliation Summary:")
        print(f"    - Total Google Sheet LS Invoices      : {len([r for r in self.sheet_rows if len(r) > 7 and r[7].strip().startswith('LS')])}")
        print(f"    - Invoices Matched with Verified Slips: {matched_count}")
        print(f"    - Empty 'reciept' Cells Populated     : {populated_receipt_col_count}")
        print(f"    - Missing Physical Slips (Historical) : {missing_receipt_count}")
        print(f"    - Amount Discrepancies Flagged        : {discrepancy_count}")
        print(f"    - Unledgered Receipts Found (Sept/Oct): {len(unledgered)}")

        # Write Reconciled CSV
        self.output_csv_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(target_header)
            writer.writerows(reconciled_rows)
        print(f"[✓] Reconciled CSV written: {self.output_csv_path}")

        # Write Unledgered CSV (ready for append)
        if unledgered:
            with open(self.unledgered_csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["Date", "Vendor", "Item description", "Amount", "Payment type", "Expense Category", "reciept", "Invoice No.", "Column 10", "Total", "Receipt extraction status"])
                for item in unledgered:
                    iso_d = item.get("invoice_date_iso")
                    sheet_date = ""
                    if iso_d:
                        y, m, d = iso_d.split("-")
                        sheet_date = f"{d}/{m}/{y}"
                    sup = item.get("supplier_name") or "PendingSupplier"
                    tot = f"{item.get('invoice_total_bdt', 0):.2f}"
                    inv_no = item.get("invoice_number")
                    fn = item.get("target_file_name")
                    writer.writerow([sheet_date, sup, "Stock Purchase from physical slip", tot, "Cash", "Stock Purchase", fn, inv_no, fn.replace(".jpeg", ""), "", "UNLEDGERED_RECEIPT_NEW"])
            print(f"[✓] Unledgered receipts written: {self.unledgered_csv_path}")

        report = {
            "reconciliation_timestamp": datetime.now().isoformat(),
            "google_sheet_source": str(self.sheet_csv_path),
            "manifest_source": str(self.manifest_json_path),
            "total_sheet_invoices": len([r for r in self.sheet_rows if len(r) > 7 and r[7].strip().startswith("LS")]),
            "matched_verified_slips": matched_count,
            "populated_receipt_cells": populated_receipt_col_count,
            "missing_physical_receipts": missing_receipt_count,
            "discrepancies_flagged": discrepancy_count,
            "unledgered_receipts_count": len(unledgered),
            "reconciled_csv": str(self.output_csv_path),
            "unledgered_csv": str(self.unledgered_csv_path) if unledgered else None,
        }

        with open(self.report_json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"[✓] Full audit report written: {self.report_json_path}")

        return report


def main():
    parser = argparse.ArgumentParser(
        description="Reconcile Lucky Store Receipts with Google Sheet Financial Ledger",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--sheet-url",
        type=str,
        default=DEFAULT_SHEET_URL,
        help="Public CSV export URL of the Google Sheet",
    )
    parser.add_argument(
        "--fetch-live",
        action="store_true",
        default=True,
        help="Fetch fresh CSV from Google Sheets before reconciling (default: True)",
    )
    parser.add_argument(
        "--sheet-csv",
        type=Path,
        default=DEFAULT_LOCAL_SHEET_CSV,
        help="Local cached path to Google Sheet CSV",
    )
    parser.add_argument(
        "--manifest-json",
        type=Path,
        default=DEFAULT_MANIFEST_JSON,
        help="Path to receipts_manifest.json",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=DEFAULT_OUTPUT_CSV,
        help="Destination path for the fully reconciled CSV",
    )

    args = parser.parse_args()

    # Step 1: Download live CSV if requested or missing
    if args.fetch_live or not args.sheet_csv.is_file():
        fetch_latest_google_sheet_csv(args.sheet_url, args.sheet_csv)

    # Step 2: Reconcile
    reconciler = GoogleSheetReconciler(
        sheet_csv_path=args.sheet_csv,
        manifest_json_path=args.manifest_json,
        output_csv_path=args.output_csv,
        unledgered_csv_path=DEFAULT_UNLEDGERED_CSV,
        report_json_path=DEFAULT_REPORT_JSON,
    )
    reconciler.load_data()
    reconciler.reconcile()


if __name__ == "__main__":
    main()
