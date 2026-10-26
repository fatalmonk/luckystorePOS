#!/usr/bin/env node
/**
 * upload_radhuni_to_r2.mjs
 *
 * Uploads staged Radhuni packshots from data/radhuni-packshots/ to Cloudflare R2 bucket lucky-store-images.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BUCKET = 'lucky-store-images';
const PREFIX = 'products/radhuni';
const MANIFEST_PATH = path.join(process.cwd(), 'data/radhuni-packshots/manifest.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

console.log(`🚀 Uploading ${manifest.length} verified packshots to R2 bucket: ${BUCKET}/${PREFIX}`);

let uploaded = 0;
let failed = 0;

for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i];
  const targetKey = `${BUCKET}/${PREFIX}/${item.filename}`;
  process.stdout.write(`[${i + 1}/${manifest.length}] Uploading ${item.filename}... `);

  try {
    execFileSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', targetKey, '--file', item.stagedPath, '--remote'],
      { stdio: 'pipe', encoding: 'utf8' }
    );
    console.log('✅');
    uploaded++;
  } catch (err) {
    console.log('❌', err.message);
    failed++;
  }
}

console.log(`\n🎉 Upload complete: ${uploaded} succeeded, ${failed} failed.`);
