#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { resolve, extname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'build', 'coverage', '.venv', '.env.local', '.hermes']);

function isGitIgnored(filePath) {
  const rel = relative(process.cwd(), filePath);
  
  // Skip all .env files EXCEPT .env.example
  if (rel.startsWith('.env')) return rel !== '.env.example';
  if (rel.startsWith('apps/admin_web/.env')) return true;
  if (rel.startsWith('apps/customer_storefront/.env')) return true;
  if (rel.startsWith('apps/mobile_app/.env')) return true;
  if (rel.startsWith('apps/mobile_app/env/')) return true;
  if (rel.startsWith('apps/mobile_app/.dart_tool/')) return true;
  if (rel.startsWith('apps/mobile_app/flutter/')) return true;
  if (rel.startsWith('apps/mobile_app/build/')) return true;
  if (rel.startsWith('apps/customer_storefront/.next/')) return true;
  if (rel.startsWith('apps/customer_storefront/dist/')) return true;
  if (rel.startsWith('apps/admin_web/dist/')) return true;
  if (rel.startsWith('dist_public/')) return true;
  if (rel.includes('.vercel')) return true;
  if (rel.startsWith('docs/')) return true;
  if (rel.startsWith('lucky-store-brand-guidelines/')) return true;
  if (rel.startsWith('scripts/data/')) return true;
  if (rel.startsWith('scripts/deploy/')) return true;
  if (rel.startsWith('supabase/tests/.env.test')) return true;
  if (rel.startsWith('.github/workflows/ci.yml')) return true;
  if (rel.startsWith('apps/mobile_app/assets/address_selection.html')) return true;
  if (rel.includes('.venv/')) return true;
  if (rel.includes('node_modules/')) return true;
  
  // Skip binary files
  if (rel.endsWith('.wasm') || rel.endsWith('.snapshot') || rel.endsWith('.xcframework') || 
      rel.endsWith('.framework') || rel.endsWith('.dSYM')) return true;
  
  return false;
}

const ALLOW_PLACEHOLDER = resolve(__dirname, '..', '.env.example');
const SELF = resolve(__dirname, 'secret_scan.js');

const PATTERNS = [
  { re: /SUPABASE_SERVICE_ROLE_KEY=(?!your-|YOUR-|local|test|dummy)[^\s]+/, name: 'Supabase service role key' },
  { re: /SUPABASE_DB_PASSWORD=(?!your-|YOUR-|local|test|dummy)[^\s]+/, name: 'Supabase DB password' },
  { re: /SUPABASE_ACCESS_TOKEN=(?!your-|YOUR-|local|test|dummy)[^\s]+/, name: 'Supabase access token' },
  { re: /DATABASE_URL=postgresql:\/\/[^:]+:(?!your|local|test|dummy)[^\s@]+@/, name: 'DB URL with inline password' },
  { re: /DIRECT_DATABASE_URL=postgresql:\/\/[^:]+:(?!your|local|test|dummy)[^\s@]+@/, name: 'Direct DB URL with inline password' },
  { re: /password=(?!your|local|test|dummy)[^\s&]+/, name: 'Inline connection password parameter' },
  { re: /PASS=(?!your|YOUR|local|test|dummy)[^\s]+/, name: 'Password variable' },
  { re: /SECRET[^=]*=(?!your|YOUR|local|test|dummy|false|true|only_needed_for_ci_cd)[^\s]{4,}/, name: 'Secret variable with value' },
  { re: /API[_-]KEY[^=]*=(?!your-|YOUR-|local|test|dummy)[^\s]{4,}/, name: 'API key' },
  { re: /TOKEN[^=]*=(?!your-|YOUR-|local|test|dummy)[^\s]{4,}/, name: 'Token variable' },
];

let exitCode = 0;

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(full);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf',
         '.zip', '.gz', '.tar', '.exe', '.dll', '.so', '.dylib', '.db', '.sqlite', '.css'].includes(ext)) {
      continue;
    }

    scanFile(full);
  }
}

function scanFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  if (resolve(filePath) === ALLOW_PLACEHOLDER) return;
  if (resolve(filePath) === SELF) return;
  if (isGitIgnored(filePath)) return;

  if (basename(filePath) === '.env') {
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const hasRealSecret = lines.some(line => {
      const val = line.split('=')[1];
      return val && !val.startsWith('your-') && !val.startsWith('<') && val.trim() !== '';
    });
    if (!hasRealSecret) return;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of PATTERNS) {
      if (pattern.re.test(lines[i])) {
        const rel = relative(process.cwd(), filePath);
        console.log(`[SECRET] ${pattern.name} found in ${rel}:${i + 1}`);
        exitCode = 1;
      }
    }
  }
}

const root = process.cwd();
walk(root);

if (exitCode === 0) {
  console.log('No secrets leaked in repository files.');
}
process.exit(exitCode);
