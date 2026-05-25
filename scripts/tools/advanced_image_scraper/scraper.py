#!/usr/bin/env python3
"""
Lucky Store — Verified Image Scraper
=====================================
Verifies product name + size + price match BEFORE accepting any image.

Priority order: shwapno.com → chaldal.com → Google Images
Match scoring:  name_similarity + size_match + price_delta

Usage:
    pip install requests beautifulsoup4 pillow rapidfuzz supabase
    python scraper.py

Config: edit CONFIG section below.
"""

import os, re, json, time, hashlib, shutil, logging
from pathlib import Path
from urllib.parse import quote_plus, urljoin
from io import BytesIO

import requests
from bs4 import BeautifulSoup
from PIL import Image
from rapidfuzz import fuzz
from duckduckgo_search import DDGS

from dotenv import load_dotenv
load_dotenv(dotenv_path='../../../apps/admin_web/.env.local')
load_dotenv(dotenv_path='../../../.env.certify.staging')

SUPABASE_URL  = os.getenv("VITE_SUPABASE_URL",  "https://hvmyxyccfnkrbxqbhlnm.supabase.co")
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY",  "")   # your service role key
STORAGE_BUCKET = "item-images"

# Scoring thresholds (Relaxed for Banglish)
NAME_SIM_THRESHOLD  = 40   # fuzzy name match minimum (0-100)
PRICE_DELTA_MAX_PCT = 80   # max % price difference to accept
SIZE_BONUS          = 3    # points if size/weight token matches exactly
PRICE_TIGHT_BONUS   = 2    # bonus if price within 15%
MIN_SCORE_AUTO      = 5    # score ≥ this → HIGH confidence (auto candidate)
MIN_SCORE_REVIEW    = 3    # score ≥ this → MED confidence (flag for review)

# Mode: 'missing_only' | 'all' (all = re-verify existing images too)
SCRAPE_MODE = "all"

# Output paths
OUT_DIR         = Path("scraper_output")
THUMBS_DIR      = OUT_DIR / "thumbnails"
CANDIDATES_FILE = OUT_DIR / "candidates.json"
NO_MATCH_FILE   = OUT_DIR / "no_match.json"
LOG_FILE        = OUT_DIR / "scraper.log"

# Request settings
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
}
TIMEOUT    = 12
MAX_THUMB  = 500 * 1024  # 500 KB

# ─────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────
OUT_DIR.mkdir(exist_ok=True)
THUMBS_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

session = requests.Session()
session.headers.update(HEADERS)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def extract_size_tokens(text: str) -> set:
    """Extract weight/volume/count tokens like 500g, 1kg, 250ml, 12pcs"""
    text = text.lower()
    tokens = re.findall(r'\d+\.?\d*\s*(?:gm|g|kg|ml|l|ltr|pcs|pc|pack|pieces?)', text)
    # normalise spacing
    return {re.sub(r'\s+', '', t) for t in tokens}


def name_score(db_name: str, scraped_name: str) -> float:
    """Returns 0-100 similarity considering token overlap"""
    s1 = fuzz.token_sort_ratio(db_name.lower(), scraped_name.lower())
    s2 = fuzz.partial_ratio(db_name.lower(), scraped_name.lower())
    return max(s1, s2)


def price_delta_pct(our_price: float, their_price: float) -> float:
    if our_price <= 0 or their_price <= 0:
        return 999
    return abs(our_price - their_price) / our_price * 100


