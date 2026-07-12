#!/usr/bin/env python3
"""
Download product images for Lucky Store missing images.
Searches Chaldal, Shwapno, and brand websites, then falls back to DuckDuckGo image search.
Saves images as SKU.jpg in the images/product_images/ directory.
"""

import os
import re
import sys
import time
import hashlib
from pathlib import Path
from urllib.parse import quote, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image

# Configuration
MISSING_IMAGES_FILE = "missing_images.md"
OUTPUT_DIR = "catalog-images/sku-named"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Bangladesh e-commerce sites to search (in priority order)
SEARCH_SITES = [
    ("Chaldal", "https://chaldal.com/search?q={query}"),
    ("Shwapno", "https://www.shwapno.com.bd/search?q={query}"),
]

# Brand-specific search patterns
BRAND_SITES = {
    "AER": "https://www.aer.com.bd/products/{product}",
    "Bellame": "https://bellame.com.bd/{product}",
    "Kazi": "https://kazifoods.com/{product}",
    "Igloo": "https://igloo.com.bd/{product}",
    "Savoy": "https://savoy.com.bd/{product}",
    "Cerelac": "https://nestle.com.bd/cerelac/{product}",
    "Nan": "https://nestle.com.bd/nan/{product}",
    "Kellogs": "https://kelloggs.com.bd/{product}",
    "Kitkat": "https://nestle.com.bd/kitkat/{product}",
    "Pampers": "https://pampers.com.bd/{product}",
    "Tang": "https://tang.com.bd/{product}",
}

# Session for connection pooling
session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


def parse_missing_images(filepath: str) -> list[dict]:
    """Parse the markdown file and extract product name + SKU pairs."""
    products = []
    current_category = None

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by category headers
    sections = re.split(r"^##\s+(.+)$", content, flags=re.MULTILINE)

    for i in range(1, len(sections), 2):
        category = sections[i].strip()
        table_content = sections[i + 1] if i + 1 < len(sections) else ""

        # Find all table rows (skip header rows)
        rows = re.findall(r"^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|", table_content, re.MULTILINE)

        for name, sku in rows:
            name = name.strip()
            sku = sku.strip()

            # Skip header rows and separator rows
            if name.lower() == "name" and sku.lower() == "sku":
                continue
            if name == "---" and sku == "---":
                continue

            products.append(
                {
                    "category": category,
                    "name": name,
                    "sku": sku,
                }
            )

    return products


