/**
 * Sync selected data from a remote Supabase project into the local Supabase stack.
 *
 * This script is intentionally one-way:
 * - remote project -> local project
 * - service-role keys only
 * - merge/upsert by default so existing local rows are preserved unless IDs match
 *
 * Usage:
 *   node scripts/ops/sync-supabase-data.js
 *   node scripts/ops/sync-supabase-data.js --tables=tenants,stores,users,items
 *   node scripts/ops/sync-supabase-data.js --truncate
 *   node scripts/ops/sync-supabase-data.js --dry-run
 *
 * Environment:
 *   REMOTE_SUPABASE_URL
 *   REMOTE_SUPABASE_SERVICE_ROLE_KEY
 *   LOCAL_SUPABASE_URL                  Optional. Defaults to local CLI URL or SUPABASE_URL.
 *   LOCAL_SUPABASE_SERVICE_ROLE_KEY     Optional. Defaults to local CLI key or SUPABASE_SERVICE_ROLE_KEY.
 */

import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');

for (const envFile of [
  join(repoRoot, '.env'),
  join(repoRoot, '.env.local'),
  join(repoRoot, 'apps', 'admin_web', '.env.local'),
]) {
  if (existsSync(envFile)) {
    config({ path: envFile });
  }
}

const DEFAULT_TABLES = [
  'tenants',
  'stores',
  'users',
  'categories',
  'suppliers',
  'customers',
  'items',
  'stock_levels',
  'stock_batches',
  'purchase_orders',
  'purchase_order_items',
  'expenses',
  'pos_sessions',
  'sales',
  'sale_items',
  'sale_payments',
  'stock_movements',
  'reminders',
];

const args = new Set(process.argv.slice(2));
const tablesArg = process.argv.slice(2).find((arg) => arg.startsWith('--tables='));
const batchSizeArg = process.argv.slice(2).find((arg) => arg.startsWith('--batch-size='));
const dryRun = args.has('--dry-run');
const truncateFirst = args.has('--truncate');
const batchSize = Number.parseInt(batchSizeArg?.split('=')[1] ?? '500', 10);
const tables = tablesArg
  ? tablesArg
      .split('=')[1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : DEFAULT_TABLES;

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function readLocalCliEnv() {
  try {
    const output = execFileSync('supabase', ['status', '-o', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = {};
    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes('=')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed.slice(separatorIndex + 1);
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

function isLocalUrl(url) {
  return /127\.0\.0\.1|localhost/.test(url);
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllRows(client, tableName) {
  const results = [];
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await client.from(tableName).select('*').range(from, to);
    if (error) {
      throw new Error(`Remote fetch failed for ${tableName}: ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }
    results.push(...data);
    if (data.length < batchSize) {
      break;
    }
    from += batchSize;
  }

  return results;
}

function truncateTable(tableName, localDbUrl) {
  execFileSync(
    'supabase',
    [
      'db',
      'query',
      `truncate table public.${tableName} restart identity cascade;`,
      '--db-url',
      localDbUrl,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

async function upsertRows(client, tableName, rows) {
  for (const chunk of chunkRows(rows, batchSize)) {
    const { error } = await client.from(tableName).upsert(chunk, { ignoreDuplicates: false });
    if (error) {
      throw new Error(`Local upsert failed for ${tableName}: ${error.message}`);
    }
  }
}

async function main() {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    fail('`--batch-size` must be a positive integer.');
  }

  const cliEnv = readLocalCliEnv();
  const remoteUrl =
    process.env.REMOTE_SUPABASE_URL ||
    process.env.SUPABASE_REMOTE_URL ||
    process.env.STAGING_SUPABASE_URL;
  const remoteServiceRoleKey =
    process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_REMOTE_SERVICE_ROLE_KEY ||
    process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  const localUrl =
    process.env.LOCAL_SUPABASE_URL ||
    cliEnv.API_URL ||
    cliEnv.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const localDbUrl =
    process.env.LOCAL_DATABASE_URL ||
    process.env.LOCAL_DIRECT_DATABASE_URL ||
    cliEnv.DB_URL ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL;
  const localServiceRoleKey =
    process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ||
    cliEnv.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!remoteUrl) {
    fail('Missing REMOTE_SUPABASE_URL (or SUPABASE_REMOTE_URL / STAGING_SUPABASE_URL).');
  }
  if (!remoteServiceRoleKey) {
    fail(
      'Missing REMOTE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_REMOTE_SERVICE_ROLE_KEY / STAGING_SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
  if (!localUrl) {
    fail('Missing LOCAL_SUPABASE_URL and could not derive a local URL from `supabase status -o env`.');
  }
  if (!localServiceRoleKey) {
    fail(
      'Missing LOCAL_SUPABASE_SERVICE_ROLE_KEY and could not derive a local service key from `supabase status -o env`.'
    );
  }
  if (truncateFirst && !localDbUrl) {
    fail(
      'Missing LOCAL_DATABASE_URL (or DIRECT_DATABASE_URL / DATABASE_URL) required for `--truncate` mode.'
    );
  }
  if (isLocalUrl(remoteUrl)) {
    fail(`REMOTE_SUPABASE_URL points to a local host (${remoteUrl}). That is not a remote project.`);
  }
  if (!isLocalUrl(localUrl)) {
    fail(`LOCAL_SUPABASE_URL must point to localhost/127.0.0.1. Refusing to write to ${localUrl}.`);
  }

  const remote = createClient(remoteUrl, remoteServiceRoleKey, { auth: { persistSession: false } });
  const local = createClient(localUrl, localServiceRoleKey, { auth: { persistSession: false } });

  console.log('Remote -> local Supabase sync');
  console.log(`Remote URL: ${remoteUrl}`);
  console.log(`Local URL: ${localUrl}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : truncateFirst ? 'truncate + upsert' : 'merge/upsert'}`);
  console.log(`Tables: ${tables.join(', ')}`);
  console.log(`Batch size: ${batchSize}`);

  for (const tableName of tables) {
    console.log(`\n→ ${tableName}`);
    const rows = await fetchAllRows(remote, tableName);
    console.log(`  fetched ${rows.length} row(s) from remote`);

    if (dryRun || rows.length === 0) {
      continue;
    }

    if (truncateFirst) {
      console.log('  truncating local table first');
      truncateTable(tableName, localDbUrl);
    }

    await upsertRows(local, tableName, rows);
    console.log(`  upserted ${rows.length} row(s) into local`);
  }

  console.log('\n✅ Sync completed');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
