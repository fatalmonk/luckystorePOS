# 1_export_missing.py
import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv(dotenv_path='../../../apps/admin_web/.env.local')

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")  # anon key

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch items with null image_url
response = supabase.table("items") \
    .select("id, name, sku, category_id") \
    .is_("image_url", "null") \
    .execute()

missing_items = response.data

import json
with open("missing_items.json", "w") as f:
    json.dump(missing_items, f, indent=2)

print(f"Exported {len(missing_items)} items")