def compute_match_score(db_item: dict, scraped: dict) -> dict:
    """
    Returns {score, confidence, name_sim, size_match, price_delta, details}
    Score breakdown:
      name_sim ≥ 85  → 4 pts
      name_sim ≥ 72  → 2 pts
      size match     → 3 pts
      price ≤ 15%    → 2 pts
      price ≤ 30%    → 1 pt
    """
    score = 0
    details = []

    # Name similarity
    nsim = name_score(db_item["name"], scraped.get("name", ""))
    if nsim >= 85:
        score += 4; details.append(f"name~={nsim:.0f}%+4")
    elif nsim >= NAME_SIM_THRESHOLD:
        score += 2; details.append(f"name~={nsim:.0f}%+2")
    else:
        details.append(f"name~={nsim:.0f}% (LOW)")

    # Size match
    db_sizes = extract_size_tokens(db_item["name"])
    sc_sizes = extract_size_tokens(scraped.get("name", "") + " " + scraped.get("size", ""))
    size_overlap = db_sizes & sc_sizes
    size_match = bool(size_overlap) if db_sizes else True  # no size in name → don't penalise
    if size_match and db_sizes:
        score += SIZE_BONUS; details.append(f"size✓{size_overlap}+{SIZE_BONUS}")
    elif db_sizes and not size_overlap:
        details.append(f"size✗ db={db_sizes} scraped={sc_sizes}")

    # Price check
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
    """Download image, validate format, resize to thumbnail, save. Returns local path."""
    try:
        r = session.get(url, timeout=TIMEOUT)
        r.raise_for_status()
        if len(r.content) > MAX_THUMB * 5:
            log.debug(f"  Image too large ({len(r.content)//1024}KB), resizing")

        img = Image.open(BytesIO(r.content))
        if img.format not in ("JPEG", "PNG", "WEBP"):
            log.debug(f"  Unsupported format: {img.format}")
            return None

        # Convert to RGB if needed (e.g. RGBA PNG)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Thumbnail max 400x400
        img.thumbnail((400, 400), Image.LANCZOS)

        ext = img.format.lower() if img.format else "jpg"
        ext = "jpg" if ext == "jpeg" else ext
        fname = f"{sku.replace('/', '_')}_{idx}.{ext}"
        fpath = THUMBS_DIR / fname
        img.save(fpath, optimize=True, quality=85)

        # Size check after save
        if fpath.stat().st_size > MAX_THUMB:
            log.debug(f"  Thumbnail still large ({fpath.stat().st_size//1024}KB)")

        return str(fpath)
    except Exception as e:
        log.debug(f"  Thumb download failed {url}: {e}")
        return None


# ─────────────────────────────────────────────
# SCRAPERS
# ─────────────────────────────────────────────

def scrape_chaldal(item: dict) -> list:
    """Search chaldal.com and return list of candidate dicts"""
    candidates = []
    query = item["name"]
    url = f"https://chaldal.com/search/{quote_plus(query)}"
    try:
        r = session.get(url, timeout=TIMEOUT)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")

        # Chaldal product cards
        for card in soup.select(".product")[:8]:
            try:
                name_el   = card.select_one(".name")
                price_el  = card.select_one(".price .discountedPrice, .price .regularPrice")
                weight_el = card.select_one(".weight, .subText")
                img_el    = card.select_one("img")

                scraped_name  = name_el.get_text(strip=True)  if name_el  else ""
                scraped_price_raw = price_el.get_text(strip=True) if price_el else ""
                scraped_price = float(re.sub(r"[^\d.]", "", scraped_price_raw) or 0)
                scraped_size  = weight_el.get_text(strip=True) if weight_el else ""
                img_url       = img_el.get("src") or img_el.get("data-src", "") if img_el else ""

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


def scrape_shwapno(item: dict) -> list:
    """Search shwapno.com and return candidates"""
    candidates = []
    query = item["name"]
    url = f"https://www.shwapno.com/search?q={quote_plus(query)}"
    try:
        r = session.get(url, timeout=TIMEOUT)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")

        for card in soup.select(".product-card, .product-item, article.product")[:8]:
            try:
                name_el  = card.select_one(".product-title, .product-name, h2, h3")
                price_el = card.select_one(".price, .product-price, [class*='price']")
                img_el   = card.select_one("img")
                link_el  = card.select_one("a")

                scraped_name  = name_el.get_text(strip=True)  if name_el  else ""
                price_raw     = price_el.get_text(strip=True) if price_el else ""
                scraped_price = float(re.sub(r"[^\d.]", "", price_raw) or 0)
                img_url       = img_el.get("src") or img_el.get("data-src", "") if img_el else ""
                page_url      = urljoin("https://www.shwapno.com", link_el.get("href","")) if link_el else url

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


def scrape_duckduckgo_images(item: dict, query_override: str = None) -> list:
    """Fallback: DuckDuckGo Images search (robust against Banglish)"""
    candidates = []
    brand = item.get("brand") or ""
    query = query_override or f"{brand} {item['name']} bangladesh".strip()
    try:
        results = DDGS().images(query, max_results=6)
        for img in results:
            candidates.append({
                "source":    "duckduckgo",
                "name":      item["name"],  # Assume match (rely on DDG algorithm)
                "size":      "",
                "price":     item.get("price") or 0, # Force match price so it doesn't penalize
                "image_url": img["image"],
                "page_url":  img.get("url", ""),
            })
    except Exception as e:
        log.debug(f"  DuckDuckGo scrape failed for '{query}': {e}")
    return candidates


