# 4_upload_and_update.py
import os
import json
from supabase import create_client
import requests
from dotenv import load_dotenv
load_dotenv(dotenv_path='../../../apps/admin_web/.env.local')  # Get VITE_SUPABASE_URL
load_dotenv(dotenv_path='../../../.env.certify.staging')       # Get SUPABASE_SERVICE_ROLE_KEY

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "item-images"  # your existing bucket

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_image_to_storage(local_path, sku):
    """Upload thumbnail to Supabase Storage, return public URL"""
    with open(local_path, "rb") as f:
        file_ext = local_path.split(".")[-1]
        storage_path = f"items/{sku}.{file_ext}"
        
        # Upload
        supabase.storage.from_(BUCKET_NAME).upload(
            storage_path,
            f,
            file_options={"content-type": f"image/{file_ext}"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        return public_url

def main():
    # Load approved selections
    with open("approved_images.json") as f:
        approved = json.load(f)
    
    # Also need the mapping from SKU to item_id
    with open("missing_items.json") as f:
        items = {i["sku"]: i["id"] for i in json.load(f)}
    
    updates = []
    
    for entry in approved:
        sku = entry["sku"]
        item_id = items.get(sku)
        local_path = f"thumbnails/{sku}_*.jpg"  # You'll need to resolve the exact path
        
        # Find the actual thumbnail file
        import glob
        pattern = f"thumbnails/{sku}_*.jpg"
        matches = glob.glob(pattern)
        if not matches:
            pattern = f"thumbnails/{sku}_*.png"
            matches = glob.glob(pattern)
        if not matches:
            pattern = f"thumbnails/{sku}_*.webp"
            matches = glob.glob(pattern)
        
        if matches:
            local_path = matches[0]
            print(f"Uploading {sku}...")
            
            try:
                public_url = upload_image_to_storage(local_path, sku)
                
                # Update database
                supabase.table("items").update({"image_url": public_url}).eq("id", item_id).execute()
                print(f"  ✓ Updated {sku} -> {public_url[:60]}...")
                updates.append({"sku": sku, "status": "success", "url": public_url})
            except Exception as e:
                print(f"  ✗ Failed {sku}: {e}")
                updates.append({"sku": sku, "status": "error", "error": str(e)})
    
    with open("update_log.json", "w") as f:
        json.dump(updates, f, indent=2)
    
    print(f"\nDone! Updated {len([u for u in updates if u['status']=='success'])} items.")

if __name__ == "__main__":
    main()
