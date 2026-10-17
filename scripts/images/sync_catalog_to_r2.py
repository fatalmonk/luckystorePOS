#!/usr/bin/env python3
"""
Sync upgraded product images (JPG and WebP) to Cloudflare R2 bucket `lucky-store-images/products/`.
"""

import os
import glob
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BUCKET = "lucky-store-images"
PREFIX = "products/"
WORKER_CWD = os.path.abspath("cloudflare/workers/competitor-scraper")

JPG_DIR = os.path.abspath("social-media/catalog-images/meta-jpg")
WEBP_DIR = os.path.abspath("social-media/catalog-images/meta-webp")

def upload_file(args):
    local_path, object_name, content_type = args
    cmd = [
        "npx", "wrangler", "r2", "object", "put",
        f"{BUCKET}/{object_name}",
        "-f", local_path,
        "--ct", content_type,
        "--cc", "public, max-age=31536000, immutable",
        "--remote"
    ]
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            res = subprocess.run(
                cmd,
                cwd=WORKER_CWD,
                capture_output=True,
                text=True,
                timeout=30
            )
            if res.returncode == 0:
                return (True, object_name, None)
            else:
                err = res.stderr.strip() or res.stdout.strip()
                if attempt == max_retries:
                    return (False, object_name, err)
                time.sleep(1 * attempt)
        except Exception as e:
            if attempt == max_retries:
                return (False, object_name, str(e))
            time.sleep(1 * attempt)

def main():
    tasks = []
    
    # Collect JPGs
    for jpg in sorted(glob.glob(os.path.join(JPG_DIR, "*.jpg"))):
        fname = os.path.basename(jpg)
        tasks.append((jpg, f"{PREFIX}{fname}", "image/jpeg"))
        
    # Collect WebPs
    for webp in sorted(glob.glob(os.path.join(WEBP_DIR, "*.webp"))):
        fname = os.path.basename(webp)
        tasks.append((webp, f"{PREFIX}{fname}", "image/webp"))
        
    print(f"Total files to upload: {len(tasks)} (JPG: {len(tasks)//2}, WebP: {len(tasks)//2})")
    
    success_count = 0
    fail_count = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(upload_file, task): task for task in tasks}
        for future in as_completed(futures):
            ok, obj_name, err = future.result()
            if ok:
                success_count += 1
                if success_count % 25 == 0 or success_count == len(tasks):
                    print(f"Uploaded {success_count}/{len(tasks)} objects...")
            else:
                fail_count += 1
                print(f"FAILED: {obj_name} - {err}")
                
    elapsed = time.time() - start_time
    print(f"\nUpload complete in {elapsed:.1f}s.")
    print(f"Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    main()
