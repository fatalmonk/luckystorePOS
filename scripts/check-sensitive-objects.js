/**
 * Scan R2 bucket keys for potentially sensitive objects (.git, .env, etc.).
 *
 * Environment:
 *   R2_BUCKET_NAME          - bucket name (default: lucky-store-images)
 *   R2_ACCOUNT_ID           - Cloudflare account ID
 *   R2_ACCESS_KEY_ID          - S3-compatible access key
 *   R2_SECRET_ACCESS_KEY      - S3-compatible secret key
 *
 * Usage:
 *   node scripts/check-sensitive-objects.js
 */

import { listR2Objects } from './_r2-s3-list.mjs';

const bucket = process.env.R2_BUCKET_NAME || 'lucky-store-images';
const accountId = process.env.R2_ACCOUNT_ID;
const accessKey = process.env.R2_ACCESS_KEY_ID;
const secretKey = process.env.R2_SECRET_ACCESS_KEY;

const disallowed = ['.git', '.env', '.git/HEAD', '.env.backup'];

async function main() {
  if (!accountId || !accessKey || !secretKey) {
    console.error('❌ Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    process.exit(1);
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const objects = await listR2Objects(endpoint, bucket, { maxKeys: 1000 });

  let found = 0;
  for (const key of objects) {
    if (disallowed.some(d => key.startsWith(d))) {
      console.warn('Sensitive object found:', key);
      found++;
    }
  }

  console.log(`Scan complete: ${objects.length} objects checked, ${found} sensitive matches`);
  if (found > 0) process.exit(2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
