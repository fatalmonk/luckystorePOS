#!/usr/bin/env python3
"""One-time import: Insert new expense rows from CSV into Supabase."""
import json, os, sys, requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip('"')
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip('"')

if not SUPABASE_URL or not SERVICE_KEY:
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
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

STORE_ID = "4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd"

with open("/tmp/lucky_store_new_expenses.json") as f:
    new_items = json.load(f)

valid_categories = ["All Other Expenses", "Capital Expenditure", "Partners Take", "Staff salary", "Stock Purchase", "Transport & Conveyance", "Utility Expenses"]
valid_payment = ["Cash", "Bank transfer", "Bkash", "Card"]

rows = []
for it in new_items:
    cat = it["category"] if it["category"] in valid_categories else "All Other Expenses"
    pay = it["payment_type"] if it["payment_type"] in valid_payment else "Cash"
    row = {
        "store_id": STORE_ID,
        "expense_date": it["expense_date"],
        "vendor_name": (it["vendor_name"] or "Unknown")[:255],
        "description": (it["description"] or it["vendor_name"])[:500],
        "amount": it["amount"],
        "payment_type": pay,
        "category": cat,
    }
    rows.append(row)

print(f"Prepared {len(rows)} rows for insertion")

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

batch_size = 50
inserted = 0
for i in range(0, len(rows), batch_size):
    batch = rows[i : i + batch_size]
    r = requests.post(f"{SUPABASE_URL}/rest/v1/expenses", headers=headers, json=batch)
    if r.status_code in (200, 201):
        inserted += len(batch)
        print(f"  Batch {i // batch_size + 1}: inserted {len(batch)} rows")
    else:
        print(f"  ERROR batch {i // batch_size + 1}: {r.status_code} {r.text[:500]}")
        sys.exit(1)

print(f"\nDone! Inserted {inserted}/{len(rows)} expense rows")