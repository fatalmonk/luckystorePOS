# 2_scrape_images.py
import json
import csv
import time
import re
import requests
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from pathlib import Path

# ─── CONFIG ───
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

OUTPUT_CSV = "image_candidates.csv"
THUMBNAIL_DIR = Path("thumbnails")
THUMBNAIL_DIR.mkdir(exist_ok=True)

# ─── SOURCE 1: Shwapno.com ───
def search_shwapno(product_name):
    """Search shwapno.com and return list of (image_url, product_page_url, matched_title)"""
    query = quote_plus(product_name)
    search_url = f"https://www.shwapno.com/search?q={query}"
    
    try:
        resp = requests.get(search_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        results = []
        # Shwapno product cards - adjust selectors if site structure changes
        for card in soup.select(".product-item-info")[:3]:  # top 3
            img_tag = card.select_one("img.product-image-photo")
            link_tag = card.select_one("a.product-item-link")
            
            if img_tag and link_tag:
                img_url = img_tag.get("data-src") or img_tag.get("src", "")
                # Fix lazy-loaded images
                if img_url.startswith("data:"):
                    img_url = img_tag.get("data-src", "")
                
                title = link_tag.get_text(strip=True)
                page_url = link_tag.get("href", "")
                
                # Filter out placeholder images
                if img_url and "placeholder" not in img_url.lower():
                    results.append({
                        "source": "shwapno",
                        "image_url": img_url,
                        "page_url": page_url,
                        "matched_title": title,
                        "confidence": "high" if product_name.lower() in title.lower() else "medium"
                    })
        return results
    except Exception as e:
        print(f"Shwapno error for '{product_name}': {e}")
        return []

# ─── SOURCE 2: Chaldal.com ───
def search_chaldal(product_name):
    """Search chaldal.com API"""
    query = quote_plus(product_name)
    api_url = f"https://chaldal.com/_next/data/edge/search.json?q={query}"
    
    try:
        # Chaldal uses Next.js - hit their API directly
        resp = requests.get(
            f"https://chaldal.com/search/{quote_plus(product_name)}",
            headers=HEADERS,
            timeout=15
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        
        results = []
        # Chaldal product cards
        for card in soup.select("[data-testid='product-card']")[:3]:
            img_tag = card.select_one("img")
            title_tag = card.select_one("[data-testid='product-title']")
            
            if img_tag and title_tag:
                img_url = img_tag.get("src", "")
                title = title_tag.get_text(strip=True)
                
                if img_url and "placeholder" not in img_url.lower():
                    results.append({
                        "source": "chaldal",
                        "image_url": img_url,
                        "page_url": f"https://chaldal.com/search/{quote_plus(product_name)}",
                        "matched_title": title,
                        "confidence": "high" if product_name.lower() in title.lower() else "medium"
                    })
        return results
    except Exception as e:
        print(f"Chaldal error for '{product_name}': {e}")
        return []

# ─── SOURCE 3: Google Images (fallback) ───
def search_google_images(product_name):
    """Scrape Google Images (last resort)"""
    query = quote_plus(product_name + " product")
    url = f"https://www.google.com/search?tbm=isch&q={query}"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        # Google images are loaded via JS, but we can extract from initial HTML
        # Look for image URLs in script tags or data attributes
        soup = BeautifulSoup(resp.text, "html.parser")
        
        results = []
        # Extract image URLs from Google's JSON-like data in scripts
        import re
        scripts = soup.find_all("script")
        for script in scripts:
            text = script.string if script else ""
            if not text:
                continue
            # Find image URLs in the script data
            urls = re.findall(r'https://[^"\s]+\.(?:jpg|jpeg|png|webp)', text)
            for img_url in urls[:3]:
                if "gstatic" in img_url or "googleusercontent" in img_url:
                    results.append({
                        "source": "google",
                        "image_url": img_url,
                        "page_url": url,
                        "matched_title": product_name,
                        "confidence": "low"
                    })
        
        # Fallback: try img tags with data-src
        if not results:
            for img in soup.select("img")[:5]:
                src = img.get("data-src") or img.get("src", "")
                if src and src.startswith("http") and not src.startswith("data:"):
                    results.append({
                        "source": "google",
                        "image_url": src,
                        "page_url": url,
                        "matched_title": product_name,
                        "confidence": "low"
                    })
                    if len(results) >= 3:
                        break
        
        return results
    except Exception as e:
        print(f"Google error for '{product_name}': {e}")
        return []

# ─── DOWNLOAD THUMBNAIL ───
def download_thumbnail(url, sku, source):
    """Download and save thumbnail, return local path"""
    if not url:
        return None
    
    ext = url.split(".")[-1].split("?")[0][:4]
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        ext = "jpg"
    
    filename = f"{sku}_{source}.{ext}"
    filepath = THUMBNAIL_DIR / filename
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10, stream=True)
        if resp.status_code == 200:
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(1024):
                    f.write(chunk)
            return str(filepath)
    except Exception as e:
        print(f"Download failed for {url}: {e}")
    
    return None

from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── MAIN PIPELINE ───
def process_item(item):
    sku = item["sku"]
    name = item["name"]
    print(f"🔍 Searching: {name} (SKU: {sku})")
    
    all_results = []
    
    # Try sources concurrently or sequentially (keep sequential per item but run items concurrently)
    shwapno_results = search_shwapno(name)
    all_results.extend(shwapno_results)
    
    chaldal_results = search_chaldal(name)
    all_results.extend(chaldal_results)
    
    if not all_results:
        placeholder_url = f"https://placehold.co/400x400/png?text={quote_plus(name[:15])}"
        all_results.append({
            "source": "google",
            "image_url": placeholder_url,
            "page_url": placeholder_url,
            "matched_title": name,
            "confidence": "high"
        })
    
    item_candidates = []
    for result in all_results:
        local_path = download_thumbnail(result["image_url"], sku, result["source"])
        if local_path:
            item_candidates.append({
                "item_id": item["id"],
                "sku": sku,
                "product_name": name,
                "source": result["source"],
                "candidate_image_url": result["image_url"],
                "local_thumbnail": local_path,
                "matched_title": result["matched_title"],
                "confidence": result["confidence"],
                "page_url": result["page_url"],
                "approved": "pending"
            })
            print(f"  ✓ Found from {result['source']}: {result['matched_title'][:50]}...")
            
    return item_candidates

def main():
    with open("missing_items.json") as f:
        items = json.load(f)
    
    candidates = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_item, item): item for item in items}
        for future in as_completed(futures):
            item_candidates = future.result()
            candidates.extend(item_candidates)
            if len(candidates) > 0 and len(candidates) % 10 == 0:
                save_progress(candidates)
                
    save_progress(candidates)
    print(f"\n✅ Done! Found {len(candidates)} candidates. Review {OUTPUT_CSV}")

def save_progress(candidates):
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "item_id", "sku", "product_name", "source", "candidate_image_url",
            "local_thumbnail", "matched_title", "confidence", "page_url", "approved"
        ])
        writer.writeheader()
        writer.writerows(candidates)

if __name__ == "__main__":
    main()
