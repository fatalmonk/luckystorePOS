#!/usr/bin/env python3
import os, re, json, time, logging
from pathlib import Path
from urllib.parse import quote_plus, urljoin
from io import BytesIO

import requests
from PIL import Image
from rapidfuzz import fuzz
from playwright.sync_api import sync_playwright, Page

from dotenv import load_dotenv
load_dotenv(dotenv_path='../../../apps/admin_web/.env.local')
load_dotenv(dotenv_path='../../../.env.certify.staging')

SUPABASE_URL  = os.getenv("VITE_SUPABASE_URL",  "https://hvmyxyccfnkrbxqbhlnm.supabase.co")
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY",  "")
STORAGE_BUCKET = "item-images"

# Scoring thresholds (Relaxed for Banglish)
NAME_SIM_THRESHOLD  = 40
PRICE_DELTA_MAX_PCT = 100 # Allow 100% price delta since Google Images has no price/ "thumbnails"
SIZE_BONUS          = 3
PRICE_TIGHT_BONUS   = 2
MIN_SCORE_AUTO      = 2   # Minimum score for auto-approval
MIN_SCORE_REVIEW    = 1   # Minimum score to save a candidate

SCRAPE_MODE = "missing_only"

OUT_DIR         = Path("scraper_output")
THUMBS_DIR      = OUT_DIR / "thumbnails"
CANDIDATES_FILE = OUT_DIR / "candidates.json"
NO_MATCH_FILE   = OUT_DIR / "no_match.json"
LOG_FILE        = OUT_DIR / "scraper_pw.log"

MAX_THUMB  = 500 * 1024

OUT_DIR.mkdir(exist_ok=True)
THUMBS_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

# Used only for downloading the final thumbnail, NOT for page scraping
session = requests.Session()

def extract_size_tokens(text: str) -> set:
    text = text.lower()
    tokens = re.findall(r'\d+\.?\d*\s*(?:gm|g|kg|ml|l|ltr|pcs|pc|pack|pieces?)', text)
    return {re.sub(r'\s+', '', t) for t in tokens}

def name_score(db_name: str, scraped_name: str) -> float:
    s1 = fuzz.token_sort_ratio(db_name.lower(), scraped_name.lower())
    s2 = fuzz.partial_ratio(db_name.lower(), scraped_name.lower())
    return max(s1, s2)

def price_delta_pct(our_price: float, their_price: float) -> float:
    if our_price <= 0 or their_price <= 0:
        return 999
    return abs(our_price - their_price) / our_price * 100

def compute_match_score(db_item: dict, scraped: dict) -> dict:
    score = 0
    details = []
    nsim = name_score(db_item["name"], scraped.get("name", ""))
    if nsim >= 85:
        score += 4; details.append(f"name~={nsim:.0f}%+4")
    elif nsim >= NAME_SIM_THRESHOLD:
        score += 2; details.append(f"name~={nsim:.0f}%+2")
    else:
        details.append(f"name~={nsim:.0f}% (LOW)")

    db_sizes = extract_size_tokens(db_item["name"])
    sc_sizes = extract_size_tokens(scraped.get("name", "") + " " + scraped.get("size", ""))
    size_overlap = db_sizes & sc_sizes
    size_match = bool(size_overlap) if db_sizes else True
    if size_match and db_sizes:
        score += SIZE_BONUS; details.append(f"size✓{size_overlap}+{SIZE_BONUS}")
    elif db_sizes and not size_overlap:
        details.append(f"size✗ db={db_sizes} scraped={sc_sizes}")

    our_price = float(db_item.get("price") or 0)
    their_price = float(scraped.get("price") or 0)
    pdelta = price_delta_pct(our_price, their_price)
    if pdelta <= 15:
        score += PRICE_TIGHT_BONUS; details.append(f"price≤15%+{PRICE_TIGHT_BONUS}")
    elif pdelta <= PRICE_DELTA_MAX_PCT:
        score += 1; details.append(f"price≤30%+1")
    elif their_price == 0:
        details.append("price=unknown (no penalty)")
    else:
        details.append(f"price✗ Δ{pdelta:.0f}%")

    confidence = "HIGH" if score >= MIN_SCORE_AUTO else \
                 "MED"  if score >= MIN_SCORE_REVIEW else "LOW"

    return {
        "score": score,
        "confidence": confidence,
        "name_sim": round(nsim, 1),
        "size_match": size_match,
        "price_delta_pct": round(pdelta, 1),
        "their_price": their_price,
        "details": " | ".join(details),
    }

