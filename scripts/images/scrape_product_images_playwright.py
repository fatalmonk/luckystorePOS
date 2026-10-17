#!/usr/bin/env python3
"""
Playwright-powered high-resolution product image scraper with Jev text ranking.
Finds candidate images from Bangladesh e-commerce sources (Shwapno and Chaldal).
Images require manual visual packaging review before catalog use.
"""

import argparse
import csv
import io
import json
import os
import re
import subprocess
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
JEV_BIN = os.path.expanduser("~/.local/bin/jev")

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


def rank_with_jev(target_product: str, candidates: list[dict]) -> Optional[str]:
    """
    Uses `jev search` to semantically score candidate product cards against the target title.
    Returns the URL of the most relevant candidate if relevance >= 0.5.
    """
    if not candidates:
        return None

    if not os.path.isfile(JEV_BIN):
        return None

    try:
        results_payload = [
            {
                "id": str(i),
                "title": c.get("title") or "Product Image",
                "url": c["img"],
                "snippet": f"Product search result matching {c.get('title')}",
            }
            for i, c in enumerate(candidates)
        ]

        jev_request = {
            "question": f"Which product image corresponds accurately to {target_product}?",
            "queries_tried": [target_product],
            "candidate_queries": [],
            "round_index": 1,
            "results": results_payload,
        }

        proc = subprocess.run(
            [JEV_BIN, "search"],
            input=json.dumps(jev_request),
            capture_output=True,
            text=True,
            timeout=10,
        )

        if proc.returncode != 0:
            return None
        res = json.loads(proc.stdout)
        if (res.get("status") != "ok" or res.get("screening") != "jev+local"
                or res.get("decision") != "answer" or res.get("sufficient") is not True):
            return None
        selected_ids = res.get("selected_ids", [])
        if not selected_ids:
            return None
        selected_id = selected_ids[0]
        if not isinstance(selected_id, str) or not selected_id.isdecimal():
            return None
        index = int(selected_id)
        if index >= len(candidates):
            return None
        for blocked_key in ("dropped_injection_ids", "local_screen_ids", "unjudged_ids"):
            if selected_id in res.get(blocked_key, []):
                return None
        score = res.get("scores", {}).get(selected_id, {}).get("relevance")
        if not isinstance(score, (int, float)) or isinstance(score, bool) or not 0.5 <= score <= 1:
            return None
        return candidates[index]["img"]
    except (OSError, ValueError, TypeError, KeyError, subprocess.TimeoutExpired) as e:
        print(f"    Notice: Jev selection unavailable: {e}")
    return None


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


def stage_candidate_image(img_url: str, dest_path: Path) -> Optional[Path]:
    """Keep catalog images intact; downloaded candidates require packaging review."""
    review_path = dest_path.parent / "review" / dest_path.name
    if dest_path.exists() or review_path.exists():
        return None
    response = session.get(img_url, timeout=15)
    response.raise_for_status()
    ok, msg = normalize_to_jpeg(response.content, str(review_path))
    if not ok:
        raise ValueError(f"Normalization failed: {msg}")
    return review_path


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
        """Search Shwapno and extract high-res CloudFront image URL with Jev ranking."""
        clean_name = re.sub(r"\(\d+\s*Pack\)", "", product_name, flags=re.I).strip()
        clean_name = clean_name.replace(" - ", " ").replace("(", "").replace(")", "")
        query = quote(clean_name)
        url = f"https://www.shwapno.com/search?q={query}"

        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=12000)
            self.page.wait_for_timeout(2500)

            # Scoped extraction from .product-box containers only
            cards = self.page.eval_on_selector_all(
                "div.product-box",
                """elements => elements.slice(0, 10).map(e => {
                    const title = e.querySelector('.product-box-title, h2, h3, a')?.innerText.trim() || '';
                    const img = e.querySelector('img[src*="cloudfront.net"]')?.src.replace(/width=\\d+/, 'width=1000') || '';
                    return { title, img };
                }).filter(x => x.img && !x.img.includes('default-product') && !x.img.includes('.svg'))"""
            )

            if cards:
                chosen_url = rank_with_jev(product_name, cards)
                if chosen_url:
                    return chosen_url
        except Exception as e:
            print(f"    Shwapno search error: {e}")
        return None

    def search_chaldal(self, product_name: str) -> Optional[str]:
        """Search Chaldal and extract full-size product image with Jev ranking."""
        clean_name = re.sub(r"\(\d+\s*Pack\)", "", product_name, flags=re.I).strip()
        clean_name = clean_name.replace(" - ", " ").replace("(", "").replace(")", "")
        query = quote(clean_name)
        url = f"https://chaldal.com/search/{query}"

        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=12000)
            self.page.wait_for_timeout(2500)
            cards = self.page.eval_on_selector_all(
                "div.productPane, div.product",
                """elements => elements.slice(0, 10).map(e => {
                    const title = e.querySelector('.name, h2, h3, div[class*="name"]')?.innerText.trim() || '';
                    const img = e.querySelector('img[src*="chaldn.com/_mpimage"]')?.src || '';
                    return { title, img };
                }).filter(x => x.img && !x.img.includes('.svg'))"""
            )
            if cards:
                chosen_url = rank_with_jev(product_name, cards)
                if chosen_url:
                    return chosen_url
        except Exception as e:
            print(f"    Chaldal search error: {e}")
        return None

    def find_best_image(self, product_name: str) -> Optional[str]:
        """Try sources in order of image quality."""
        url = self.search_shwapno(product_name)
        if url:
            return url

        url = self.search_chaldal(product_name)
        if url:
            return url

        return None


