#!/usr/bin/env python3
"""
Lucky Store — Record Missing Receipts & Expenses Data
Extracts all 262 stock purchases from the Expenses CSV that lack physical
standardized receipt files on disk. Outputs detailed CSV and JSON records
with date, invoice, vendor, amount, category, and month for targeted recovery.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import re
import sys
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]


def record_missing_receipts(
    expenses_csv: Path,
    standardized_receipts_dir: Path,
    output_csv: Path,
    output_json: Path,
) -> None:
    # 1. Map all existing receipt files on disk
    receipt_files = list(standardized_receipts_dir.glob("*/*.jpeg"))
    disk_receipts: Dict[str, Path] = {}
    for f in receipt_files:
        m = re.match(r"^(PENDING_\d{4}-\d{2}_)?(LS\d{1,4}[A-Za-z0-9\-]*)", f.name)
        if m:
            key = m.group(2).split("-")[0].upper()
            disk_receipts[key] = f

    # 2. Iterate expenses CSV and identify unrepresented invoices
    missing_records: List[Dict[str, Any]] = []
    with open(expenses_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            inv = (row.get("Invoice No.") or "").strip().upper()
            if not inv.startswith("LS"):
                continue

            # Check if root invoice (e.g. LS123) is on disk
            inv_root = inv.split("-")[0].strip()
            if inv_root not in disk_receipts and inv not in disk_receipts:
                d_str = (row.get("Date") or "").strip()
                parts = d_str.split("/")
                month = f"{parts[2]}-{parts[1]}" if len(parts) == 3 else "Unknown"

                raw_amt = (row.get("Amount") or "0").replace(",", "").strip()
                try:
                    amt = float(raw_amt)
                except ValueError:
                    amt = 0.0

                missing_records.append({
                    "month": month,
                    "invoice_no": inv,
                    "date": d_str,
                    "vendor": (row.get("Vendor") or "").strip(),
                    "item_description": (row.get("Item description") or "").strip(),
                    "amount": amt,
                    "payment_type": (row.get("Payment type") or "").strip(),
                    "expense_category": (row.get("Expense Category") or "").strip(),
                    "expected_filename": f"{inv}-{d_str.replace('/', '_')}-{(row.get('Vendor') or '').replace(' ', '')}-{int(amt)}BDT.jpeg",
                })

    # Sort chronologically
    missing_records.sort(key=lambda r: (r["month"], r["invoice_no"]))

    # Write CSV
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "month",
        "invoice_no",
        "date",
        "vendor",
        "item_description",
        "amount",
        "payment_type",
        "expense_category",
        "expected_filename",
    ]
    with open(output_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in missing_records:
            writer.writerow(rec)

    # Write JSON summary
    by_month: Dict[str, Any] = {}
    for rec in missing_records:
        m = rec["month"]
        if m not in by_month:
            by_month[m] = {"count": 0, "total_amount": 0.0, "invoices": []}
        by_month[m]["count"] += 1
        by_month[m]["total_amount"] += rec["amount"]
        by_month[m]["invoices"].append(rec["invoice_no"])

    summary = {
        "total_missing_invoices": len(missing_records),
        "total_missing_amount_bdt": round(sum(r["amount"] for r in missing_records), 2),
        "monthly_summary": by_month,
        "records": missing_records,
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(
        f"Done: @[{output_csv}] ({len(missing_records)} missing invoices recorded, "
        f"{summary['total_missing_amount_bdt']:,.2f} BDT total)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Record missing receipts from expense ledger.")
    parser.add_argument(
        "--expenses",
        type=Path,
        default=REPO_ROOT / "data" / "standardized_receipts" / "Lucky Store - Accounts & Financial Records - Expenses.csv",
        help="Path to Expenses CSV",
    )
    parser.add_argument(
        "--receipts-dir",
        type=Path,
        default=REPO_ROOT / "data" / "standardized_receipts",
        help="Path to standardized receipts directory",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=REPO_ROOT / "data" / "audits" / "missing_receipts_manifest.csv",
        help="Path to output CSV manifest",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=REPO_ROOT / "data" / "audits" / "missing_receipts_manifest.json",
        help="Path to output JSON summary",
    )
    args = parser.parse_args()
    record_missing_receipts(args.expenses, args.receipts_dir, args.output_csv, args.output_json)


if __name__ == "__main__":
    main()
