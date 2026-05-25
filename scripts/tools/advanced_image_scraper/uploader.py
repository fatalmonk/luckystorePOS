#!/usr/bin/env python3
"""
Lucky Store — Upload Approved Images to Supabase
=================================================
Reads approved_images.json (output from review dashboard),
uploads each image to Supabase Storage, updates items.image_url in DB.

Usage:
    export SUPABASE_URL=https://hvmyxyccfnkrbxqbhlnm.supabase.co
    export SUPABASE_KEY=your_service_role_key
    python uploader.py
"""

import os, json, time, mimetypes, logging
from pathlib import Path
from dotenv import load_dotenv
import requests
load_dotenv(dotenv_path='../../../apps/admin_web/.env.local')
load_dotenv(dotenv_path='../../../.env.certify.staging')

SUPABASE_URL    = os.getenv("VITE_SUPABASE_URL", "https://hvmyxyccfnkrbxqbhlnm.supabase.co")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET  = "item-images"
APPROVED_FILE   = Path("scraper_output/approved_images.json")
UPDATE_LOG_FILE = Path("scraper_output/update_log.json")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def get_headers(content_type=None):
    h = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    if content_type:
        h["Content-Type"] = content_type
    return h


def upload_image(local_path: str, sku: str) -> str | None:
    """Upload image to Supabase Storage, return public URL or None"""
    fpath = Path(local_path)
    if not fpath.exists():
        log.error(f"  File not found: {local_path}")
        return None

    ext = fpath.suffix.lstrip(".")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png",  "webp": "image/webp"}.get(ext, "image/jpeg")

    storage_path = f"items/{sku.replace('/', '_')}.{ext}"
    upload_url   = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"

    with open(fpath, "rb") as f:
        data = f.read()

    # Try upsert (overwrite if exists)
    r = requests.post(
        upload_url,
        headers={**get_headers(mime), "x-upsert": "true"},
        data=data,
        timeout=30,
    )

    if r.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"
        log.info(f"  ✓ Uploaded → {public_url}")
        return public_url
    else:
        log.error(f"  ✗ Upload failed: {r.status_code} {r.text[:200]}")
        return None


def update_db(item_id: str, image_url: str) -> bool:
    """Update items.image_url in Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/items?id=eq.{item_id}"
    r = requests.patch(
        url,
        headers={**get_headers("application/json"), "Prefer": "return=minimal"},
        json={"image_url": image_url},
        timeout=15,
    )
    if r.status_code in (200, 204):
        return True
    else:
        log.error(f"  ✗ DB update failed: {r.status_code} {r.text[:200]}")
        return False


def main():
    if not SUPABASE_KEY:
        log.error("SUPABASE_KEY not set. Export it before running.")
        return

    if not APPROVED_FILE.exists():
        log.error(f"No approved_images.json found at {APPROVED_FILE}")
        log.error("Run the review dashboard first and export approvals.")
        return

    with open(APPROVED_FILE) as f:
        approved = json.load(f)

    log.info(f"Uploading {len(approved)} approved images...")
    update_log = []

    for entry in approved:
        sku      = entry["sku"]
        item_id  = entry["item_id"]
        local    = entry["local_thumbnail"]
        conf     = entry.get("confidence", "?")

        log.info(f"[{sku}] {entry.get('db_name','')} (confidence={conf})")

        local_path = os.path.join("thumbnails", os.path.basename(local))
        public_url = upload_image(local_path, sku)
        if public_url:
            ok = update_db(item_id, public_url)
            update_log.append({
                "sku": sku, "item_id": item_id,
                "status": "success" if ok else "upload_ok_db_fail",
                "public_url": public_url,
                "confidence": conf,
            })
        else:
            update_log.append({
                "sku": sku, "item_id": item_id,
                "status": "upload_failed",
                "public_url": None,
                "confidence": conf,
            })
        time.sleep(0.3)  # rate limit

    with open(UPDATE_LOG_FILE, "w") as f:
        json.dump(update_log, f, indent=2)

    success = sum(1 for e in update_log if e["status"] == "success")
    failed  = len(update_log) - success
    log.info("=" * 50)
    log.info(f"Done! Success: {success} | Failed: {failed}")
    log.info(f"Log saved to: {UPDATE_LOG_FILE}")

    # Verify: count remaining nulls via API
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/items?select=id&image_url=is.null&is_active=eq.true",
        headers=get_headers(),
        timeout=15,
    )
    if r.status_code == 200:
        remaining = len(r.json())
        log.info(f"Remaining items with null image_url: {remaining}")


if __name__ == "__main__":
    main()
