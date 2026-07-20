#!/usr/bin/env python3
"""
Update products table with R2 image URLs via Supabase.
"""

import os
from pathlib import Path
from supabase import create_client

# Configuration
R2_BASE_URL = "https://images.luckystore1947.com/products"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hvmyxyccfnkrbxqbhlnm.supabase.co")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # set in env — never hardcode

SOURCE_DIR = "catalog-images/sku-named"

def main():
    # Connect to Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    source_path = Path(SOURCE_DIR)
    webp_files = list(source_path.glob("*.webp"))
    
    print(f"Found {len(webp_files)} WebP files to process")
    print(f"R2 Base URL: {R2_BASE_URL}")
    print(f"Supabase: {SUPABASE_URL}")
    print("-" * 60)
    
    success = 0
    failed = 0
    not_found = 0
    
    for i, file in enumerate(webp_files, 1):
        sku = file.name.replace(".webp", "")
        image_url = f"{R2_BASE_URL}/{file.name}"
        
        print(f"[{i}/{len(webp_files)}] {sku}...", end=" ")
        
        try:
            # Update product
            response = supabase.table("products").update({"image_url": image_url}).eq("sku", sku).execute()
            
            if response.data and len(response.data) > 0:
                print("✅")
                success += 1
            else:
                print("⚠️  Not found")
                not_found += 1
                
        except Exception as e:
            print(f"❌ {str(e)[:50]}")
            failed += 1
    
    print("-" * 60)
    print(f"✅ Updated: {success}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Not found: {not_found}")
    print(f"📊 Total: {len(webp_files)}")
    
    # Verify a few updates
    print("\n🔍 Verification (sample):")
    test_skus = ["AF-AER-RSP", "BY-PMP-BWV", "CC-SNK-GEN"]
    for sku in test_skus:
        resp = supabase.table("products").select("sku, image_url").eq("sku", sku).execute()
        if resp.data:
            url = resp.data[0].get("image_url", "none")
            short_url = url.split("/")[-1] if url else "none"
            print(f"  {sku}: {short_url}")

if __name__ == "__main__":
    main()
