/**
 * Harvest authentic packshots from Bangladeshi FMCG retail CDNs (Chaldal / Shwapno)
 * and upload to Cloudflare R2 bucket for the 80 newly imported brand products.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';
import * as XLSXModule from 'xlsx';
const XLSX = XLSXModule.default || XLSXModule;
import { signV4Put } from '../lib/_r2-s3.mjs';

function loadEnv() {
  const candidates = ['.env.local', '.env'];
  const env = {};
  for (const file of candidates) {
    const p = resolve(process.cwd(), file);
    if (existsSync(p)) {
      for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const r2AccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID;
const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
const r2Bucket = env.R2_BUCKET_NAME || 'lucky-store-images';

if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
  console.error('❌ Missing R2 credentials in environment (.env.local / .env)');
  process.exit(1);
}

const s3Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;

function cleanText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract standard size tokens: e.g. "1l", "2l", "5l", "500g", "1kg", "2kg", "250ml", "400g", "62g"
function extractSizeTokens(str) {
  const norm = (str || '').toLowerCase();
  const sizes = new Set();

  // Litres: 1l, 1 ltr, 1 litre, 1 liter, 2l, 5l
  const ltrMatches = norm.match(/\b(\d+(?:\.\d+)?)\s*(?:l|ltr|litre|liter|litres)\b/g);
  if (ltrMatches) {
    for (const m of ltrMatches) {
      const num = m.match(/\d+(?:\.\d+)?/)[0];
      sizes.add(`${num}l`);
    }
  }

  // Millilitres: 250ml, 500ml, 100ml, 750ml
  const mlMatches = norm.match(/\b(\d+)\s*(?:ml|milli)\b/g);
  if (mlMatches) {
    for (const m of mlMatches) {
      const num = m.match(/\d+/)[0];
      sizes.add(`${num}ml`);
    }
  }

  // Kilograms: 1kg, 2kg, 5kg
  const kgMatches = norm.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilo)\b/g);
  if (kgMatches) {
    for (const m of kgMatches) {
      const num = m.match(/\d+(?:\.\d+)?/)[0];
      sizes.add(`${num}kg`);
    }
  }

  // Grams: 500g, 400g, 200g, 62g, 40g, 100gm, 125gm
  const gMatches = norm.match(/\b(\d+)\s*(?:g|gm|gram|grams)\b/g);
  if (gMatches) {
    for (const m of gMatches) {
      const num = m.match(/\d+/)[0];
      sizes.add(`${num}g`);
    }
  }

  return sizes;
}

// Scrape candidates from Chaldal search page
async function searchChaldal(query) {
  try {
    const url = 'https://chaldal.com/search/' + encodeURIComponent(query);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /https:\/\/i\.chaldn\.com\/_mpimage\/([a-zA-Z0-9_-]+)\?src=([^&\"\'\s]+)/g;
    const items = [];
    let m;
    const seen = new Set();
    while ((m = regex.exec(html)) !== null) {
      const slug = m[1];
      const raw = decodeURIComponent(m[2]);
      if (!seen.has(slug) && raw.startsWith('https://')) {
        seen.add(slug);
        items.push({
          name: slug.replace(/-/g, ' '),
          slug,
          rawUrl: raw,
          source: 'chaldal-live',
        });
      }
    }
    return items;
  } catch (err) {
    console.warn(`Warning: failed to query Chaldal for "${query}":`, err.message);
    return [];
  }
}

// Score a candidate against a target product
function scoreCandidate(product, candidate) {
  const pClean = cleanText(product.name);
  const pBrand = cleanText(product.brand);
  const pSizes = extractSizeTokens(product.name);

  // Exclude brand, pure numbers, and size/quantity tokens from keywords
  const pWords = pClean
    .split(' ')
    .filter(w => {
      if (w.length <= 2 || w === pBrand) return false;
      if (/^\d+$/.test(w)) return false;
      if (/^\d+(?:l|ltr|litre|liter|ml|kg|g|gm|pcs|pack|s)$/.test(w)) return false;
      return true;
    });

  const cClean = cleanText(candidate.name);
  const cSizes = extractSizeTokens(candidate.name);

  // 1. Brand match
  const brandAliases = [pBrand];
  if (pBrand === 'abul khair') brandAliases.push('marks', 'seylon', 'ceylon');
  if (pBrand === 'arla') brandAliases.push('dano');
  if (pBrand === 'new zealand dairy') brandAliases.push('diploma', 'red cow');
  if (pBrand === 'nestle') brandAliases.push('maggi', 'nescafe', 'kitkat', 'nido');

  const matchesBrand = brandAliases.some(b => cClean.includes(b));
  if (!matchesBrand) {
    return { score: -100, matchesBrand: false, matchedKeywordsCount: 0 };
  }

  let score = 15;

  // 2. Keyword match (must match non-size product-name terms)
  let matchedKeywordsCount = 0;
  for (const w of pWords) {
    if (cClean.includes(w)) {
      matchedKeywordsCount++;
      score += 4;
    }
  }

  // Require at least one non-size product-name keyword match
  if (pWords.length > 0 && matchedKeywordsCount === 0) {
    return { score: -100, matchesBrand: true, matchedKeywordsCount: 0 };
  }

  // 3. Size match
  let sizeMatch = false;
  let sizeConflict = false;
  if (pSizes.size > 0 && cSizes.size > 0) {
    for (const ps of pSizes) {
      if (cSizes.has(ps)) sizeMatch = true;
      else sizeConflict = true;
    }
  }

  if (sizeMatch) score += 10;
  if (sizeConflict && !sizeMatch) score -= 15; // Penalty for conflicting pack size

  return { score, matchesBrand: true, matchedKeywordsCount };
}

async function main() {
  const productsPath = resolve(process.cwd(), 'data/inventory/brands_missing_products_import.json');
  const products = JSON.parse(readFileSync(productsPath, 'utf-8'));
  console.log(`Loaded ${products.length} products to process.`);

  // 1. Build Candidate Pool from Excel files
  const candidates = [];
  const chaldalExcelPath = resolve(process.cwd(), 'apps/scraper/chaldal-products.xlsx');
  if (existsSync(chaldalExcelPath)) {
    const cWb = XLSX.readFile(chaldalExcelPath);
    const cRows = XLSX.utils.sheet_to_json(cWb.Sheets[cWb.SheetNames[0]]);
    for (const r of cRows) {
      const url = r['Image URL'];
      if (url && typeof url === 'string' && url.startsWith('https://') && r.Name) {
        candidates.push({
          name: r.Name,
          slug: cleanText(r.Name).replace(/\s+/g, '-'),
          rawUrl: url,
          source: 'chaldal-excel',
        });
      }
    }
    console.log(`Added ${candidates.length} candidates from chaldal-products.xlsx`);
  }

  const shwapnoExcelPath = resolve(process.cwd(), 'apps/scraper/shwapno-products.xlsx');
  if (existsSync(shwapnoExcelPath)) {
    const sWb = XLSX.readFile(shwapnoExcelPath);
    const sRows = XLSX.utils.sheet_to_json(sWb.Sheets[sWb.SheetNames[0]]);
    let shwapnoCount = 0;
    for (const r of sRows) {
      const url = r['Image URL'];
      if (url && typeof url === 'string' && url.startsWith('https://') && r.Name) {
        candidates.push({
          name: r.Name,
          slug: cleanText(r.Name).replace(/\s+/g, '-'),
          rawUrl: url,
          source: 'shwapno-excel',
        });
        shwapnoCount++;
      }
    }
    console.log(`Added ${shwapnoCount} candidates from shwapno-products.xlsx`);
  }

  // 2. Fetch brand queries from Chaldal
  const brandQueries = [
    'Teer', 'Pran', 'Dettol', 'Olympic', 'Aarong', 'Ispahani', 'Rupchanda',
    'Marks', 'Seylon', 'Dano', 'Diploma', 'Red Cow', 'Fresh', 'Bashundhara',
    'Nescafe', 'Maggi', 'KitKat', 'Nido', 'Cadbury', 'Dove', 'Lux', 'Sunsilk', 'Radhuni',
  ];

  console.log(`Fetching Chaldal brand catalogs for ${brandQueries.length} brands...`);
  for (const b of brandQueries) {
    const liveItems = await searchChaldal(b);
    console.log(`  [${b}] fetched ${liveItems.length} packshot candidates`);
    candidates.push(...liveItems);
    // Be polite with small delay
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`Total candidate pool: ${candidates.length} images.`);

  // 3. Match each product
  const results = [];
  const unmatched = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let bestCand = null;
    let bestScore = -100;

    for (const cand of candidates) {
      const { score, matchesBrand, matchedKeywordsCount } = scoreCandidate(p, cand);
      if (matchesBrand && matchedKeywordsCount > 0 && score > bestScore) {
        bestScore = score;
        bestCand = { ...cand, score };
      }
    }

    // Threshold check (must have brand + matching non-size keywords, score >= 20)
    if (bestCand && bestScore >= 20) {
      results.push({
        product: p,
        candidate: bestCand,
        score: bestScore,
      });
    } else {
      // Fallback: targeted on-demand search for this specific product with same validation
      console.log(`🔍 Fallback search for "${p.name}" (best candidate score was ${bestScore})...`);
      const targeted = await searchChaldal(p.name);
      let bestTargeted = null;
      let bestTargetedScore = -100;

      for (const t of targeted) {
        const { score, matchesBrand, matchedKeywordsCount } = scoreCandidate(p, t);
        if (matchesBrand && matchedKeywordsCount > 0 && score >= 20 && score > bestTargetedScore) {
          bestTargetedScore = score;
          bestTargeted = { ...t, score };
        }
      }

      if (bestTargeted) {
        results.push({
          product: p,
          candidate: bestTargeted,
          score: bestTargetedScore,
        });
        candidates.push(...targeted);
      } else {
        unmatched.push(p);
      }
      await new Promise(r => setTimeout(r, 800));
    }
  }

  console.log(`\n========================================`);
  console.log(`Matched: ${results.length} / ${products.length} products`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`========================================\n`);

  if (unmatched.length > 0) {
    console.log('Unmatched items:');
    for (const u of unmatched) {
      console.log(` - [${u.sku}] ${u.name} (${u.brand})`);
    }
  }

  // 4. Download, convert to WebP, and upload to Cloudflare R2
  console.log(`\n🚀 Uploading packshots to Cloudflare R2 (${r2Bucket})...`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < results.length; i++) {
    const { product, candidate, score } = results[i];
    const sku = product.sku;
    const key = `products/${sku}.webp`;
    const targetUrl = `https://images.luckystore1947.com/${key}`;

    console.log(`[${i + 1}/${results.length}] ${sku} (${product.name})`);
    console.log(`  Source: ${candidate.rawUrl} (${candidate.name}) [Score: ${score}]`);

    try {
      // Validate HTTPS protocol
      let parsedUrl;
      try {
        parsedUrl = new URL(candidate.rawUrl);
      } catch (urlErr) {
        throw new Error(`Invalid URL format: ${candidate.rawUrl}`);
      }

      if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Insecure image download blocked: protocol is "${parsedUrl.protocol}" for ${candidate.rawUrl}`);
      }

      // Download
      const imgRes = await fetch(candidate.rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      });

      if (!imgRes.ok) {
        throw new Error(`Download failed with HTTP ${imgRes.status}`);
      }

      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      // Convert to WebP via Sharp
      const webpBuffer = await sharp(imgBuffer)
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      // Upload to R2
      const putHeaders = await signV4Put(
        s3Endpoint, r2Bucket, key, webpBuffer, r2AccessKey, r2SecretKey
      );

      const putRes = await fetch(`${s3Endpoint}/${r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          ...putHeaders,
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: webpBuffer,
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        throw new Error(`R2 PUT failed (${putRes.status}): ${errText}`);
      }

      console.log(`  ✅ Uploaded ${key} (${Math.round(webpBuffer.length / 1024)} KB) -> ${targetUrl}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n✨ Ingestion Complete: ${successCount} uploaded successfully, ${failCount} failed.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