# ─────────────────────────────────────────────
# FETCH ITEMS FROM SUPABASE
# ─────────────────────────────────────────────

def fetch_items() -> list:
    """Fetch items from Supabase via REST API"""
    if not SUPABASE_KEY:
        # Load from local file if no key provided
        log.info("No SUPABASE_KEY set — loading from all_items.json")
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


# ─────────────────────────────────────────────
# MAIN SCRAPE LOOP
# ─────────────────────────────────────────────

def scrape_item(item: dict) -> list:
    """Scrape all sources for one item, score each result, return scored candidates."""
    sku  = item["sku"] or item["id"]
    name = item["name"]
    log.info(f"Scraping: [{sku}] {name} | price={item.get('price')}")

    raw_candidates = []

    # Priority 1: Chaldal
    results = scrape_chaldal(item)
    log.debug(f"  chaldal: {len(results)} results")
    raw_candidates.extend(results)

    # Priority 2: Shwapno
    results = scrape_shwapno(item)
    log.debug(f"  shwapno: {len(results)} results")
    raw_candidates.extend(results)

    # Priority 3: DuckDuckGo (only if no HIGH match yet)
    scored_so_far = [compute_match_score(item, c) for c in raw_candidates]
    has_high = any(s["confidence"] == "HIGH" for s in scored_so_far)
    if not has_high:
        results = scrape_duckduckgo_images(item)
        log.debug(f"  duckduckgo: {len(results)} results")
        raw_candidates.extend(results)
        
    # Retry Logic: If still no HIGH/MED match, strip size tokens and try DDG again
    scored_so_far = [compute_match_score(item, c) for c in raw_candidates]
    has_valid = any(s["confidence"] in ("HIGH", "MED") for s in scored_so_far)
    if not has_valid:
        log.debug("  No valid match. Retrying with relaxed search query...")
        clean_name = re.sub(r'\d+\.?\d*\s*(?:gm|g|kg|ml|l|ltr|pcs|pc|pack|pieces?)', '', item['name'].lower())
        results = scrape_duckduckgo_images(item, query_override=f"{clean_name} product bangladesh".strip())
        raw_candidates.extend(results)

    # Score all candidates
    scored = []
    for idx, cand in enumerate(raw_candidates):
        match = compute_match_score(item, cand)
        if match["confidence"] == "LOW":
            continue  # skip bad matches

        # Download thumbnail
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

    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def main():
    log.info("=" * 60)
    log.info("Lucky Store — Verified Image Scraper")
    log.info(f"Mode: {SCRAPE_MODE}")
    log.info("=" * 60)

    items = fetch_items()
    log.info(f"Items to process: {len(items)}")

    all_candidates = []
    no_match = []

    for i, item in enumerate(items):
        log.info(f"[{i+1}/{len(items)}] {item['sku']} — {item['name']}")
        try:
            candidates = scrape_item(item)
            if candidates:
                all_candidates.extend(candidates)
                log.info(f"  → {len(candidates)} candidate(s), best={candidates[0]['confidence']} score={candidates[0]['score']}")
            else:
                no_match.append({
                    "item_id": item["id"],
                    "sku":     item.get("sku"),
                    "name":    item["name"],
                    "price":   float(item.get("price") or 0),
                })
                log.info(f"  → NO MATCH")
        except Exception as e:
            log.error(f"  ERROR: {e}")
            no_match.append({"sku": item.get("sku"), "name": item["name"], "error": str(e)})

        # Rate limit: be polite
        time.sleep(1.5)

    # Save outputs
    with open(CANDIDATES_FILE, "w") as f:
        json.dump(all_candidates, f, indent=2)
    with open(NO_MATCH_FILE, "w") as f:
        json.dump(no_match, f, indent=2)

    log.info("=" * 60)
    log.info(f"Done! Candidates: {len(all_candidates)} | No match: {len(no_match)}")
    log.info(f"Candidates saved to: {CANDIDATES_FILE}")
    log.info(f"No-match saved to:   {NO_MATCH_FILE}")
    log.info("Next step: open review_dashboard.html to approve images")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
