/**
 * Read-only review of legacy Supabase image references and proposed R2 URLs.
 *
 * Direct R2 uploads and public.items.image_url changes are disabled here.
 * Use the authenticated, ticketed image publication pipeline for an approved
 * batch so object creation and catalog updates follow the same safety checks.
 *
 * Usage:
 *   node scripts/images/migrate-images-to-r2.mjs              # read-only report
 *   node scripts/images/migrate-images-to-r2.mjs --limit=50    # inspect up to 50 rows
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLegacyImageReference } from './legacy-image-reference.mjs';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found');

  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
    env[key] = value;
  }
  return env;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--execute')) {
    console.error('Direct legacy image migration is disabled. Use the authenticated ticketed image pipeline with a separately approved batch.');
    process.exitCode = 2;
    return;
  }

  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : 10;
  if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');

  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const r2PublicUrl = env.R2_PUBLIC_URL;
  if (!supabaseUrl || !supabaseKey || !r2PublicUrl) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and R2_PUBLIC_URL are required for a read-only report');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: items, error } = await supabase
    .from('items')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .like('image_url', '%supabase.co%');
  if (error) throw new Error(`Failed to fetch legacy image references: ${error.message}`);

  const supabaseOrigin = new URL(supabaseUrl).origin;
  const r2BaseUrl = new URL(r2PublicUrl);
  if (r2BaseUrl.protocol !== 'https:' || r2BaseUrl.username || r2BaseUrl.password ||
    r2BaseUrl.pathname !== '/' || r2BaseUrl.search || r2BaseUrl.hash) {
    throw new Error('R2_PUBLIC_URL must be a clean HTTPS base URL');
  }

  const candidates = [];
  for (const item of items ?? []) {
    let parsed;
    try {
      parsed = new URL(item.image_url);
    } catch {
      candidates.push({ itemId: item.id, issue: 'invalid URL' });
      continue;
    }
    if (parsed.origin !== supabaseOrigin) {
      candidates.push({ itemId: item.id, issue: 'origin mismatch' });
      continue;
    }

    const { key, rule } = parseLegacyImageReference(item.image_url);
    if (!key) {
      candidates.push({ itemId: item.id, issue: 'unresolved reference' });
      continue;
    }
    candidates.push({ itemId: item.id, rule, url: `${r2BaseUrl.origin}/${key}` });
  }

  console.log(`Found ${items?.length ?? 0} legacy image references; showing ${Math.min(limit, candidates.length)} read-only candidates.`);
  for (const candidate of candidates.slice(0, limit)) {
    if (candidate.issue) console.log(`${candidate.itemId}: ${candidate.issue}`);
    else console.log(`${candidate.itemId}: ${candidate.rule}: ${candidate.url}`);
  }
  console.log('No database or R2 writes are available through this legacy script.');
}

main().catch((error) => {
  console.error(`Image reference report failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