def main():
    parser = argparse.ArgumentParser(description="Playwright image candidate scraper with Jev text ranking")
    parser.add_argument("--query", help="Single product name to search")
    parser.add_argument("--output", help="Destination JPEG file path")
    parser.add_argument("--csv", help="Input Meta CSV to enrich")
    parser.add_argument("--output-dir", default="social-media/catalog-images/meta-jpg", help="Directory to save JPEGs")
    parser.add_argument("--headless", action="store_true", default=True, help="Run headless Chrome")
    args = parser.parse_args()

    scraper = PlaywrightImageScraper(headless=args.headless)

    try:
        if args.query and args.output:
            if Path(args.output).exists():
                parser.error(f"Output already exists; refusing to replace: {args.output}")
            print(f"Searching for: {args.query}")
            img_url = scraper.find_best_image(args.query)
            if not img_url:
                print("❌ No high-resolution candidate found.")
                sys.exit(1)

            print(f"Found candidate source: {img_url}")
            try:
                staged = stage_candidate_image(img_url, Path(args.output))
                if not staged:
                    parser.error("Candidate already staged; refusing to replace it")
                print(f"Staged for manual packaging review: {staged}")
            except (requests.RequestException, ValueError) as e:
                print(f"Failed to stage candidate: {e}")
                sys.exit(1)

        elif args.csv:
            with open(args.csv, "r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))

            print(f"Processing {len(rows)} products from {args.csv}...")
            os.makedirs(args.output_dir, exist_ok=True)

            staged_count = 0
            for i, row in enumerate(rows, 1):
                title = row.get("title", "")
                pid = row.get("id", "")
                sku_match = re.search(r"/products/([A-Za-z0-9_-]+)\.(?:jpe?g|webp)", row.get("image_link", ""))
                filename = f"{sku_match.group(1)}.jpg" if sku_match else f"{pid}.jpg"
                dest_path = Path(args.output_dir) / filename
                if dest_path.exists() or (dest_path.parent / "review" / filename).exists():
                    print(f"[{i}/{len(rows)}] Skipping existing image/candidate: {filename}")
                    continue

                print(f"[{i}/{len(rows)}] Searching for candidate: {title}")
                img_url = scraper.find_best_image(title)
                if img_url:
                    try:
                        staged = stage_candidate_image(img_url, dest_path)
                        if staged:
                            with (staged.parent / "candidates.jsonl").open("a", encoding="utf-8") as manifest:
                                manifest.write(json.dumps({"id": pid, "title": title, "source_url": img_url,
                                                           "candidate": str(staged), "status": "pending_visual_review"}) + "\n")
                            print(f"  Staged {filename} for manual packaging review")
                            staged_count += 1
                    except Exception as e:
                        print(f"  Candidate failed: {e}")
                else:
                    print("  No sufficiently ranked candidate found")

                time.sleep(0.5)

            print(f"\nCompleted: {staged_count}/{len(rows)} new candidates staged for visual review in {args.output_dir}/review; no catalog images replaced")

        else:
            parser.print_help()

    finally:
        scraper.close()


if __name__ == "__main__":
    main()
