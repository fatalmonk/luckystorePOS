import psycopg2
import uuid

def import_data():
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres.hvmyxyccfnkrbxqbhlnm",
            password="FsmHPpbIU4SYVPk2", 
            host="aws-1-ap-northeast-1.pooler.supabase.com",
            port="5432"
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Get MAIN store
        cur.execute("SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1;")
        store_res = cur.fetchone()
        if not store_res:
            print("MAIN store not found!")
            return
        store_id = store_res[0]

        # Get categories
        cur.execute("SELECT category, id FROM categories;")
        categories = {row[0]: row[1] for row in cur.fetchall()}

        imported_count = 0
        with open('data/inventory/prompt_data.tsv', 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for line in lines:
                if not line.strip(): continue
                parts = line.split('\t')
                if len(parts) < 19: continue
                
                raw_id = parts[0].strip()
                if not raw_id.isdigit():
                    continue
                    
                name = parts[3].strip()
                category_name = parts[4].strip()
                description = parts[5].strip()
                
                try:
                    cost = float(parts[6].strip() or 0)
                except ValueError:
                    cost = 0.0
                    
                try:
                    mrp = float(parts[7].strip() or 0)
                except ValueError:
                    mrp = 0.0
                    
                try:
                    price = float(parts[9].strip() or 0)
                except ValueError:
                    price = 0.0
                    
                try:
                    stock_qty = int(parts[15].strip() or 0)
                except ValueError:
                    stock_qty = 0
                    
                brand = parts[18].strip()

                if category_name not in categories:
                    cat_id = str(uuid.uuid4())
                    categories[category_name] = cat_id
                    cur.execute("INSERT INTO categories (id, category) VALUES (%s, %s)", (cat_id, category_name))
                else:
                    cat_id = categories[category_name]
                
                sku = f"SKU-{raw_id.zfill(4)}"
                
                # Upsert item
                cur.execute("SELECT id FROM items WHERE sku = %s", (sku,))
                existing = cur.fetchone()
                if existing:
                    item_id = existing[0]
                    cur.execute("""
                        UPDATE items SET name=%s, category_id=%s, description=%s, brand=%s, cost=%s, price=%s, mrp=%s
                        WHERE id=%s
                    """, (name, cat_id, description, brand, cost, price, mrp, item_id))
                else:
                    item_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO items (id, sku, name, category_id, description, brand, cost, price, mrp, active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, True)
                    """, (item_id, sku, name, cat_id, description, brand, cost, price, mrp))
                    
                # Upsert stock
                cur.execute("SELECT 1 FROM stock_levels WHERE store_id = %s AND item_id = %s", (store_id, item_id))
                if cur.fetchone():
                    cur.execute("UPDATE stock_levels SET qty = %s WHERE store_id = %s AND item_id = %s", (stock_qty, store_id, item_id))
                else:
                    cur.execute("INSERT INTO stock_levels (store_id, item_id, qty) VALUES (%s, %s, %s)", (store_id, item_id, stock_qty))
                    
                imported_count += 1
                    
        print(f"Import successful! Processed {imported_count} items.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during import: {e}")

import_data()
