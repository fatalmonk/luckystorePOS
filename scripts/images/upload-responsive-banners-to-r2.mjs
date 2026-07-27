import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { signV4Put } from '../lib/_r2-s3.mjs';

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

async function uploadBanners() {
  const env = loadEnv();
  const r2AccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2Bucket = env.R2_BUCKET_NAME || 'lucky-store-images';
  const r2PublicUrl = env.R2_PUBLIC_URL || 'https://images.luckystore1947.com';

  if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
    console.error('❌ Missing Cloudflare R2 credentials in .env');
    process.exit(1);
  }

  const s3Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
  const bannersDir = resolve(process.cwd(), 'apps/customer_storefront/public/banners');

  if (!existsSync(bannersDir)) {
    console.error(`❌ Banners directory not found at: ${bannersDir}`);
    process.exit(1);
  }

  const files = readdirSync(bannersDir).filter(f => f.endsWith('.avif') || f.endsWith('.webp') || f.endsWith('.png'));
  console.log(`🚀 Found ${files.length} banner files to upload to R2 (${r2Bucket})...\n`);

  let count = 0;
  for (const file of files) {
    const filePath = join(bannersDir, file);
    const fileBuffer = readFileSync(filePath);
    const key = `banners/${file}`;

    const contentType = file.endsWith('.avif')
      ? 'image/avif'
      : file.endsWith('.webp')
      ? 'image/webp'
      : 'image/png';

    try {
      const signedHeaders = await signV4Put(
        s3Endpoint, r2Bucket, key, fileBuffer, r2AccessKey, r2SecretKey
      );

      const response = await fetch(`${s3Endpoint}/${r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          ...signedHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`  ❌ Failed ${file}: ${response.status} ${errText.slice(0, 100)}`);
      } else {
        count++;
        console.log(`  ✓ Uploaded [${count}/${files.length}]: ${file} (${Math.round(fileBuffer.length / 1024)} KB)`);
      }
    } catch (err) {
      console.error(`  ❌ Error ${file}:`, err.message);
    }
  }

  console.log(`\n✨ Successfully uploaded ${count} banner files to ${r2PublicUrl}/banners/`);
}

uploadBanners().catch(console.error);
