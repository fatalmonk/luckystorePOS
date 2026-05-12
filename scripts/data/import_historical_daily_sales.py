#!/usr/bin/env python3
"""
One-time import: Upsert daily_sales from CSV, and patch expense rows.
Reads the updated CSV data and syncs to Supabase.

Usage:
  source .env.local
  python3 scripts/data/import_historical_daily_sales.py [--dry-run]
"""

import csv
import json
import os
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests

# ── Config ──────────────────────────────────────────────────────────────────
STORE_ID = "4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip('"')
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip('"')

if not SUPABASE_URL or not SERVICE_KEY:
    # Try .env.local
    env_path = os.path.join(os.path.dirname(__file__), "../../.env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("SUPABASE_URL="):
                    SUPABASE_URL = line.split("=", 1)[1].strip('"')
                elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SERVICE_KEY = line.split("=", 1)[1].strip('"')

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or .env.local")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

DRY_RUN = "--dry-run" in sys.argv

# Find CSV path: first non-flag argument, or default
csv_arg = None
for arg in sys.argv[1:]:
    if not arg.startswith("--"):
        csv_arg = arg
        break

CSV_PATH = os.path.abspath(csv_arg) if csv_arg else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../Lucky_Store_-Daily_Sales__10th_May.csv"))


def parse_num(v):
    """Parse a numeric CSV field, returning 0 for empty/missing."""
    if v is None or str(v).strip() == "":
        return 0
    return float(str(v).replace(",", "").replace("৳", "").strip())


def parse_date(d):
    """Parse DD/MM/YYYY to YYYY-MM-DD."""
    parts = d.strip().split("/")
    return f"{parts[2]}-{parts[1]}-{parts[0]}"


def api_get(endpoint, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    r = requests.get(url, headers=HEADERS, params=params)
    r.raise_for_status()
    return r.json()


def api_upsert(endpoint, rows):
    """Upsert rows using PostgREST. Returns response."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    r = requests.post(url, headers=headers, json=rows)
    if r.status_code not in (200, 201):
        print(f"  ERROR {r.status_code}: {r.text[:500]}")
        return None
    return r.json()


def main():
    # ── 1. Read CSV ─────────────────────────────────────────────────────────
    print(f"Reading CSV: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at {CSV_PATH}")
        sys.exit(1)

    csv_rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Handle Windows line endings
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    lines = content.strip().split("\n")

    reader = csv.DictReader(lines)
    for row in reader:
            date_str = row.get("Date", "").strip()
            # Skip totals row (empty date) and future empty rows
            if not date_str or "/" not in date_str:
                continue
            cash = parse_num(row.get("Cash", ""))
            bkash = parse_num(row.get("Bkash", ""))
            credit = parse_num(row.get("Credit", ""))
            total = parse_num(row.get("Total Daily Sales", ""))
            stock = parse_num(row.get("Daily Stock Purchase", ""))
            expense = parse_num(row.get("Daily Expense", ""))
            # Skip rows that are entirely zero (future/empty days)
            if cash == 0 and bkash == 0 and credit == 0 and total == 0 and stock == 0 and expense == 0:
                continue
            csv_rows.append({
                "sale_date": parse_date(date_str),
                "cash_amount": cash,
                "bkash_amount": bkash,
                "credit_amount": credit,
                "total_sales": total,
                "stock_purchase": stock,
                "daily_expense": expense,
            })

    print(f"Parsed {len(csv_rows)} data rows from CSV")
    print(f"  Date range: {csv_rows[0]['sale_date']} → {csv_rows[-1]['sale_date']}")

    # ── 2. Fetch existing DB rows ───────────────────────────────────────────
    print("\nFetching existing daily_sales from DB...")
    existing = api_get("daily_sales", {"select": "id,sale_date,cash_amount,bkash_amount,credit_amount,total_sales,stock_purchase,daily_expense", "order": "sale_date"})
    existing_map = {r["sale_date"]: r for r in existing}
    print(f"  Found {len(existing)} existing rows ({existing[0]['sale_date']} → {existing[-1]['sale_date']})")

    # ── 3. Compute diffs ────────────────────────────────────────────────────
    new_rows = []
    update_rows = []
    unchanged = 0

    for csv_row in csv_rows:
        date = csv_row["sale_date"]
        db_row = existing_map.get(date)

        row = {
            "store_id": STORE_ID,
            "sale_date": date,
            "cash_amount": csv_row["cash_amount"],
            "bkash_amount": csv_row["bkash_amount"],
            "credit_amount": csv_row["credit_amount"],
            "total_sales": csv_row["total_sales"],
            "stock_purchase": csv_row["stock_purchase"],
            "daily_expense": csv_row["daily_expense"],
        }

        if db_row is None:
            # New row (dates before Apr 3 or after May 11)
            new_rows.append(row)
        else:
            # Check for differences
            changes = {}
            for field in ["cash_amount", "bkash_amount", "credit_amount", "total_sales", "stock_purchase", "daily_expense"]:
                db_val = float(db_row[field])
                csv_val = csv_row[field]
                if abs(db_val - csv_val) > 0.01:
                    changes[field] = {"db": db_val, "csv": csv_val}
            
            if changes:
                row["id"] = db_row["id"]  # Include ID for upsert
                update_rows.append((date, row, changes))
            else:
                unchanged += 1

    # ── 4. Report ───────────────────────────────────────────────────────────
    print(f"\n=== IMPORT PLAN ===")
    print(f"  New rows to insert: {len(new_rows)}")
    print(f"  Existing rows to update: {len(update_rows)}")
    print(f"  Unchanged rows: {unchanged}")

    if new_rows:
        print(f"\n  NEW rows (dates):")
        for r in new_rows:
            print(f"    {r['sale_date']}: cash={r['cash_amount']}, total={r['total_sales']}, stock={r['stock_purchase']}, expense={r['daily_expense']}")

    if update_rows:
        print(f"\n  UPDATES:")
        for date, row, changes in update_rows:
            print(f"    {date}:")
            for field, vals in changes.items():
                print(f"      {field}: DB={vals['db']} → CSV={vals['csv']}")

    if DRY_RUN:
        print("\n[DRY RUN] No changes made. Remove --dry-run to apply.")
        return

    # ── 5. Insert new rows ──────────────────────────────────────────────────
    if new_rows:
        print(f"\nInserting {len(new_rows)} new rows...")
        result = api_upsert("daily_sales", new_rows)
        if result:
            print(f"  ✓ Inserted {len(result)} rows")

    # ── 6. Update existing rows ──────────────────────────────────────────────
    if update_rows:
        print(f"\nUpdating {len(update_rows)} existing rows...")
        # Upsert with id for merge-duplicates
        upsert_data = [row for _, row, _ in update_rows]
        result = api_upsert("daily_sales", upsert_data)
        if result:
            print(f"  ✓ Updated {len(result)} rows")

    # ── 7. Verify ───────────────────────────────────────────────────────────
    print("\n=== VERIFICATION ===")
    final = api_get("daily_sales", {"select": "sale_date", "order": "sale_date"})
    print(f"  Total rows in DB: {len(final)}")
    print(f"  Date range: {final[0]['sale_date']} → {final[-1]['sale_date']}")
    print("\nDone! ✓")


if __name__ == "__main__":
    main()