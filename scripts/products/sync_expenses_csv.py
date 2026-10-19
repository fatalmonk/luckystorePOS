#!/usr/bin/env python3
"""
Lucky Store — Expenses CSV Synchronizer & Reconciler
Keeps `data/standardized_receipts/Lucky Store - Accounts & Financial Records - Expenses.csv`
updated with:
1. Exact matching standardized physical receipt paths on disk (Column: 'reciept')
2. Verified extraction and physical proof status (Column: 'Receipt extraction status')
3. Vendor name canonicalization via VendorRegistry
4. Trimming dead empty rows from spreadsheet exports
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.products.vendor_registry import VendorRegistry


def update_expenses_csv(
    expenses_csv: Path,
    standardized_receipts_dir: Path,
    backup: bool = True,
) -> None:
    # 1. Map all physical standardized receipt files on disk
    receipt_files = list(standardized_receipts_dir.glob("*/*.jpeg")) + list(
        standardized_receipts_dir.glob("*/*.jpg")
    )
    disk_receipts: Dict[str, str] = {}
    for f in receipt_files:
        # Match base invoice like LS204, LS290, LS941
        m = re.search(r"\b(LS\d{1,4}[A-Za-z0-9\-]*)\b", f.name)
        if m:
            inv_key = m.group(1).upper()
            disk_receipts[inv_key] = f.name
            root_key = inv_key.split("-")[0]
            if root_key not in disk_receipts:
                disk_receipts[root_key] = f.name

    # 2. Initialize vendor registry
    reg = VendorRegistry()

    # 3. Read existing rows
    with open(expenses_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    updated_rows: List[Dict[str, Any]] = []
    receipts_linked = 0
    vendors_canonicalized = 0

    for row in rows:
        # Skip completely empty trailing rows
        d = (row.get("Date") or "").strip()
        amt = (row.get("Amount") or "").strip()
        inv = (row.get("Invoice No.") or "").strip().upper()
        vendor = (row.get("Vendor") or "").strip()

        if not d and not amt and not inv and not vendor:
            continue

        # Match physical receipt
        if inv.startswith("LS"):
            inv_root = inv.split("-")[0]
            matched_file = disk_receipts.get(inv) or disk_receipts.get(inv_root)
            if matched_file:
                current_rec = (row.get("reciept") or "").strip()
                if current_rec != matched_file:
                    row["reciept"] = matched_file
                    receipts_linked += 1

                # Update status if empty or outdated
                status = (row.get("Receipt extraction status") or "").strip()
                if not status or "rescan needed; no receipt image" in status.lower():
                    row["Receipt extraction status"] = "VERIFIED_PHYSICAL_RECEIPT"

        # Canonicalize vendor name if known
        if vendor:
            canon_vendor, _ = reg.match_or_register(vendor, source="expenses_ledger_sync")
            if canon_vendor and canon_vendor != vendor:
                row["Vendor"] = canon_vendor
                vendors_canonicalized += 1

        updated_rows.append(row)

    # 4. Backup original file
    if backup:
        bak_file = expenses_csv.parent / f"{expenses_csv.name}.bak"
        with open(bak_file, "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    # 5. Write updated file
    with open(expenses_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(
        f"Done: @[{expenses_csv}] "
        f"({len(updated_rows)} valid rows retained, {receipts_linked} receipt filenames synced, "
        f"{vendors_canonicalized} vendor names canonicalized)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronize and update Lucky Store Expenses CSV.")
    parser.add_argument(
        "--file",
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
    args = parser.parse_args()
    update_expenses_csv(args.file, args.receipts_dir)


if __name__ == "__main__":
    main()
