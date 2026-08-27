/**
 * Batch optimize legacy product images in Cloudflare R2.
 * 
 * Downscales legacy 1000x1000 product images to max 480x480 WebP (quality: 80),
 * matching new uploads from admin_web and cutting image weight by ~70-80%.
 *
 * Usage:
 *   node scripts/images/optimize-r2-product-images.mjs --dry-run
 *   node scripts/images/optimize-r2-product-images.mjs
 *   node scripts/images/optimize-r2-product-images.mjs --limit=20
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';
import { signRequest, signV4Put, listR2Objects } from '../lib/_r2-s3.mjs';

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
        const key = trimmed.slice(0, eqIdx);
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const env = loadEnv();
  const r2AccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID;
  const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = env.R2_BUCKET_NAME || 'lucky-store-images';

  if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
    console.error('❌ Missing R2 credentials in environment (.env.local / .env)');
    console.error('   Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  process.env.R2_ACCESS_KEY_ID = r2AccessKey;
  process.env.R2_SECRET_ACCESS_KEY = r2SecretKey;

  const s3Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;

  console.log(`🔍 Connecting to R2 bucket "${r2Bucket}" at ${s3Endpoint}...`);
  if (dryRun) console.log('⚡ Mode: DRY RUN (no images will be modified)');

  // List all objects in bucket
  let allKeys = [];
  try {
    allKeys = await listR2Objects(s3Endpoint, r2Bucket, { prefix: '', maxKeys: 1000 });
  } catch (err) {
    console.error(`❌ Failed to list objects in R2: ${err.message}`);
    process.exit(1);
  }

  const includeBanners = args.includes('--include-banners');
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
  const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 10;

  // Filter for actual product item images (skip logos, favicons, banners, categories, PWA icons, OG cards)
  const isProductImage = (k) => {
    if (!/\.(webp|png|jpe?g|avif)$/i.test(k)) return false;
    if (!includeBanners && (k.startsWith('banners/') || k.startsWith('icons/'))) return false;
    if (k.startsWith('categories/') || k.startsWith('favicon') || k.startsWith('logo') || k.startsWith('apple-touch') || k.startsWith('icon-')) return false;
    if (k.includes('pwa-') || k.includes('opengraph') || k.includes('storefront-icon') || k.includes('-hero.png')) return false;
    return true;
  };

  const imageKeys = allKeys.filter(isProductImage);
  console.log(`📦 Found ${allKeys.length} total objects, ${imageKeys.length} product item images.`);

  const targetKeys = imageKeys.slice(0, limit);
  if (limit !== Infinity) {
    console.log(`🎯 Processing first ${targetKeys.length} images (--limit=${limit})`);
  }
  console.log(`⚡ Concurrency: ${CONCURRENCY} workers`);

  let processedCount = 0;
  let resizedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalOrigBytes = 0;
  let totalOptBytes = 0;

  async function processKey(key, index) {
    try {
      // Download object via S3 GET
      const { url, headers } = await signRequest(
        'GET', s3Endpoint, r2Bucket, `/${key}`, '', r2AccessKey, r2SecretKey
      );
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`⚠️ [${index + 1}/${targetKeys.length}] ${key} - download failed (${res.status})`);
        errorCount++;
        return;
      }

      const origBuffer = Buffer.from(await res.arrayBuffer());
      const origSize = origBuffer.length;
      totalOrigBytes += origSize;

      const metadata = await sharp(origBuffer).metadata();
      const { width = 0, height = 0 } = metadata;

      // Check if image needs downscaling
      const needsResize = force || width > 480 || height > 480 || metadata.format !== 'webp';

      if (!needsResize) {
        totalOptBytes += origSize;
        skippedCount++;
        return;
      }

      // Resize with sharp to max 480x480 inside bounding box, WebP 80
      const optBuffer = await sharp(origBuffer)
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      const optSize = optBuffer.length;
      totalOptBytes += optSize;
      resizedCount++;

      const savingsPct = (((origSize - optSize) / origSize) * 100).toFixed(1);
      console.log(
        `🔄 [${index + 1}/${targetKeys.length}] ${key}: ${width}x${height} (${formatBytes(origSize)}) → 480x480 WebP (${formatBytes(optSize)}) [Saved ${savingsPct}%]`
      );

      if (!dryRun) {
        // Upload back to R2 with immutable cache header
        const putHeaders = await signV4Put(
          s3Endpoint, r2Bucket, key, optBuffer, r2AccessKey, r2SecretKey
        );
        const putRes = await fetch(`${s3Endpoint}/${r2Bucket}/${key}`, {
          method: 'PUT',
          headers: {
            ...putHeaders,
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
          body: optBuffer,
        });

        if (!putRes.ok) {
          console.error(`❌ Upload failed for ${key}: ${putRes.status}`);
          errorCount++;
        }
      }
    } catch (err) {
      console.error(`❌ Error processing ${key}: ${err.message}`);
      errorCount++;
    } finally {
      processedCount++;
    }
  }

  // Concurrent worker pool
  let cursor = 0;
  async function worker() {
    while (cursor < targetKeys.length) {
      const idx = cursor++;
      await processKey(targetKeys[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, targetKeys.length) }, () => worker());
  await Promise.all(workers);

  const overallSaved = totalOrigBytes - totalOptBytes;
  const overallPct = totalOrigBytes > 0 ? ((overallSaved / totalOrigBytes) * 100).toFixed(1) : 0;

  console.log('\n========================================');
  console.log(`📊 Summary (${dryRun ? 'DRY RUN' : 'EXECUTED'}):`);
  console.log(`   Total evaluated:     ${processedCount}`);
  console.log(`   Downscaled / Saved:  ${resizedCount}`);
  console.log(`   Already optimal:     ${skippedCount}`);
  console.log(`   Errors / Failed:     ${errorCount}`);
  console.log(`   Original payload:    ${formatBytes(totalOrigBytes)}`);
  console.log(`   Optimized payload:   ${formatBytes(totalOptBytes)}`);
  console.log(`   Net Reduction:       ${formatBytes(overallSaved)} (${overallPct}% savings)`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
