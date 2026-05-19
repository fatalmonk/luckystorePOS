#!/usr/bin/env python3
"""Update existing items with MRP from CSV — matches by name."""

import psycopg2
from psycopg2.extras import execute_batch
import csv

def update_mrp():
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres.hvmyxyccfnkrbxqbhlnm",
        password="qejwux-peQjyc-7hyxpi",
        host="aws-1-ap-northeast-1.pooler.supabase.com",
        port="5432",
        sslmode="require"
    )
    conn.autocommit = True
    cur = conn.cursor()

    # Read CSV
    updates = []
    with open('../../data/inventory/inventory_mapped.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['name'].strip()
            mrp = row.get('mrp', '').strip()
            if name and mrp:
                try:
                    mrp_val = float(mrp)
                    updates.append((mrp_val, name))
                except ValueError:
                    pass

    print(f"Found {len(updates)} rows with MRP in CSV")

    # Check existing items by name
    cur.execute("SELECT name, mrp FROM items WHERE name = ANY(%s)", ([u[1] for u in updates],))
    existing = {row[0]: row[1] for row in cur.fetchall()}
    print(f"Found {len(existing)} matching items in DB")

    # Check for null MRPs
    null_mrp = [name for name, mrp in existing.items() if mrp is None]
    print(f"Items with null MRP: {len(null_mrp)}")

    # Perform updates
    updated = 0
    mismatched = []
    for mrp, name in updates:
        if name in existing:
            if existing[name] is None or existing[name] == 0:
                cur.execute(
                    "UPDATE items SET mrp = %s, updated_at = NOW() WHERE name = %s",
                    (mrp, name)
                )
                if cur.rowcount > 0:
                    updated += 1
            elif abs(float(existing[name]) - mrp) > 0.01:
                mismatched.append((name, existing[name], mrp))

    print(f"Updated {updated} items with MRP")
    print(f"Mismatched MRP values (DB vs CSV): {len(mismatched)}")
    for name, db_val, csv_val in mismatched[:10]:
        print(f"  {name}: DB={db_val}, CSV={csv_val}")

    conn.close()

if __name__ == "__main__":
    update_mrp()
