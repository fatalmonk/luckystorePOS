/**
 * Migrate product images from Supabase Storage → Cloudflare R2.
 * 
 * Downloads each image from Supabase Storage, uploads to R2,
 * and updates the items.image_url column to point to R2.
 * 
 * Usage:
 *   node scripts/images/migrate-images-to-r2.mjs              # full migration
 *   node scripts/images/migrate-images-to-r2.mjs --dry-run     # show what would migrate
 *   node scripts/images/migrate-images-to-r2.mjs --limit=50    # only migrate 50 images
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
  return env;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

  const env = loadEnv();
  
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const r2AccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2Bucket = env.R2_BUCKET_NAME || 'lucky-store-images';
  const r2PublicUrl = env.R2_PUBLIC_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
    console.error('❌ Missing R2 credentials (CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all items with image_url pointing to Supabase Storage
  const { data: items, error } = await supabase
    .from('items')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .like('image_url', '%supabase.co%');

  if (error) {
    console.error('❌ Failed to fetch items:', error.message);
    process.exit(1);
  }

  console.log(`📦 Found ${items.length} images on Supabase Storage`);
  
  if (limit !== Infinity) {
    console.log(`   Limiting to ${limit} images`);
  }

  if (dryRun) {
    console.log('\n📋 Dry run — showing first 10 images that would migrate:');
    items.slice(0, 10).forEach(item => {
      const oldUrl = item.image_url;
      const key = oldUrl.split('/product-images/')[1] || oldUrl.split('/').slice(-2).join('/');
      const newUrl = `${r2PublicUrl}/${key}`;
      console.log(`  ${item.id}: ${oldUrl.slice(-50)} → ${newUrl.slice(-50)}`);
    });
    return;
  }

  const s3Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items.slice(0, limit)) {
    const oldUrl = item.image_url;
    
    // Extract key from Supabase URL
    const keyMatch = oldUrl.match(/product-images\/(.+)$/);
    if (!keyMatch) {
      console.log(`  ⏭️  ${item.id}: couldn't parse key, skipping`);
      skipped++;
      continue;
    }
    
    const key = keyMatch[1];
    const newUrl = `${r2PublicUrl}/${key}`;
    
    process.stdout.write(`  ${item.id}: ${key}... `);

    try {
      // Download from Supabase Storage
      const downloadResponse = await fetch(oldUrl);
      if (!downloadResponse.ok) {
        console.log(`FAIL (download: ${downloadResponse.status})`);
        failed++;
        continue;
      }

      const imageBuffer = await downloadResponse.arrayBuffer();
      const contentType = downloadResponse.headers.get('content-type') || 'image/jpeg';

      // Upload to R2 via S3 API
      // Minimal S3 PUT — uses AWS Signature V4
      const { signV4Put } = await import('../lib/_r2-s3.mjs');
      const signedHeaders = await signV4Put(
        s3Endpoint, r2Bucket, key, imageBuffer, r2AccessKey, r2SecretKey
      );

      const uploadResponse = await fetch(`${s3Endpoint}/${r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          ...signedHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: imageBuffer,
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        console.log(`FAIL (upload: ${uploadResponse.status} ${errText.slice(0, 100)})`);
        failed++;
        continue;
      }

      // Update items.image_url to R2 URL
      const { error: updateError } = await supabase
        .from('items')
        .update({ image_url: newUrl })
        .eq('id', item.id);

      if (updateError) {
        console.log(`FAIL (db update: ${updateError.message})`);
        failed++;
        continue;
      }

      console.log('✓');
      migrated++;
    } catch (err) {
      console.log(`FAIL: ${err.message.slice(0, 100)}`);
      failed++;
    }
  }

  console.log(`\n✅ Migration complete: ${migrated} migrated, ${failed} failed, ${skipped} skipped`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});