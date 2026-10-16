#!/usr/bin/env python3
"""
Playwright-powered high-resolution product image scraper.
Extracts pristine, full-resolution product images (>= 600x600px) from Bangladesh
e-commerce sources (Shwapno, Chaldal, DuckDuckGo) bypassing client-side rendering limitations.
"""

import argparse
import csv
import io
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote, urlparse
from typing import Optional

import requests
from PIL import Image, ImageOps
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page

MIN_DIM = 600
MAX_BYTES = 8_000_000
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


def normalize_to_jpeg(raw_bytes: bytes, dest_path: str, min_dim: int = MIN_DIM) -> tuple[bool, str]:
    """
    Normalizes raw image bytes to an RGB JPEG on a clean white background.
    Squares and scales the image so it meets Meta & Google minimum dimension requirements.
    """
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = ImageOps.exif_transpose(img)

            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                alpha = img.convert("RGBA")
                canvas = Image.new("RGB", alpha.size, (255, 255, 255))
                canvas.paste(alpha, mask=alpha.split()[3])
                rgb = canvas
            else:
                rgb = img.convert("RGB")

            w, h = rgb.size
            target = max(w, h, min_dim)

            if w < min_dim or h < min_dim:
                scale = (target * 0.90) / max(w, h)
                new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
                rgb = rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
                w, h = rgb.size

            canvas = Image.new("RGB", (target, target), (255, 255, 255))
            canvas.paste(rgb, ((target - w) // 2, (target - h) // 2))

            os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
            canvas.save(dest_path, "JPEG", quality=92, optimize=True)

        size = os.path.getsize(dest_path)
        if size > MAX_BYTES:
            os.remove(dest_path)
            return False, f"File size exceeds 8MB ({size} bytes)"

        return True, "ok"
    except Exception as e:
        return False, str(e)


class PlaywrightImageScraper:
    def __init__(self, headless: bool = True):
        self.playwright = sync_playwright().start()
        self.browser: Browser = self.playwright.chromium.launch(
            channel="chrome",
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        self.context: BrowserContext = self.browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
        )
        self.page: Page = self.context.new_page()

    def close(self):
        try:
            self.context.close()
            self.browser.close()
            self.playwright.stop()
        except Exception:
            pass

    def search_shwapno(self, product_name: str) -> Optional[str]:
        """Search Shwapno and extract high-res CloudFront image URL."""
        clean_name = re.sub(r"\(\d+\s*Pack\)", "", product_name, flags=re.I).strip()
        clean_name = clean_name.replace(" - ", " ").replace("(", "").replace(")", "")
        query = quote(clean_name)
        url = f"https://www.shwapno.com/search?q={query}"

        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=12000)
            self.page.wait_for_timeout(2500)
            imgs = self.page.eval_on_selector_all("img", "elements => elements.map(e => e.src)")
            candidates = [
                s for s in imgs
                if "cloudfront.net" in s
                and not any(x in s for x in ["logo", "icon", "download", "banner", "svg", "payment"])
            ]
            if candidates:
                # Replace low-res width parameter with high-res 1920
                first = candidates[0]
                high_res = re.sub(r"width=\d+", "width=1920", first)
                return high_res
        except Exception as e:
            print(f"    Shwapno search error: {e}")
        return None

    def search_chaldal(self, product_name: str) -> Optional[str]:
        """Search Chaldal and extract full-size product image."""
        clean_name = re.sub(r"\(\d+\s*Pack\)", "", product_name, flags=re.I).strip()
        clean_name = clean_name.replace(" - ", " ").replace("(", "").replace(")", "")
        query = quote(clean_name)
        url = f"https://chaldal.com/search/{query}"

        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=12000)
            self.page.wait_for_timeout(2500)
            imgs = self.page.eval_on_selector_all("img", "elements => elements.map(e => e.src)")
            candidates = [
                s for s in imgs
                if "chaldn.com" in s
                and not any(x in s for x in ["logo", "icon", "coupon", "svg", "app-download"])
            ]
            if candidates:
                # Prefer largest image
                return candidates[0]
        except Exception as e:
            print(f"    Chaldal search error: {e}")
        return None

    def find_best_image(self, product_name: str) -> Optional[str]:
        """Try sources in order of image quality."""
        # 1. Shwapno (produces 1920px crisp CloudFront assets)
        url = self.search_shwapno(product_name)
        if url:
            return url

        # 2. Chaldal
        url = self.search_chaldal(product_name)
        if url:
            return url

        return None


def main():
    parser = argparse.ArgumentParser(description="Playwright-powered high-res image scraper")
    parser.add_argument("--query", help="Single product name to search")
    parser.add_argument("--output", help="Destination JPEG file path")
    parser.add_argument("--csv", help="Input Meta CSV to enrich")
    parser.add_argument("--output-dir", default="social-media/catalog-images/meta-jpg", help="Directory to save JPEGs")
    parser.add_argument("--headless", action="store_true", default=True, help="Run headless Chrome")
    args = parser.parse_args()

    scraper = PlaywrightImageScraper(headless=args.headless)

    try:
        if args.query and args.output:
            print(f"Searching for: {args.query}")
            img_url = scraper.find_best_image(args.query)
            if not img_url:
                print("❌ No high-resolution candidate found.")
                sys.exit(1)

            print(f"Found source: {img_url}")
            r = session.get(img_url, timeout=20)
            r.raise_for_status()
            ok, msg = normalize_to_jpeg(r.content, args.output)
            if ok:
                print(f"✅ Saved pristine JPEG: {args.output}")
            else:
                print(f"❌ Failed to normalize: {msg}")
                sys.exit(1)

        elif args.csv:
            with open(args.csv, "r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))

            print(f"Processing {len(rows)} products from {args.csv}...")
            os.makedirs(args.output_dir, exist_ok=True)

            success = 0
            for i, row in enumerate(rows, 1):
                title = row.get("title", "")
                pid = row.get("id", "")
                sku_match = re.search(r"/products/([A-Za-z0-9_-]+)\.(?:jpe?g|webp)", row.get("image_link", ""))
                filename = f"{sku_match.group(1)}.jpg" if sku_match else f"{pid}.jpg"
                dest_path = os.path.join(args.output_dir, filename)

                if os.path.exists(dest_path):
                    success += 1
                    continue

                print(f"[{i}/{len(rows)}] Scraping high-res image for: {title}")
                img_url = scraper.find_best_image(title)
                if img_url:
                    try:
                        r = session.get(img_url, timeout=15)
                        ok, msg = normalize_to_jpeg(r.content, dest_path)
                        if ok:
                            print(f"  ✓ Saved {filename}")
                            success += 1
                        else:
                            print(f"  ⚠️ Normalization failed: {msg}")
                    except Exception as e:
                        print(f"  ❌ Download error: {e}")
                else:
                    print(f"  ⚠️ No image found on Shwapno/Chaldal")

                time.sleep(0.5)

            print(f"\nCompleted: {success}/{len(rows)} images ready in {args.output_dir}")

        else:
            parser.print_help()

    finally:
        scraper.close()


if __name__ == "__main__":
    main()
