#!/usr/bin/env python3
"""
Upload product images to Cloudflare R2 bucket.
"""

import os
import subprocess
from pathlib import Path

BUCKET = "lucky-store-images"
SOURCE_DIR = "catalog-images/sku-named"
PREFIX = "products/"  # Optional folder prefix in R2

def upload_file(local_path: str, object_name: str) -> bool:
    """Upload a single file to R2 using wrangler."""
    cmd = ["wrangler", "r2", "object", "put", f"{BUCKET}/{object_name}", "--file", local_path, "--remote"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    source_path = Path(SOURCE_DIR)
    webp_files = list(source_path.glob("*.webp"))
    
    print(f"Found {len(webp_files)} WebP files to upload")
    print(f"Bucket: {BUCKET}")
    print(f"Prefix: {PREFIX}")
    print("-" * 60)
    
    success = 0
    failed = 0
    
    for i, file in enumerate(webp_files, 1):
        object_name = f"{PREFIX}{file.name}"
        print(f"[{i}/{len(webp_files)}] Uploading {file.name}...", end=" ")
        
        if upload_file(str(file), object_name):
            print("✅")
            success += 1
        else:
            print("❌")
            failed += 1
    
    print("-" * 60)
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {len(webp_files)}")
    
    # Generate public URL example
    print("\n📦 Public URLs will be:")
    print(f"   https://imagedelivery.net/<your-account-id>/{BUCKET.replace('-', '/')}/{PREFIX}AF-AER-RSP.webp")
    print("   OR")
    print(f"   https://<your-r2-public-domain>/{PREFIX}AF-AER-RSP.webp")

if __name__ == "__main__":
    main()
