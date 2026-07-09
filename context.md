# Lucky Store — Product Images Context

**Last updated:** July 10, 2026  
**Status:** ✅ Product images complete — 495 images uploaded, 492 products linked

---

## What Was Done

### 1. Image Download & Creation
- **Script:** `download_product_images.py`
- **Source:** `missing_images.md` (149 products missing images)
- **Results:**
  - 142 images downloaded from Chaldal.com
  - 4 images provided manually by user (Savoy Chocobar, Savoy Crunchybar, Snickers, Eggs)
  - 3 images already existed
- **Output:** `catalog-images/sku-named/*.webp` (495 total WebP files)

### 2. Cloudflare R2 Upload
- **Script:** `upload_to_r2.py`
- **Bucket:** `lucky-store-images`
- **Path prefix:** `products/`
- **Results:** 495/495 images uploaded successfully
- **Public URL:** `https://images.luckystore1947.com/products/{SKU}.webp`

### 3. Database Update
- **Script:** `update_db_with_r2_urls.py`
- **Database:** Supabase (PostgreSQL)
- **Table:** `products`
- **Results:** 492/495 products updated with `image_url`
- **Missing from DB:** 3 SKUs have images but no product records:
  - `SN-ST-JHC-300G` — Starship Jhal Chanachur
  - `BV-ST-CHL-200ML` — Beverage (chocolate?)
  - `CC-AR-ASL` — Aril Assorted Lollipop

---

## Key Files

| File | Purpose |
|---|---|
| `download_product_images.py` | Download product images from Chaldal/Shwapno, convert to WebP |
| `upload_to_r2.py` | Upload WebP images to Cloudflare R2 bucket |
| `update_db_with_r2_urls.py` | Update Supabase `products` table with R2 image URLs |
| `missing_images.md` | List of 149 products that were missing images |
| `catalog-images/sku-named/` | Local copy of all 495 WebP images |

---

## Infrastructure

### Cloudflare R2
- **Bucket:** `lucky-store-images`
- **Worker:** `cloudflare/workers/images/wrangler.toml`
- **Domain:** `https://images.luckystore1947.com`
- **Account ID:** `8e457654e12c3b75d2094bbd8914030b`

### Supabase
- **Project:** `hvmyxyccfnkrbxqbhlnm`
- **URL:** `https://hvmyxyccfnkrbxqbhlnm.supabase.co`
- **Table:** `products`
- **Columns:** `id`, `sku`, `image_url`

### Environment Variables
```bash
# .env.local
VITE_NEON_PROXY_URL="https://lucky-store-neon-proxy.luckystore-1947.workers.dev"
VITE_NEON_API_KEY="luckystore1947"
SUPABASE_URL="https://hvmyxyccfnkrbxqbhlnm.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."  # See .env.local
```

---

## Image URL Format

All product images are served at:
```
https://images.luckystore1947.com/products/{SKU}.webp
```

**Examples:**
- `https://images.luckystore1947.com/products/AF-AER-RSP.webp`
- `https://images.luckystore1947.com/products/BY-PMP-BWV.webp`
- `https://images.luckystore1947.com/products/CC-SNK-GEN.webp`

---

## Current Status

| Component | Status | Count |
|---|---|---|
| Local WebP files | ✅ Complete | 495 |
| R2 uploaded | ✅ Complete | 495 |
| Database linked | ✅ Complete | 492/495 |
| Missing from DB | ⚠️ Pending | 3 SKUs |

---

## Next Steps / TODOs

### Immediate
- [ ] Add 3 missing products to database (if they should exist):
  - `SN-ST-JHC-300G`
  - `BV-ST-CHL-200ML`
  - `CC-AR-ASL`

### Future Maintenance
- **New products:** Run `download_product_images.py --sku {NEW_SKU}` to fetch images
- **Re-upload:** Run `upload_to_r2.py` to sync new images to R2
- **Update DB:** Run `update_db_with_r2_urls.py` to link new images

### Optimization Ideas
- [ ] Add image lazy loading to frontend
- [ ] Implement CDN caching headers on Worker
- [ ] Add image optimization pipeline (resize variants)
- [ ] Set up automated image download for new products

---

## Commands Reference

```bash
# Download images for missing products
python download_product_images.py --delay 2

# Download single SKU
python download_product_images.py --sku "AF-AER-RSP" --delay 2

# Upload all images to R2
python upload_to_r2.py

# Update database with R2 URLs
python update_db_with_r2_urls.py

# Check what's in catalog-images
ls catalog-images/sku-named/*.webp | wc -l
```

---

## Notes

- **WebP format:** All images converted to WebP (35-55% smaller than JPEG)
- **Rate limiting:** Script uses 2-second delay between downloads to avoid blocking
- **Duplicate handling:** Scripts skip files/records that already exist
- **Image sources:** Primarily Chaldal.com (Bangladesh e-commerce), some manual uploads

---

## Troubleshooting

### If R2 upload fails:
```bash
# Check bucket exists
wrangler r2 bucket list

# Check Worker is deployed
wrangler deploy cloudflare/workers/images/wrangler.toml
```

### If DB update fails:
```bash
# Check Supabase connection
python -c "from supabase import create_client; print(create_client('URL', 'KEY').table('products').select('sku').limit(1).execute())"
```

### If download fails:
- Chaldal/Shwapno may block requests — increase delay or use proxies
- Some products may not exist on these sites — manual image required
