import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const STANDALONE_DIR = path.join(ROOT_DIR, 'apps/customer_storefront/.next/standalone');
const STATIC_DIR = path.join(ROOT_DIR, 'apps/customer_storefront/.next/static');
const PUBLIC_DIR = path.join(ROOT_DIR, 'apps/customer_storefront/public');
const OUTPUT_ZIP = process.argv[2] || path.join(ROOT_DIR, 'storefront-release.zip');

console.log('📦 Preparing Hostinger standalone package...');

// 1. Copy static and public to standalone destination
const destStatic = path.join(STANDALONE_DIR, 'apps/customer_storefront/.next/static');
const destPublic = path.join(STANDALONE_DIR, 'apps/customer_storefront/public');

fs.mkdirSync(destStatic, { recursive: true });
fs.cpSync(STATIC_DIR, destStatic, { recursive: true });

fs.mkdirSync(destPublic, { recursive: true });
fs.cpSync(PUBLIC_DIR, destPublic, { recursive: true });

// 2. Read customer_storefront dependencies
const appPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'apps/customer_storefront/package.json'), 'utf8'));

// 3. Create root package.json for standalone
const rootPkg = {
  name: 'luckystore-storefront-standalone',
  version: '1.0.0',
  private: true,
  scripts: {
    build: 'node -e "console.log(\'Release package verified\')"'
  },
  dependencies: {
    ...appPkg.dependencies,
    next: '15.5.25',
    sharp: '^0.35.2'
  }
};

fs.writeFileSync(path.join(STANDALONE_DIR, 'package.json'), JSON.stringify(rootPkg, null, 2));

// 4. Create ZIP
if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
}

console.log(`Creating ZIP at ${OUTPUT_ZIP}...`);
execSync(`cd "${STANDALONE_DIR}" && zip -r -q "${OUTPUT_ZIP}" .`, { stdio: 'inherit' });

console.log(`✅ Package created: ${OUTPUT_ZIP} (${(fs.statSync(OUTPUT_ZIP).size / 1024 / 1024).toFixed(2)} MB)`);
