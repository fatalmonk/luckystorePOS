#!/usr/bin/env python3
"""
Convert existing CDN WebP product images to Meta Commerce Manager compliant JPEGs (>= 600x600px)
and generate an updated Meta catalog CSV.
Uses Playwright fallback to source high-resolution (1000px+) images for missing/SVG assets.
"""

import argparse
import csv
import io
import json
import os
import re
from typing import Optional
from urllib.parse import quote, urlparse

import requests
from PIL import Image, ImageOps

INPUT_CSV = "meta-catalog-review.csv"
OUTPUT_CSV = "meta-catalog-ready.csv"
OUTPUT_DIR = "catalog-images/meta-jpg"
CDN_BASE_URL = "https://images.luckystore1947.com/products"
MIN_META_DIM = 600  # Meta minimum is 500x500; 600x600 is recommended for Advantage+ catalog ads
MAX_META_BYTES = 8_000_000

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})

EXPECTED_PACK_PRICES: dict[str, float] = {
    "b1a686a7-9f23-47bf-8d78-925af6888271": 8000.0,
    "b54e03c0-3a1b-4818-a642-8520f907fca0": 2050.0,
    "ada03d73-0741-457c-a62c-6f46e21e4e1a": 2300.0,
    "439d9e4b-d7df-4705-87ab-ebb067f31065": 1750.0,
    "b209f469-8869-4a36-8e73-cf2fdeb833d3": 2800.0,
}

UNVERIFIED_BRAND_IDS: set[str] = {
    "84276fa4-e76e-4a56-9b2b-92c2b4ff81fd",
    "ada03d73-0741-457c-a62c-6f46e21e4e1a",
}


def extract_filename_stem(row_id: str, image_link: str, naming: str) -> str:
    """Use either the existing SKU filename from the CDN URL or the product UUID."""
    if naming == "sku" and "images.luckystore1947.com/products/" in image_link:
        path = urlparse(image_link).path
        base = os.path.splitext(os.path.basename(path))[0]
        if base and base != "default":
            return re.sub(r"[^a-zA-Z0-9_-]", "_", base)
    return re.sub(r"[^a-zA-Z0-9_-]", "_", row_id)


