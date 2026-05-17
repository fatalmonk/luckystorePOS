#!/usr/bin/env python3
"""Fix May-24 BPDB typo → Apr-24 and insert 9 missing expense items."""
import json, os, sys, requests

env_path = os.path.join(os.path.dirname(__file__), "../../.env.local")
SUPABASE_URL = ""
SERVICE_KEY = ""
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith("SUPABASE_URL="):
            SUPABASE_URL = line.split("=", 1)[1].strip('"')
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            SERVICE_KEY = line.split("=", 1)[1].strip('"')

STORE_ID = "4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

DRY_RUN = "--dry-run" in sys.argv

# 1. Fix May-24 BPDB entry → Apr-24
print("=== Step 1: Fix May 24 BPDB date typo → Apr 24 ===")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/expenses?expense_date=eq.2026-05-24&vendor_name=eq.BPDB",
    headers=HEADERS,
)
may24_rows = r.json()
print(f"  Found {len(may24_rows)} rows with date 2026-05-24 for BPDB")
if may24_rows:
    row = may24_rows[0]
    print(f"  ID: {row['id']}, amount: {row['amount']}, description: {row['description']}")
    if not DRY_RUN:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/expenses?id=eq.{row['id']}",
            headers=HEADERS,
            json={"expense_date": "2026-04-24"},
        )
        print(f"  Updated: {r.status_code}")

# Also fix Islam (Mama) on May 24 → Apr 24
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/expenses?expense_date=eq.2026-05-24&vendor_name=eq.Islam (Mama)",
    headers=HEADERS,
)
may24_islam = r.json()
print(f"  Found {len(may24_islam)} rows with date 2026-05-24 for Islam (Mama)")
if may24_islam:
    row = may24_islam[0]
    print(f"  ID: {row['id']}, amount: {row['amount']}, description: {row['description']}")
    if not DRY_RUN:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/expenses?id=eq.{row['id']}",
            headers=HEADERS,
            json={"expense_date": "2026-04-24"},
        )
        print(f"  Updated: {r.status_code}")

# 2. Insert 9 new expense items
print("\n=== Step 2: Insert 9 new expense items ===")
new_items = [
    # Apr 24 - BPDB (now in correct date, might already exist from fix)
    {"expense_date": "2026-04-24", "vendor_name": "BPDB", "description": "Electric Bill", "amount": 2000.0, "payment_type": "Cash", "category": "Utility Expenses"},
    # Apr 24 - Islam (Mama)
    {"expense_date": "2026-04-24", "vendor_name": "Islam (Mama)", "description": "Mohish er Doi", "amount": 2250.0, "payment_type": "Bkash", "category": "Stock Purchase"},
    # May 6
    {"expense_date": "2026-05-06", "vendor_name": "Army Enterprise", "description": "", "amount": 1008.0, "payment_type": "Cash", "category": "Stock Purchase"},
    {"expense_date": "2026-05-06", "vendor_name": "Z.H. Enterprise", "description": "", "amount": 1642.0, "payment_type": "Cash", "category": "Stock Purchase"},
    {"expense_date": "2026-05-06", "vendor_name": "Well Food", "description": "", "amount": 1240.0, "payment_type": "Cash", "category": "Stock Purchase"},
    {"expense_date": "2026-05-06", "vendor_name": "Fulkoli", "description": "", "amount": 126.0, "payment_type": "Cash", "category": "Stock Purchase"},
    {"expense_date": "2026-05-06", "vendor_name": "East Baker", "description": "", "amount": 260.0, "payment_type": "Cash", "category": "Stock Purchase"},
    # May 9
    {"expense_date": "2026-05-09", "vendor_name": "Farhad Store", "description": "", "amount": 330.0, "payment_type": "Cash", "category": "Stock Purchase"},
    {"expense_date": "2026-05-09", "vendor_name": "Panda", "description": "", "amount": 50.0, "payment_type": "Cash", "category": "Staff salary"},
]

# Check which already exist after date fix
for item in new_items:
    item["store_id"] = STORE_ID
    item["vendor_name"] = item["vendor_name"][:255] if item["vendor_name"] else "Unknown"
    item["description"] = item["description"][:500] if item["description"] else item["vendor_name"]

# Deduplicate: only insert items that don't already exist
items_to_insert = []
for item in new_items:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/expenses?expense_date=eq.{item['expense_date']}&vendor_name=eq.{item['vendor_name']}&amount=eq.{item['amount']}",
        headers=HEADERS,
    )
    existing = r.json()
    if existing:
        print(f"  SKIP (exists): {item['expense_date']} | {item['vendor_name']} | {item['amount']}")
    else:
        items_to_insert.append(item)
        print(f"  NEW: {item['expense_date']} | {item['vendor_name'][:25]:25s} | {item['amount']:>10} | {item['category']}")

print(f"\n  Will insert {len(items_to_insert)} new items")

if items_to_insert and not DRY_RUN:
    r = requests.post(f"{SUPABASE_URL}/rest/v1/expenses", headers=HEADERS, json=items_to_insert)
    if r.status_code in (200, 201):
        print(f"  ✓ Inserted {len(r.json())} rows")
    else:
        print(f"  ERROR: {r.status_code} {r.text[:500]}")

# Verify final count
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/expenses?select=id",
    headers={**HEADERS, "Prefer": "count=exact"},
)
total = len(r.json())
print(f"\n=== Final: {total} expense rows in DB ===")

if DRY_RUN:
    print("\n[DRY RUN] No changes made. Remove --dry-run to apply.")