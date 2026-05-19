#!/usr/bin/env python3
"""Test get_inventory_list RPC."""

import psycopg2

def test_rpc():
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

    store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'
    
    cur.execute("SELECT * FROM get_inventory_list(%s) LIMIT 5", (store_id,))
    
    colnames = [desc[0] for desc in cur.description]
    print("RPC returns columns:", colnames)
    print()
    
    for row in cur.fetchall():
        row_dict = dict(zip(colnames, row))
        print(f"  {row_dict['name'][:30]:30} | MRP: {row_dict['mrp']:>6} | Price: {row_dict['price']:>6}")
    
    conn.close()

if __name__ == "__main__":
    test_rpc()