def normalize_to_meta_jpeg(raw_bytes: bytes, dest_path: str) -> tuple[bool, str]:
    """
    Convert raw image bytes (WebP/PNG/JPEG) to RGB JPEG on a pure white background.
    Pads or upscales images smaller than 600x600 so Meta never rejects them.
    """
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = ImageOps.exif_transpose(img)

            # Composite transparency onto pure white (#FFFFFF)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                alpha = img.convert("RGBA")
                canvas = Image.new("RGB", alpha.size, (255, 255, 255))
                canvas.paste(alpha, mask=alpha.split()[3])
                rgb_img = canvas
            else:
                rgb_img = img.convert("RGB")

            # Enforce minimum 600x600 square canvas with white padding if image is too small
            w, h = rgb_img.size
            if w < MIN_META_DIM or h < MIN_META_DIM:
                target_size = max(w, h, MIN_META_DIM)
                scale = (target_size * 0.85) / max(w, h)
                if scale > 1.0:
                    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
                    rgb_img = rgb_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    w, h = rgb_img.size

                square = Image.new("RGB", (target_size, target_size), (255, 255, 255))
                square.paste(rgb_img, ((target_size - w) // 2, (target_size - h) // 2))
                rgb_img = square

            os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
            rgb_img.save(dest_path, "JPEG", quality=92, optimize=True)

        size = os.path.getsize(dest_path)
        if size > MAX_META_BYTES:
            os.remove(dest_path)
            return False, f"Exceeds 8MB ({size} bytes)"

        return True, "ok"
    except Exception as e:
        return False, str(e)


def search_playwright_fallback(title: str, browser_page) -> Optional[str]:
    """Search Shwapno via Playwright for high-resolution 1920px asset."""
    if not browser_page:
        return None
    clean_title = re.sub(r"\(\d+\s*Pack\)", "", title, flags=re.I).strip()
    clean_title = clean_title.replace(" - ", " ").replace("(", "").replace(")", "")
    query = quote(clean_title)
    url = f"https://www.shwapno.com/search?q={query}"

    try:
        browser_page.goto(url, wait_until="domcontentloaded", timeout=12000)
        browser_page.wait_for_timeout(2000)
        imgs = browser_page.eval_on_selector_all("img", "elements => elements.map(e => e.src)")
        candidates = [
            s for s in imgs
            if "cloudfront.net" in s
            and not any(x in s for x in ["logo", "icon", "download", "banner", "svg", "payment"])
        ]
        if candidates:
            return re.sub(r"width=\d+", "width=1920", candidates[0])
    except Exception:
        pass
    return None


def process_row(
    row: dict[str, str],
    output_dir: str,
    cdn_base: str,
    naming: str,
    browser_page=None,
) -> tuple[str, str]:
    row_id = row["id"].strip()
    title = row["title"].strip()
    image_link = row["image_link"].strip()

    # Reuse existing image URL for known duplicate/variant rows with default.svg
    if row_id == "5ace9899-ff61-4667-8755-912bb945dbdf":  # Katari Atob Premium Loose
        image_link = "https://images.luckystore1947.com/products/RG-KTR-PRM.webp"
    elif row_id == "4fa3ff74-fd5e-435a-a5b4-bd4968018c0c":  # Doodles Masala 62g (24 Pack)
        image_link = "https://images.luckystore1947.com/products/SN-DOD-GEN-62G-2.webp"

    stem = extract_filename_stem(row_id, image_link, naming)
    dest_path = os.path.join(output_dir, f"{stem}.jpg")
    new_cdn_url = f"{cdn_base.rstrip('/')}/{stem}.jpg"

    if os.path.exists(dest_path):
        return "exists", new_cdn_url

    candidates: list[str] = []
    if image_link and not image_link.lower().endswith(".svg"):
        # Strip query parameters if present
        clean_url = image_link.split("?")[0]
        candidates.append(clean_url)

    if browser_page:
        pw_url = search_playwright_fallback(title, browser_page)
        if pw_url:
            candidates.append(pw_url)

    for url in candidates:
        try:
            resp = session.get(url, timeout=15)
            resp.raise_for_status()
            ok, reason = normalize_to_meta_jpeg(resp.content, dest_path)
            if ok:
                return "converted", new_cdn_url
            print(f"  ⚠️ Rejected {url}: {reason}")
        except Exception as e:
            print(f"  ⚠️ Failed fetching {url}: {e}")

    return "failed", image_link


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Meta Catalog JPEGs with Playwright fallback")
    parser.add_argument("--input", default=INPUT_CSV, help="Input CSV path")
    parser.add_argument("--output-csv", default=OUTPUT_CSV, help="Updated CSV with .jpg image_link")
    parser.add_argument("--output-dir", default=OUTPUT_DIR, help="Directory to save .jpg files")
    parser.add_argument("--cdn-base", default=CDN_BASE_URL, help="Base URL for updated image_link column")
    parser.add_argument(
        "--naming",
        choices=["sku", "id"],
        default="sku",
        help="Name files by existing SKU stem (CK-AAR-GHE-400G.jpg) or row UUID",
    )
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    with open(args.input, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    # Standardize column header: inventory -> quantity_to_sell_on_facebook
    if "inventory" in fieldnames:
        fieldnames = [col if col != "inventory" else "quantity_to_sell_on_facebook" for col in fieldnames]

    browser_page = None
    playwright = None
    browser = None
    try:
        from playwright.sync_api import sync_playwright
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(user_agent=USER_AGENT)
        browser_page = context.new_page()
    except Exception as e:
        print(f"Notice: Playwright browser not initialized, falling back to direct URLs: {e}")

    stats = {"converted": 0, "exists": 0, "failed": 0, "filtered": 0}
    updated_rows: list[dict[str, str]] = []

    try:
        for idx, row in enumerate(rows, 1):
            row_id = row.get("id", "").strip()

            # Exclude unverified brand packaging
            if row_id in UNVERIFIED_BRAND_IDS:
                stats["filtered"] += 1
                continue

            # Ensure pack price safeguards
            if row_id in EXPECTED_PACK_PRICES:
                row["price"] = f"{EXPECTED_PACK_PRICES[row_id]:.2f} BDT"

            # Rename inventory -> quantity_to_sell_on_facebook in row dict
            if "inventory" in row:
                row["quantity_to_sell_on_facebook"] = row.pop("inventory")

            status, final_url = process_row(row, args.output_dir, args.cdn_base, args.naming, browser_page)
            stats[status] = stats.get(status, 0) + 1
            row["image_link"] = final_url
            updated_rows.append(row)
    finally:
        if browser:
            browser.close()
        if playwright:
            playwright.stop()

    with open(args.output_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(
        f"\nDone! Converted: {stats['converted']} | Cached: {stats['exists']} | Filtered: {stats['filtered']} | Failed: {stats['failed']}\n"
        f"Images saved to: {args.output_dir}/\n"
        f"Updated Meta feed saved to: {args.output_csv}"
    )


if __name__ == "__main__":
    main()