def sanitize_filename(sku: str) -> str:
    """Sanitize SKU for use as filename."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", sku)


def get_image_hash(url: str) -> str:
    """Generate a hash of the image URL for deduplication."""
    return hashlib.md5(url.encode()).hexdigest()[:8]


def download_image(url: str, save_path: str) -> bool:
    """Download an image from URL to save_path."""
    try:
        response = session.get(url, timeout=15, stream=True)
        response.raise_for_status()

        # Check if it's actually an image
        content_type = response.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            # Try to detect from content
            if not url.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
                print(f"  ⚠️  Not an image: {content_type}")
                return False

        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return True
    except Exception as e:
        print(f"  ❌ Download failed: {e}")
        return False


def convert_to_webp(jpg_path: str, webp_path: str, quality: int = 85) -> bool:
    """Convert a JPG image to WebP format."""
    try:
        with Image.open(jpg_path) as img:
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            img.save(webp_path, "WEBP", quality=quality)
        
        # Report size savings
        jpg_size = os.path.getsize(jpg_path)
        webp_size = os.path.getsize(webp_path)
        savings = ((jpg_size - webp_size) / jpg_size) * 100 if jpg_size > 0 else 0
        print(f"  📦 WebP: {webp_size/1024:.1f}KB ({savings:.1f}% smaller)")
        return True
    except Exception as e:
        print(f"  ⚠️  WebP conversion failed: {e}")
        return False


def extract_image_from_search(html: str, source: str) -> str | None:
    """Extract the best product image URL from search results HTML."""
    soup = BeautifulSoup(html, "html.parser")

    if source == "Chaldal":
        # Chaldal: Look for real product images (not SVG placeholders)
        # Prefer high-res images from their CDN
        img_selectors = [
            "img.product-image[data-src]",
            ".product-card img[data-src]",
            ".product-list img[data-src]",
            "img[src*='chaldal.com']",
        ]
        fallback = None
        for selector in img_selectors:
            img = soup.select_one(selector)
            if img:
                src = img.get("data-src") or img.get("src")
                if src and isinstance(src, str) and src.startswith("http") and not src.endswith(".svg"):
                    # Prefer larger images
                    if "480" in src or "720" in src or "original" in src:
                        return src
                    # Store first valid non-SVG image as fallback
                    fallback = src

        # If found a non-SVG image, return it
        if fallback:
            return fallback

    elif source == "Shwapno":
        # Shwapno: Product grid images
        img_selectors = [
            "img.product-img",
            ".product-item img",
            ".product-grid img",
        ]
        for selector in img_selectors:
            img = soup.select_one(selector)
            if img:
                src = img.get("src") or img.get("data-src")
                if src and isinstance(src, str) and src.startswith("http") and not src.endswith(".svg"):
                    return src

    # Fallback: first reasonable image (not SVG, not icon/logo)
    images = soup.find_all("img")
    for img in images:
        src = img.get("src") or img.get("data-src")
        if src and isinstance(src, str) and src.startswith("http"):
            src_lower = src.lower()
            if not any(x in src_lower for x in [".svg", "icon", "logo", "banner", "ad", "sprite"]):
                return src

    return None


def search_chaldal(product_name: str) -> str | None:
    """Search Chaldal for the product and return best image URL."""
    query = quote(product_name.replace(" - ", " ").replace("(", "").replace(")", ""))
    url = f"https://chaldal.com/search?q={query}"

    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()

        img_url = extract_image_from_search(response.text, "Chaldal")
        if img_url:
            print(f"  ✓ Found on Chaldal")
            return img_url
    except Exception as e:
        print(f"  Chaldal search failed: {e}")

    return None


def search_shwapno(product_name: str) -> str | None:
    """Search Shwapno for the product and return best image URL."""
    query = quote(product_name.replace(" - ", " ").replace("(", "").replace(")", ""))
    url = f"https://www.shwapno.com.bd/search?q={query}"

    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()

        img_url = extract_image_from_search(response.text, "Shwapno")
        if img_url:
            print(f"  ✓ Found on Shwapno")
            return img_url
    except Exception as e:
        print(f"  Shwapno search failed: {e}")

    return None


def search_brand_site(product_name: str, brand: str) -> str | None:
    """Search brand-specific website if known."""
    if brand not in BRAND_SITES:
        return None

    template = BRAND_SITES[brand]
    query = quote(product_name.lower().replace(" ", "-").replace(" - ", "-"))
    url = template.format(product=query)

    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            img = soup.find("img", class_=re.compile(r"product|main|large", re.I))
            if img:
                src = img.get("src") or img.get("data-src")
                if src and src.startswith("http"):
                    print(f"  ✓ Found on {brand} site")
                    return src
    except Exception:
        pass

    return None


def detect_brand(product_name: str) -> str | None:
    """Detect brand from product name."""
    for brand in BRAND_SITES.keys():
        if brand.lower() in product_name.lower():
            return brand
    return None


def download_with_sku(product: dict, output_dir: str, dry_run: bool = False, webp_only: bool = False) -> dict:
    """Download image for a single product and optionally convert to WebP."""
    name = product["name"]
    sku = product["sku"]
    category = product["category"]

    safe_sku = sanitize_filename(sku)
    jpg_path = os.path.join(output_dir, f"{safe_sku}.jpg")
    webp_path = os.path.join(output_dir, f"{safe_sku}.webp")

    # Skip if WebP already exists (primary format)
    if os.path.exists(webp_path):
        return {"sku": sku, "status": "exists", "path": webp_path}

    if dry_run:
        print(f"  📋 Would search for: {name}")
        return {"sku": sku, "status": "dry_run", "name": name}

    print(f"\n[{sku}] {name}")

    # Strategy 1: Try brand site if brand is detectable
    brand = detect_brand(name)
    if brand:
        img_url = search_brand_site(name, brand)
        if img_url and download_image(img_url, jpg_path):
            if not webp_only:
                convert_to_webp(jpg_path, webp_path)
            # Clean up JPG if webp_only mode
            if webp_only and os.path.exists(jpg_path):
                os.remove(jpg_path)
            return {"sku": sku, "status": "success", "path": webp_path, "source": brand}

    # Strategy 2: Try Chaldal
    img_url = search_chaldal(name)
    if img_url and download_image(img_url, jpg_path):
        if not webp_only:
            convert_to_webp(jpg_path, webp_path)
        if webp_only and os.path.exists(jpg_path):
            os.remove(jpg_path)
        return {"sku": sku, "status": "success", "path": webp_path, "source": "Chaldal"}

    # Strategy 3: Try Shwapno
    img_url = search_shwapno(name)
    if img_url and download_image(img_url, jpg_path):
        if not webp_only:
            convert_to_webp(jpg_path, webp_path)
        if webp_only and os.path.exists(jpg_path):
            os.remove(jpg_path)
        return {"sku": sku, "status": "success", "path": webp_path, "source": "Shwapno"}

    # Strategy 4: DuckDuckGo image search (fallback)
    img_url = search_duckduckgo(name)
    if img_url and download_image(img_url, jpg_path):
        if not webp_only:
            convert_to_webp(jpg_path, webp_path)
        if webp_only and os.path.exists(jpg_path):
            os.remove(jpg_path)
        return {"sku": sku, "status": "success", "path": webp_path, "source": "DuckDuckGo"}

    return {"sku": sku, "status": "failed", "name": name}


def search_duckduckgo(product_name: str) -> str | None:
    """
    Search DuckDuckGo images for the product.
    Uses the html version and parses results.
    """
    query = quote(f"{product_name} product photo")
    url = f"https://duckduckgo.com/?q={query}&iax=images&ia=images"

    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()

        # DuckDuckGo loads images via JavaScript, so we need to look for embedded data
        # Look for VQD (search token) first
        vqd_match = re.search(r"vqd=['\"]?(\d+-\d+-\d+)['\"]?", response.text)
        if not vqd_match:
            # Alternative pattern
            vqd_match = re.search(r"vqd=['\"]?([^'\"&]+)['\"]?", response.text)

        if vqd_match:
            vqd = vqd_match.group(1)
            # Fetch actual image results
            api_url = f"https://duckduckgo.com/i.js?q={query}&vqd={vqd}&o=json"
            api_response = session.get(api_url, timeout=10)
            if api_response.status_code == 200:
                # Parse the JSON-like response
                match = re.search(r"DDG\.Instant\.response\((.+)\)", api_response.text)
                if match:
                    import json

                    data = json.loads(match.group(1))
                    results = data.get("results", [])
                    if results:
                        # Return the first image URL
                        img_url = results[0].get("image") or results[0].get("thumbnail")
                        if img_url:
                            print(f"  ✓ Found via DuckDuckGo")
                            return img_url
    except Exception as e:
        print(f"  DuckDuckGo search failed: {e}")

    return None


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Download product images for Lucky Store")
    parser.add_argument(
        "--input",
        default=MISSING_IMAGES_FILE,
        help=f"Input markdown file (default: {MISSING_IMAGES_FILE})",
    )
    parser.add_argument(
        "--output",
        default=OUTPUT_DIR,
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be downloaded without actually downloading",
    )
    parser.add_argument(
        "--sku",
        help="Download only this specific SKU",
    )
    parser.add_argument(
        "--category",
        help="Download only products from this category",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)",
    )
    parser.add_argument(
        "--webp-only",
        action="store_true",
        help="Download only WebP format (skip JPG)",
    )

    args = parser.parse_args()

    # Parse products
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    products = parse_missing_images(args.input)
    print(f"Found {len(products)} products in {args.input}")

    # Filter if requested
    if args.sku:
        products = [p for p in products if p["sku"] == args.sku]
        if not products:
            print(f"No product found with SKU: {args.sku}")
            sys.exit(1)

    if args.category:
        products = [p for p in products if args.category.lower() in p["category"].lower()]
        if not products:
            print(f"No products found in category: {args.category}")
            sys.exit(1)

    # Create output directory
    if not args.dry_run:
        os.makedirs(args.output, exist_ok=True)
        print(f"Output directory: {args.output}")

    # Process products
    results = {"success": 0, "failed": 0, "exists": 0, "dry_run": 0}

    for i, product in enumerate(products, 1):
        print(f"\n{'='*60}")
        print(f"Progress: {i}/{len(products)}")

        result = download_with_sku(product, args.output, dry_run=args.dry_run, webp_only=args.webp_only)
        status = result["status"]
        results[status] = results.get(status, 0) + 1

        if status == "success":
            print(f"  ✅ Downloaded: {result['path']} (from {result.get('source', 'unknown')})")
        elif status == "exists":
            print(f"  ⏭️  Already exists: {result['path']}")
        elif status == "failed":
            print(f"  ❌ Failed to find image for: {result.get('name', 'unknown')}")

        # Rate limiting
        if not args.dry_run and args.delay > 0:
            time.sleep(args.delay)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  ✅ Success: {results.get('success', 0)}")
    print(f"  ⏭️  Exists:  {results.get('exists', 0)}")
    print(f"  ❌ Failed:  {results.get('failed', 0)}")
    if args.dry_run:
        print(f"  📋 Dry run: {results.get('dry_run', 0)}")
    print(f"  📊 Total:   {len(products)}")

    # Save results log
    if not args.dry_run:
        log_path = os.path.join(args.output, "download_log.txt")
        with open(log_path, "w") as f:
            f.write("SKU\tStatus\tSource\tPath\n")
            # Would need to track all results properly
        print(f"\nLog saved to: {log_path}")


if __name__ == "__main__":
    main()
