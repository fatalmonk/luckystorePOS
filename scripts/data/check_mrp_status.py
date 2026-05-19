#!/usr/bin/env python3
"""Check MRP status in database."""

import psycopg2

def check_mrp():
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

    # Count items with MRP
    cur.execute("SELECT COUNT(*) FROM items WHERE mrp IS NOT NULL AND mrp > 0")
    with_mrp = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM items WHERE mrp IS NULL OR mrp = 0")
    without_mrp = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM items")
    total = cur.fetchone()[0]

    print(f"Total items: {total}")
    print(f"With MRP: {with_mrp}")
    print(f"Without MRP: {without_mrp}")
    print()

    # Get 10 examples with MRP
    cur.execute("""
        SELECT name, mrp, price, cost, barcode, sku 
        FROM items 
        WHERE mrp IS NOT NULL AND mrp > 0 
        ORDER BY name 
        LIMIT 10
    """)
    print("10 items WITH MRP:")
    print("-" * 80)
    for row in cur.fetchall():
        print(f"  {row[0][:40]:40} | MRP: ৳{row[1]:>6} | Price: ৳{row[2]:>6} | Barcode: {row[4] or 'N/A'}")

    print()

    # Get 10 examples without MRP
    cur.execute("""
        SELECT name, mrp, price, cost, barcode, sku 
        FROM items 
        WHERE mrp IS NULL OR mrp = 0 
        ORDER BY name 
        LIMIT 10
    """)
    print("10 items WITHOUT MRP:")
    print("-" * 80)
    for row in cur.fetchall():
        print(f"  {row[0][:40]:40} | MRP: {row[1] or 0:>6} | Price: ৳{row[2] or 0:>6} | Barcode: {row[4] or 'N/A'}")

    conn.close()

if __name__ == "__main__":
    check_mrp()
