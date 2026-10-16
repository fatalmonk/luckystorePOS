#!/usr/bin/env python3
"""
Convert existing CDN WebP product images to Meta Commerce Manager compliant JPEGs (>= 600x600px)
and generate an updated Meta catalog CSV. Falls back to web search for missing/SVG placeholders.
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
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

INPUT_CSV = "meta-catalog-review.csv"
OUTPUT_CSV = "meta-catalog-ready.csv"
OUTPUT_DIR = "catalog-images/meta-jpg"
CDN_BASE_URL = "https://images.luckystore1947.com/meta-products"
MIN_META_DIM = 600  # Meta minimum is 500x500; 600x600 is recommended for Advantage+ catalog ads
MAX_META_BYTES = 8_000_000

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


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
                # Scale up proportionally so product fills at least 85% of the frame
                scale = (target_size * 0.85) / max(w, h)
                if scale > 1.0:
                    new_w, new_h = int(w * scale), int(h * scale)
                    rgb_img = rgb_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    w, h = rgb_img.size

                square = Image.new("RGB", (target_size, target_size), (255, 255, 255))
                square.paste(rgb_img, ((target_size - w) // 2, (target_size - h) // 2))
                rgb_img = square

            rgb_img.save(dest_path, "JPEG", quality=92, optimize=True)

        size = os.path.getsize(dest_path)
        if size > MAX_META_BYTES:
            os.remove(dest_path)
            return False, f"Exceeds 8MB ({size} bytes)"

        return True, "ok"
    except Exception as e:
        return False, str(e)


def search_fallback_image(title: str) -> Optional[str]:
    """Search Chaldal and DuckDuckGo when CDN link is default.svg."""
    clean_title = re.sub(r"\(\d+\s*Pack\)", "", title, flags=re.I).strip()
    query = quote(clean_title)

    # 1. Try Chaldal
    try:
        resp = session.get(f"https://chaldal.com/search?q={query}", timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for img in soup.select("img[src*='chaldal.com'], img[data-src*='chaldal.com']"):
                src = img.get("data-src") or img.get("src")
                if isinstance(src, str) and src.startswith("http") and not src.endswith(".svg"):
                    return src
    except Exception:
        pass

    # 2. Try DuckDuckGo
    try:
        ddg_query = quote(f"{clean_title} Bangladesh grocery")
        resp = session.get(f"https://duckduckgo.com/?q={ddg_query}&iax=images&ia=images", timeout=10)
        vqd_match = re.search(r"vqd=['\"]?([^'\"&]+)['\"]?", resp.text)
        if vqd_match:
            vqd = vqd_match.group(1)
            api_resp = session.get(
                f"https://duckduckgo.com/i.js?q={ddg_query}&vqd={vqd}&o=json",
                headers={"Referer": "https://duckduckgo.com/"},
                timeout=10,
            )
            if api_resp.status_code == 200:
                raw = api_resp.text.strip()
                if raw.startswith("DDG.Instant.response("):
                    raw = raw[21:-2]
                results = json.loads(raw).get("results", [])
                if results:
                    return results[0].get("image") or results[0].get("thumbnail")
    except Exception:
        pass

    return None


def process_row(row: dict[str, str], output_dir: str, cdn_base: str, naming: str) -> tuple[str, str]:
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

    # Candidate URLs to try: first the existing CDN WebP (if not SVG), then web fallback
    candidates: list[str] = []
    if image_link and not image_link.lower().endswith(".svg"):
        candidates.append(image_link)

    fallback_url = search_fallback_image(title)
    if fallback_url:
        candidates.append(fallback_url)

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
    parser = argparse.ArgumentParser(description="Prepare Meta Catalog JPEGs from meta-catalog-review.csv")
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
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    stats = {"converted": 0, "exists": 0, "failed": 0}
    updated_rows: list[dict[str, str]] = []

    for idx, row in enumerate(rows, 1):
        print(f"[{idx}/{len(rows)}] {row['title']}")
        status, final_url = process_row(row, args.output_dir, args.cdn_base, args.naming)
        stats[status] = stats.get(status, 0) + 1
        row["image_link"] = final_url
        updated_rows.append(row)

    with open(args.output_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(
        f"\nDone! Converted: {stats['converted']} | Cached: {stats['exists']} | Failed: {stats['failed']}\n"
        f"Images saved to: {args.output_dir}/\n"
        f"Updated Meta feed saved to: {args.output_csv}"
    )


if __name__ == "__main__":
    main()