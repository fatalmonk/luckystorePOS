import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import sharp from 'sharp';
import { signV4Put } from '../lib/_r2-s3.mjs';

// Load env variables
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    console.error('❌ .env not found');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
  return env;
}

async function run() {
  const env = loadEnv();
  
  const r2AccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2Bucket = env.R2_BUCKET_NAME || 'lucky-store-images';
  const r2PublicUrl = env.R2_PUBLIC_URL || 'https://images.luckystore1947.com';

  if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
    console.error('❌ Missing R2 credentials in .env');
    process.exit(1);
  }

  const s3Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
  const imagesDir = resolve(process.cwd(), 'apps/customer_storefront/public/images');

  if (!existsSync(imagesDir)) {
    console.error(`❌ Public images directory not found at: ${imagesDir}`);
    process.exit(1);
  }

  const files = readdirSync(imagesDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} PNG images to process.`);

  for (const file of files) {
    const filePath = join(imagesDir, file);
    const nameWithoutExt = basename(file, '.png');
    const webpFileName = `${nameWithoutExt}.webp`;
    const webpFilePath = join(imagesDir, webpFileName);
    
    console.log(`Processing: ${file}...`);

    try {
      const pngBuffer = readFileSync(filePath);
      
      // Convert to WebP via sharp
      const webpBuffer = await sharp(pngBuffer)
        .webp({ quality: 85 })
        .toBuffer();

      // Write WebP locally to public directory
      writeFileSync(webpFilePath, webpBuffer);
      console.log(`  Saved WebP locally: ${webpFileName} (${Math.round(webpBuffer.length / 1024)} KB)`);

      // Upload to R2 under key: banners/<webpFileName>
      const key = `banners/${webpFileName}`;
      const signedHeaders = await signV4Put(
        s3Endpoint, r2Bucket, key, webpBuffer, r2AccessKey, r2SecretKey
      );

      const response = await fetch(`${s3Endpoint}/${r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          ...signedHeaders,
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: webpBuffer,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`  ❌ R2 Upload failed: ${response.status} - ${errText}`);
      } else {
        console.log(`  ✓ R2 Uploaded: ${r2PublicUrl}/${key}`);
      }
    } catch (err) {
      console.error(`  ❌ Error processing ${file}:`, err.message);
    }
  }

  console.log('\nAll images processed successfully.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
