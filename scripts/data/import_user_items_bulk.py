import psycopg2
from psycopg2.extras import execute_values
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

        # Get existing items by sku
        cur.execute("SELECT sku, id FROM items;")
        existing_items = {row[0]: row[1] for row in cur.fetchall()}
        
        # Get existing stock levels
        cur.execute("SELECT item_id, qty FROM stock_levels WHERE store_id = %s;", (store_id,))
        existing_stock = {row[0]: row[1] for row in cur.fetchall()}

        items_to_insert = []
        items_to_update = []
        stock_to_insert = []
        stock_to_update = []

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
                
                if sku in existing_items:
                    item_id = existing_items[sku]
                    items_to_update.append((name, cat_id, description, brand, cost, price, mrp, item_id))
                else:
                    item_id = str(uuid.uuid4())
                    existing_items[sku] = item_id # For subsequent stock update
                    items_to_insert.append((item_id, sku, name, cat_id, description, brand, cost, price, mrp, True))
                    
                if item_id in existing_stock:
                    stock_to_update.append((stock_qty, store_id, item_id))
                else:
                    stock_to_insert.append((store_id, item_id, stock_qty))
                    existing_stock[item_id] = stock_qty
                    
                imported_count += 1
        
        # Bulk Insert Items
        if items_to_insert:
            execute_values(cur, """
                INSERT INTO items (id, sku, name, category_id, description, brand, cost, price, mrp, active)
                VALUES %s
            """, items_to_insert)
            print(f"Inserted {len(items_to_insert)} items.")
            
        # Bulk Update Items
        if items_to_update:
            execute_values(cur, """
                UPDATE items SET name=data.name, category_id=data.category_id::uuid, description=data.description, brand=data.brand, cost=data.cost::numeric, price=data.price::numeric, mrp=data.mrp::numeric
                FROM (VALUES %s) AS data(name, category_id, description, brand, cost, price, mrp, item_id)
                WHERE items.id = data.item_id::uuid
            """, items_to_update)
            print(f"Updated {len(items_to_update)} items.")
            
        # Bulk Insert Stock
        if stock_to_insert:
            execute_values(cur, """
                INSERT INTO stock_levels (store_id, item_id, qty)
                VALUES %s
            """, stock_to_insert)
            print(f"Inserted {len(stock_to_insert)} stock records.")
            
        # Bulk Update Stock
        if stock_to_update:
            execute_values(cur, """
                UPDATE stock_levels SET qty=data.qty::int
                FROM (VALUES %s) AS data(qty, store_id, item_id)
                WHERE stock_levels.store_id = data.store_id::uuid AND stock_levels.item_id = data.item_id::uuid
            """, stock_to_update)
            print(f"Updated {len(stock_to_update)} stock records.")

        print(f"Import successful! Processed {imported_count} total rows.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during bulk import: {e}")

import_data()
