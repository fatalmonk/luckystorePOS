import psycopg2

def introspect():
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres.hvmyxyccfnkrbxqbhlnm",
            password="FsmHPpbIU4SYVPk2", 
            host="aws-1-ap-northeast-1.pooler.supabase.com",
            port="5432"
        )
        cur = conn.cursor()
        
        # Get items table schema
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'items';
        """)
        columns = cur.fetchall()
        print("Items Table Columns:")
        for col in columns:
            print(f"  {col[0]}: {col[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

introspect()