def download_thumbnail(url: str, sku: str, idx: int) -> str | None:
    try:
        if url.startswith("data:image"):
            import base64
            header, encoded = url.split(",", 1)
            encoded += "=" * ((4 - len(encoded) % 4) % 4)
            img_data = base64.b64decode(encoded)
            img = Image.open(BytesIO(img_data))
        else:
            r = session.get(url, timeout=12)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content))
            
        if img.format not in ("JPEG", "PNG", "WEBP"):
            return None
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.thumbnail((400, 400), Image.LANCZOS)
        ext = img.format.lower() if img.format else "jpg"
        ext = "jpg" if ext == "jpeg" else ext
        fname = f"{sku.replace('/', '_')}_{idx}.{ext}"
        path = os.path.join("thumbnails", fname)
        img.save(path)
        return fname
    except Exception as e:
        log.error(f"Failed to download/decode {url[:50]}... Error: {e}")
        return None

def scrape_chaldal(page: Page, item: dict, query_override: str = None) -> list:
    candidates = []
    query = query_override or item["name"]
    url = f"https://chaldal.com/search/{quote_plus(query)}"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(2000) # Give React a moment to render cards
        cards = page.locator(".product").all()
        for card in cards[:6]:
            try:
                name_el = card.locator(".name").first
                price_el = card.locator(".price .discountedPrice, .price .regularPrice").first
                weight_el = card.locator(".weight, .subText").first
                img_el = card.locator("img").first

                scraped_name = name_el.inner_text().strip() if name_el.count() else ""
                price_raw = price_el.inner_text().strip() if price_el.count() else ""
                scraped_price = float(re.sub(r"[^\d.]", "", price_raw) or 0)
                scraped_size = weight_el.inner_text().strip() if weight_el.count() else ""
                
                img_url = ""
                if img_el.count():
                    img_url = img_el.get_attribute("src") or img_el.get_attribute("data-src") or ""

                if not img_url or not scraped_name:
                    continue
                if not img_url.startswith("http"):
                    img_url = urljoin("https://chaldal.com", img_url)

                candidates.append({
                    "source":     "chaldal",
                    "name":       scraped_name,
                    "size":       scraped_size,
                    "price":      scraped_price,
                    "image_url":  img_url,
                    "page_url":   url,
                })
            except Exception:
                continue
    except Exception as e:
        log.debug(f"  Chaldal scrape failed for '{query}': {e}")
    return candidates

def scrape_shwapno(page: Page, item: dict, query_override: str = None) -> list:
    candidates = []
    query = query_override or item["name"]
    url = f"https://www.shwapno.com/search?q={quote_plus(query)}"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(2000)
        cards = page.locator(".product-card, .product-item, article.product, .product-box").all()
        for card in cards[:6]:
            try:
                name_el = card.locator(".product-title, .product-name, h2, h3, .product-box-title").first
                price_el = card.locator(".price, .product-price, [class*='price']").first
                img_el = card.locator("img").first
                link_el = card.locator("a").first

                scraped_name = name_el.inner_text().strip() if name_el.count() else ""
                price_raw = price_el.inner_text().strip() if price_el.count() else ""
                scraped_price = float(re.sub(r"[^\d.]", "", price_raw) or 0)
                
                img_url = ""
                if img_el.count():
                    img_url = img_el.get_attribute("src") or img_el.get_attribute("data-src") or ""
                    
                page_url = url
                if link_el.count():
                    page_url = urljoin("https://www.shwapno.com", link_el.get_attribute("href") or "")

                if not img_url or not scraped_name:
                    continue
                if not img_url.startswith("http"):
                    img_url = urljoin("https://www.shwapno.com", img_url)

                candidates.append({
                    "source":    "shwapno",
                    "name":      scraped_name,
                    "size":      "",
                    "price":     scraped_price,
                    "image_url": img_url,
                    "page_url":  page_url,
                })
            except Exception:
                continue
    except Exception as e:
        log.debug(f"  Shwapno scrape failed for '{query}': {e}")
    return candidates

def scrape_bing_images(page: Page, item: dict, query_override: str = None) -> list:
    candidates = []
    brand = item.get("brand") or ""
    query = query_override or f"{brand} {item['name']} bangladesh".strip()
    url = f"https://www.bing.com/images/search?q={quote_plus(query)}"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)
        imgs = page.locator("img.mimg").all()
        log.info(f"Bing Images found {len(imgs)} imgs")
        count = 0
        for img in imgs:
            if count >= 6: break
            src = img.get_attribute("src") or img.get_attribute("data-src") or ""
            if src.startswith("http") and ("bing.net/th" in src or "th.bing.com" in src):
                candidates.append({
                    "source":    "bing",
                    "name":      item["name"],
                    "size":      "",
                    "price":     item.get("price") or 0, # force price match
                    "image_url": src,
                    "page_url":  url,
                })
                count += 1
    except Exception as e:
        log.debug(f"  Bing scrape failed for '{query}': {e}")
    return candidates

