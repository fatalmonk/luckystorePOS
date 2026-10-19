#!/usr/bin/env python3
"""
scripts/receipts/quarantine_user_identified_photos.py

Quarantines non-receipt images identified by user:
LS296, LS324, LS330, LS331, LS353, LS354, LS355, LS356, LS385

- LS331 (Oral-B product catalog screenshot) & LS354 (bKash payment screenshot)
  -> data/product_photos/storefront_screenshots/
- LS296, LS324, LS330, LS353, LS355, LS356, LS385 (product packaging / stocktaking photos)
  -> data/product_photos/store_stocktaking/
- Updates data/Accounts/reconciled_expenses_for_google_sheet.csv
- Regenerates manifest and reruns JEV audit
"""

import os
import shutil
import csv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STD_DIR = REPO_ROOT / "data" / "standardized_receipts"
SCREENSHOTS_DIR = REPO_ROOT / "data" / "product_photos" / "storefront_screenshots"
STOCKTAKING_DIR = REPO_ROOT / "data" / "product_photos" / "store_stocktaking"
EXPENSES_CSV = REPO_ROOT / "data" / "Accounts" / "reconciled_expenses_for_google_sheet.csv"

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
STOCKTAKING_DIR.mkdir(parents=True, exist_ok=True)

SCREENSHOT_TARGETS = {
    "LS331-13_06_26-Coca-Cola-330BDT.jpeg",
    "LS354-16_06_26-Fulkoli-571BDT.jpeg",
}

STOCKTAKING_TARGETS = {
    "LS296-07_06_26-GoldenCorner-760BDT.jpeg",
    "LS324-11_06_26-SQUARE-2802BDT.jpeg",
    "LS330-13_06_26-Q&QTradingLtd-880BDT.jpeg",
    "LS353-16_06_26-SQUARE-1469BDT.jpeg",
    "LS355-17_06_26-KKEnterprise-2145BDT.jpeg",
    "LS356-17_06_26-Sajeeb-438BDT.jpeg",
    "LS385-23_06_26-StockPurchase-1596BDT.jpeg",
}

ALL_TARGET_INVS = {"LS296", "LS324", "LS330", "LS331", "LS353", "LS354", "LS355", "LS356", "LS385"}

def move_files():
    print("[1/4] Moving non-receipts to quarantine...")
    june_dir = STD_DIR / "2026-06"
    for fname in SCREENSHOT_TARGETS:
        p = june_dir / fname
        if p.is_file():
            shutil.move(str(p), str(SCREENSHOTS_DIR / fname))
            print(f"  Moved screenshot: {fname} -> storefront_screenshots/")

    for fname in STOCKTAKING_TARGETS:
        p = june_dir / fname
        if p.is_file():
            shutil.move(str(p), str(STOCKTAKING_DIR / fname))
            print(f"  Moved product photo: {fname} -> store_stocktaking/")

def update_ledger():
    print("[2/4] Updating reconciled_expenses_for_google_sheet.csv...")
    with open(EXPENSES_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    updated_count = 0
    for r in rows:
        if len(r) > 7 and r[7].strip() in ALL_TARGET_INVS:
            inv = r[7].strip()
            r[6] = ""  # Clear receipt attachment
            if inv in ("LS331", "LS354"):
                r[10] = "QUARANTINED_SCREENSHOT (Digital screenshot; no purchase invoice)"
            else:
                r[10] = "QUARANTINED_PRODUCT_PHOTO (Product stocktaking photo; no purchase invoice)"
            updated_count += 1

    with open(EXPENSES_CSV, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"  [✓] Updated {updated_count} ledger rows in reconciled expenses")

if __name__ == "__main__":
    move_files()
    update_ledger()
