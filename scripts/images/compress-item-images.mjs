/**
 * compress-item-images.mjs
 *
 * Batch-converts Supabase Storage images to WebP.
 * Originals are kept as `<name>.original` — never deleted during Phase 1.
 * Successful conversions are logged to ./compress-results.json for targeted SQL UPDATE.
 *
 * Usage:
 *   DRY_RUN=true  node scripts/images/compress-item-images.mjs   # preview only
 *   DRY_RUN=false node scripts/images/compress-item-images.mjs   # execute
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   BUCKET=item-images          (default: item-images)
 *   QUALITY=80                  (WebP quality 1–100, default: 80)
 *   MIN_SIZE_KB=50              (skip files already < N kB, default: 50)
 *   TEST_FILES=5                (process only first N files, for smoke test)
 *   RATE_DELAY_MS=100           (ms between requests, default: 100)
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN      = process.env.DRY_RUN !== 'false'; // default: dry-run ON for safety
const BUCKET       = process.env.BUCKET       ?? 'item-images';
const QUALITY      = parseInt(process.env.QUALITY      ?? '80', 10);
const MIN_SIZE_KB  = parseInt(process.env.MIN_SIZE_KB  ?? '50', 10);
const TEST_FILES   = process.env.TEST_FILES ? parseInt(process.env.TEST_FILES, 10) : null;
const RATE_DELAY   = parseInt(process.env.RATE_DELAY_MS ?? '100', 10);
const RESULTS_FILE = './compress-results.json';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retry wrapper with exponential backoff */
async function withRetry(fn, label, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = 1000 * (i + 1);
      console.warn(`  RETRY (${i + 1}/${retries - 1}) ${label} — waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** List all objects in a bucket (handles pagination) */
async function listAllFiles(bucket) {
  const files = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data?.length) break;
    files.push(...data.filter(f => f.name && !f.name.endsWith('.original')));
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

const CONVERTABLE = /\.(jpe?g|png|gif)$/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main conversion logic ─────────────────────────────────────────────────────

async function processFile(file, results) {
  const sizeMeta = (file.metadata?.size ?? 0);

  // Skip non-image files, already-WebP, and tiny files
  if (!CONVERTABLE.test(file.name)) {
    console.log(`SKIP (not image): ${file.name}`);
    return;
  }
  if (sizeMeta < MIN_SIZE_KB * 1024) {
    console.log(`SKIP (${Math.round(sizeMeta / 1024)} kB < ${MIN_SIZE_KB} kB threshold): ${file.name}`);
    results.skipped.push({ name: file.name, reason: 'too_small', size: sizeMeta });
    return;
  }

  // Download original
  let inputBuffer;
  try {
    const { data: blob, error } = await withRetry(
      () => supabase.storage.from(BUCKET).download(file.name),
      `download ${file.name}`
    );
    if (error) throw error;
    inputBuffer = Buffer.from(await blob.arrayBuffer());
  } catch (err) {
    console.error(`ERR download: ${file.name} — ${err.message}`);
    results.errors.push({ name: file.name, stage: 'download', error: err.message });
    return;
  }

  // Convert to WebP
  let webpBuffer;
  try {
    webpBuffer = await sharp(inputBuffer)
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch (err) {
    console.error(`ERR convert: ${file.name} — ${err.message}`);
    results.errors.push({ name: file.name, stage: 'convert', error: err.message });
    return;
  }

  const newName    = file.name.replace(CONVERTABLE, '.webp');
  const savedBytes = inputBuffer.length - webpBuffer.length;
  const savedPct   = Math.round(savedBytes / inputBuffer.length * 100);
  const origKB     = Math.round(inputBuffer.length / 1024);
  const newKB      = Math.round(webpBuffer.length / 1024);

  if (DRY_RUN) {
    console.log(`[DRY] ${file.name} → ${newName} | ${origKB} kB → ~${newKB} kB (−${savedPct}%)`);
    results.dryRun.push({ original: file.name, webp: newName, originalBytes: inputBuffer.length, webpBytes: webpBuffer.length, savedPct });
    return;
  }

  // Upload WebP
  try {
    const { error } = await withRetry(
      () => supabase.storage.from(BUCKET).upload(newName, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1-year CDN cache
      }),
      `upload ${newName}`
    );
    if (error) throw error;
  } catch (err) {
    console.error(`ERR upload: ${newName} — ${err.message}`);
    results.errors.push({ name: file.name, stage: 'upload', error: err.message });
    return;
  }

  // Preserve original as .original (NOT deleted — Phase 5 cleans up after verification)
  if (newName !== file.name) {
    try {
      const { error } = await withRetry(
        () => supabase.storage.from(BUCKET).move(file.name, `${file.name}.original`),
        `archive ${file.name}`
      );
      if (error) {
        // Non-fatal: WebP is already uploaded; original rename failed but data is safe
        console.warn(`WARN: Could not archive original ${file.name}: ${error.message}`);
      }
    } catch (err) {
      console.warn(`WARN: Archive original failed: ${file.name} — ${err.message}`);
    }
  }

  console.log(`✓ ${file.name} → ${newName} | ${origKB} kB → ${newKB} kB (−${savedPct}%)`);
  results.converted.push({
    original: file.name,
    webp: newName,
    originalBytes: inputBuffer.length,
    webpBytes: webpBuffer.length,
    savedPct,
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(60));
  console.log(`Mode:    ${DRY_RUN ? 'DRY RUN (no changes)' : '⚠️  LIVE — changes will be made'}`);
  console.log(`Bucket:  ${BUCKET}`);
  console.log(`Quality: ${QUALITY} | Min size: ${MIN_SIZE_KB} kB | Test files: ${TEST_FILES ?? 'all'}`);
  console.log('━'.repeat(60));

  const allFiles = await listAllFiles(BUCKET);
  const files = TEST_FILES ? allFiles.slice(0, TEST_FILES) : allFiles;
  console.log(`Found ${allFiles.length} files — processing ${files.length}\n`);

  const results = { converted: [], skipped: [], errors: [], dryRun: [] };

  for (const file of files) {
    await processFile(file, results);
    await sleep(RATE_DELAY);
  }

  // Summary
  console.log('\n' + '━'.repeat(60));
  if (DRY_RUN) {
    const totalOrig = results.dryRun.reduce((s, f) => s + f.originalBytes, 0);
    const totalWebP = results.dryRun.reduce((s, f) => s + f.webpBytes, 0);
    const saved = totalOrig - totalWebP;
    console.log(`DRY RUN complete`);
    console.log(`Would convert: ${results.dryRun.length} files`);
    console.log(`Estimated savings: ${Math.round(saved / 1024 / 1024)} MB (${Math.round(saved / totalOrig * 100)}%)`);
  } else {
    const totalOrig = results.converted.reduce((s, f) => s + f.originalBytes, 0);
    const totalWebP = results.converted.reduce((s, f) => s + f.webpBytes, 0);
    console.log(`Converted: ${results.converted.length} | Skipped: ${results.skipped.length} | Errors: ${results.errors.length}`);
    console.log(`Saved: ${Math.round((totalOrig - totalWebP) / 1024 / 1024)} MB`);
    if (results.errors.length) {
      console.log('\nFailed files (check before running SQL UPDATE):');
      results.errors.forEach(e => console.log(`  ${e.name} [${e.stage}]: ${e.error}`));
    }
  }

  // Write results for targeted SQL generation
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULTS_FILE}`);

  // Generate targeted SQL UPDATE (only for successfully converted files)
  if (!DRY_RUN && results.converted.length > 0) {
    const ids = results.converted.map(f => `'${f.original}'`).join(',\n  ');
    const sql = `-- Generated by compress-item-images.mjs
-- Only updates items where WebP conversion was confirmed successful
-- Run ONLY after verifying images render correctly in the storefront

UPDATE public.items
SET image_url = regexp_replace(image_url, '\\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url LIKE '%/${BUCKET}/%'
  AND (
    ${results.converted.map(f =>
      `image_url LIKE '%/${f.original}'`
    ).join('\n    OR ')}
  )
  AND image_url ~* '\\.(jpe?g|png)$';

-- Also update products table
UPDATE public.products
SET image_url = regexp_replace(image_url, '\\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url LIKE '%/${BUCKET}/%'
  AND (
    ${results.converted.map(f =>
      `image_url LIKE '%/${f.original}'`
    ).join('\n    OR ')}
  )
  AND image_url ~* '\\.(jpe?g|png)$';
`;
    writeFileSync('./compress-update.sql', sql);
    console.log('SQL UPDATE written to ./compress-update.sql');
    console.log('⚠️  Review compress-results.json for errors BEFORE running the SQL.');
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