def fetch_items() -> list:
    if not SUPABASE_KEY:
        with open("../all_items.json") as f:
            items = json.load(f)
        if SCRAPE_MODE == "missing_only":
            items = [i for i in items if not i.get("image_url")]
        return items

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    url = f"{SUPABASE_URL}/rest/v1/items?select=id,sku,name,brand,price,mrp,cost,description,image_url&is_active=eq.true&order=name"
    if SCRAPE_MODE == "missing_only":
        url += "&image_url=is.null"

    r = requests.get(url, headers=headers, timeout=20)
    r.raise_for_status()
    return r.json()

def scrape_item(page: Page, item: dict) -> list:
    sku  = item["sku"] or item["id"]
    name = item["name"]
    log.info(f"Scraping: [{sku}] {name} | price={item.get('price')}")

    raw_candidates = []

    # 1. Chaldal
    results = scrape_chaldal(page, item)
    raw_candidates.extend(results)

    # 2. Shwapno
    results = scrape_shwapno(page, item)
    raw_candidates.extend(results)

    # 3. Google Images
    scored_so_far = [compute_match_score(item, c) for c in raw_candidates]
    if not any(s["confidence"] == "HIGH" for s in scored_so_far):
        results = scrape_bing_images(page, item)
        raw_candidates.extend(results)

    # Retry Logic (Strip size tokens for Banglish mismatch)
    scored_so_far = [compute_match_score(item, c) for c in raw_candidates]
    if not any(s["confidence"] in ("HIGH", "MED") for s in scored_so_far):
        clean_name = re.sub(r'\d+\.?\d*\s*(?:pieces|pcs|pc|pack|gm|kg|g|ml|ltr|l)', '', item['name'].lower()).strip()
        if clean_name and clean_name != item['name'].lower():
            log.info(f"  Retrying with relaxed query: '{clean_name}'")
            raw_candidates.extend(scrape_chaldal(page, item, query_override=clean_name))
            raw_candidates.extend(scrape_bing_images(page, item, query_override=f"{clean_name} product bangladesh"))

    scored = []
    for idx, cand in enumerate(raw_candidates):
        match = compute_match_score(item, cand)
        if match["confidence"] == "LOW":
            continue

        thumb = download_thumbnail(cand["image_url"], sku, idx)
        if not thumb:
            continue

        scored.append({
            "item_id":          item["id"],
            "sku":              sku,
            "db_name":          name,
            "db_price":         float(item.get("price") or 0),
            "db_mrp":           float(item.get("mrp") or 0),
            "source":           cand["source"],
            "matched_name":     cand["name"],
            "matched_size":     cand.get("size",""),
            "matched_price":    cand["price"],
            "candidate_image_url": cand["image_url"],
            "local_thumbnail":  thumb,
            "page_url":         cand["page_url"],
            "score":            match["score"],
            "confidence":       match["confidence"],
            "name_sim":         match["name_sim"],
            "size_match":       match["size_match"],
            "price_delta_pct":  match["price_delta_pct"],
            "match_details":    match["details"],
            "approved":         False,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored

def main():
    log.info("Lucky Store — Verified Image Scraper (PLAYWRIGHT EDITION)")
    items = fetch_items()
    log.info(f"Items to process: {len(items)}")

    all_candidates = []
    no_match = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")


        for i, item in enumerate(items):
            log.info(f"[{i+1}/{len(items)}] {item['sku']} — {item['name']}")
            try:
                candidates = scrape_item(page, item)
                if candidates:
                    all_candidates.extend(candidates)
                    log.info(f"  → {len(candidates)} candidate(s), best={candidates[0]['confidence']} score={candidates[0]['score']}")
                else:
                    no_match.append({"sku": item.get("sku"), "name": item["name"]})
                    log.info(f"  → NO MATCH")
            except Exception as e:
                log.error(f"  ERROR: {e}")
                no_match.append({"sku": item.get("sku"), "name": item["name"], "error": str(e)})

        browser.close()

    with open(CANDIDATES_FILE, "w") as f:
        json.dump(all_candidates, f, indent=2)
    with open(NO_MATCH_FILE, "w") as f:
        json.dump(no_match, f, indent=2)

    log.info(f"Done! Candidates: {len(all_candidates)} | No match: {len(no_match)}")

if __name__ == "__main__":
    main()
