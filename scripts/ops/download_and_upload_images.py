#!/usr/bin/env python3
"""
Download competitor product images and upload to Supabase storage.
Update the items table with new image URLs.

Usage:
    python scripts/ops/download_and_upload_images.py [--dry-run] [--limit N]

Prerequisites:
    pip install requests supabase
"""

import os
import sys
import csv
import json
import time
import argparse
from pathlib import Path
from difflib import SequenceMatcher
import glob

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hvmyxyccfnkrbxqbhlnm.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET_NAME = "product-images"  # Created in migration 20260511070000
CSV_PATH = "data/inventory/Lucky Store Inventory with images - LS-inventory-01.csv"
DOWNLOAD_DIR = Path("/tmp/product_images")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def similar(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def token_set_similarity(a, b):
    tokens_a = set(a.lower().split())
    tokens_b = set(b.lower().split())
    if not tokens_a or not tokens_b:
        return 0
    return len(tokens_a & tokens_b) / len(tokens_a | tokens_b)

def find_best_match(name, pool, threshold=0.5):
    best_match = None
    best_score = 0
    best_url = None
    for pool_name, url in pool.items():
        seq_score = similar(name, pool_name)
        token_score = token_set_similarity(name, pool_name)
        combined = max(seq_score, token_score)
        if combined > best_score:
            best_score = combined
            best_match = pool_name
            best_url = url
    return (best_match, best_score, best_url) if best_score >= threshold else (None, 0, None)

def download_image(url, dest_path, timeout=30):
    """Download an image and save to disk."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        dest_path.write_bytes(resp.content)
        return True
    except Exception as e:
        print(f"    ERROR downloading {url}: {e}")
        return False

def get_image_mime_type(path):
    ext = path.suffix.lower()
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return mapping.get(ext, "image/jpeg")

def upload_to_supabase(local_path, storage_path, max_retries=3):
    """Upload a local file to Supabase storage bucket."""
    if not SUPABASE_SERVICE_KEY:
        print("    ERROR: SUPABASE_SERVICE_ROLE_KEY not set")
        return None

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"
    mime = get_image_mime_type(local_path)

    for attempt in range(max_retries):
        try:
            with open(local_path, "rb") as f:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": mime,
                    "x-upsert": "true",
                }
                resp = requests.post(url, headers=headers, data=f, timeout=60)
                if resp.status_code in (200, 201):
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
                    return public_url
                elif resp.status_code == 409:
                    # Already exists — build public URL anyway
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
                    return public_url
                else:
                    print(f"    UPLOAD attempt {attempt+1} failed: {resp.status_code} {resp.text[:100]}")
        except Exception as e:
            print(f"    UPLOAD attempt {attempt+1} error: {e}")
        time.sleep(2 ** attempt)

    return None

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Do not actually download/upload")
    parser.add_argument("--limit", type=int, default=0, help="Limit to N items")
    parser.add_argument("--min-confidence", type=float, default=0.5, help="Minimum match confidence")
    parser.add_argument("--high-conf-only", action="store_true", help="Only process high-confidence matches (>=0.7)")
    args = parser.parse_args()

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Load competitor image pools
    # ------------------------------------------------------------------
    print("Loading competitor image pools...")
    shwapno_pool = {}
    for csv_file in glob.glob("data/competitors/shwapno/*.csv"):
        with open(csv_file, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)
            name_idx = next((i for i, h in enumerate(headers) if h.strip().lower() == "name"), None)
            image_idx = next((i for i, h in enumerate(headers) if "image" in h.strip().lower()), None)
            if name_idx is not None and image_idx is not None:
                for row in reader:
                    if len(row) > max(name_idx, image_idx):
                        name = row[name_idx].strip()
                        url = row[image_idx].strip()
                        if url and url.lower() not in ("nan", "none", "null", ""):
                            shwapno_pool[name] = url

    chaldal_pool = {}
    with open("data/inventory/chaldal_catalog.json", "r") as f:
        for item in json.load(f):
            name = item.get("name", "").strip()
            url = item.get("image", "").strip()
            if name and url:
                chaldal_pool[name] = url

    print(f"  Shwapno: {len(shwapno_pool)} images")
    print(f"  Chaldal: {len(chaldal_pool)} images")

    # ------------------------------------------------------------------
    # 2. Load inventory and find missing images
    # ------------------------------------------------------------------
    print(f"\nLoading inventory from {CSV_PATH}...")
    missing_items = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = next(reader)
        for row in reader:
            image_val = row[10] if len(row) > 10 else ""
            if not image_val.strip() or image_val.strip().lower() in ("nan", "none", "null", ""):
                missing_items.append({
                    "name": row[0].strip(),
                    "category": row[1].strip(),
                    "brand": row[2].strip(),
                    "sku": row[8].strip(),
                })

    print(f"  Missing images: {len(missing_items)}")

    # ------------------------------------------------------------------
    # 3. Find matches
    # ------------------------------------------------------------------
    matches = []
    for item in missing_items:
        name = item["name"]
        match, score, url = find_best_match(name, shwapno_pool, threshold=args.min_confidence)
        source = "shwapno"
        if not match:
            match, score, url = find_best_match(name, chaldal_pool, threshold=args.min_confidence)
            source = "chaldal"

        if match:
            if args.high_conf_only and score < 0.7:
                continue
            matches.append({
                **item,
                "matched_name": match,
                "score": score,
                "url": url,
                "source": source,
            })

    print(f"\nMatches found: {len(matches)}")
    if args.limit:
        matches = matches[:args.limit]
        print(f"Limited to first {args.limit} matches")

    # ------------------------------------------------------------------
    # 4. Download & upload
    # ------------------------------------------------------------------
    results = []
    for i, m in enumerate(matches, 1):
        print(f"\n[{i}/{len(matches)}] {m['name']} (SKU: {m['sku']})")
        print(f"  Match: {m['matched_name']} ({m['score']:.2f}) [{m['source']}]")
        print(f"  URL: {m['url'][:80]}...")

        if args.dry_run:
            print("  [DRY RUN — skipping download/upload]")
            results.append({**m, "status": "dry_run", "public_url": None})
            continue

        # Determine file extension from URL
        ext = ".jpg"
        if ".png" in m["url"].lower():
            ext = ".png"
        elif ".webp" in m["url"].lower():
            ext = ".webp"
        elif ".gif" in m["url"].lower():
            ext = ".gif"

        safe_sku = m["sku"].replace("/", "_")
        filename = f"{safe_sku}{ext}"
        local_path = DOWNLOAD_DIR / filename

        # Download
        print(f"  Downloading to {local_path}...")
        if not download_image(m["url"], local_path):
            results.append({**m, "status": "download_failed", "public_url": None})
            continue

        file_size = local_path.stat().st_size
        print(f"  Downloaded: {file_size:,} bytes")

        if file_size > 5 * 1024 * 1024:
            print(f"  WARNING: File exceeds 5MB Supabase limit, skipping upload")
            results.append({**m, "status": "too_large", "public_url": None})
            continue

        # Upload
        storage_path = f"{m['category']}/{filename}".replace(" ", "_")
        print(f"  Uploading to Supabase as {storage_path}...")
        public_url = upload_to_supabase(local_path, storage_path)

        if public_url:
            print(f"  SUCCESS: {public_url}")
            results.append({**m, "status": "success", "public_url": public_url})
        else:
            print(f"  FAILED upload")
            results.append({**m, "status": "upload_failed", "public_url": None})

        # Small delay to be nice to servers
        time.sleep(0.5)

    # ------------------------------------------------------------------
    # 5. Save results
    # ------------------------------------------------------------------
    results_path = Path("/tmp/image_upload_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n\nResults saved to {results_path}")

    # Summary
    success = sum(1 for r in results if r["status"] == "success")
    failed = len(results) - success
    print(f"\n=== SUMMARY ===")
    print(f"  Total processed: {len(results)}")
    print(f"  Success:         {success}")
    print(f"  Failed:          {failed}")

    if not args.dry_run and success > 0:
        print(f"\nTo update the database, run the generated SQL or use Supabase dashboard:")
        print(f"  UPDATE items SET image_url = '<url>' WHERE sku = '<sku>';")

        # Generate SQL
        sql_path = Path("/tmp/update_image_urls.sql")
        with open(sql_path, "w") as f:
            f.write("-- Update image URLs for items with newly uploaded images\n")
            f.write("BEGIN;\n\n")
            for r in results:
                if r["status"] == "success" and r["public_url"]:
                    f.write(
                        f"UPDATE public.items SET image_url = '{r['public_url']}' WHERE sku = '{r['sku']}' AND (image_url IS NULL OR image_url = '');\n"
                    )
            f.write("\nCOMMIT;\n")
        print(f"\nSQL saved to {sql_path}")
        print(f"Execute with: psql <connection_string> -f {sql_path}")

if __name__ == "__main__":
    main()
