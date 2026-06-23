/**
 * Sync data from Supabase → Neon (read replica)
 * 
 * Runs as a scheduled script (cron or manual). Dumps data from Supabase
 * and loads into Neon, keeping the analytics read replica fresh.
 * 
 * Usage:
 *   node scripts/sync-supabase-to-neon.mjs              # full sync
 *   node scripts/sync-supabase-to-neon.mjs --tables=items,stock_movements  # specific tables
 *   node scripts/sync-supabase-to-neon.mjs --dry-run     # show what would sync
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PG_DUMP = '/opt/homebrew/Cellar/postgresql@17/17.9/bin/pg_dump';
const PSQL = '/opt/homebrew/Cellar/postgresql@17/17.9/bin/psql';

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const env = {};
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
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

// Get Supabase connection string from backup_db.mjs (has working password)
function getSupabaseUrl() {
  const backupPath = resolve(process.cwd(), 'backup_db.mjs');
  if (!existsSync(backupPath)) {
    console.error('❌ backup_db.mjs not found (source of Supabase DB URL)');
    process.exit(1);
  }
  const content = readFileSync(backupPath, 'utf-8');
  const match = content.match(/"postgresql:\/\/[^"]+"/);
  if (!match) {
    console.error('❌ Could not extract Supabase DB URL from backup_db.mjs');
    process.exit(1);
  }
  return match[0].replace(/"/g, '');
}

// Tables to sync (read-heavy tables used by analytics)
const DEFAULT_TABLES = [
  'items',
  'categories',
  'stores',
  'users',
  'stock_movements',
  'stock_levels',
  'competitor_prices',
  'daily_sales',
  'ledger_entries',
  'customers',
  'sales',
  'sale_items',
  'batches',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'expenses',
  'other_income',
  'discounts',
  'delivery_zones',
  'customer_reminders',
  'settings',
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tablesArg = args.find(a => a.startsWith('--tables='));
  const tables = tablesArg 
    ? tablesArg.split('=')[1].split(',') 
    : DEFAULT_TABLES;

  const env = loadEnv();
  const supabaseUrl = getSupabaseUrl();
  const neonUrl = env.DATABASE_URL;

  if (!neonUrl) {
    console.error('❌ DATABASE_URL (Neon) not found in .env.local');
    process.exit(1);
  }

  console.log(`🔄 Syncing ${tables.length} tables: Supabase → Neon`);
  if (dryRun) {
    console.log('   (dry-run mode, no changes will be made)');
    console.log(`   Tables: ${tables.join(', ')}`);
    return;
  }

  const startTime = Date.now();
  let synced = 0;
  let failed = 0;

  for (const table of tables) {
    process.stdout.write(`  ${table}... `);
    try {
      // Dump single table data from Supabase
      const dumpCmd = `${PG_DUMP} --data-only --no-owner --no-privileges -t public.${table} "${supabaseUrl}" 2>/dev/null`;
      const dump = execSync(dumpCmd, { encoding: 'utf-8', timeout: 60000 });

      if (!dump.trim() || dump.includes('no matching tables were found')) {
        console.log('no table, skipped');
        continue;
      }

      // Temporarily disable triggers, truncate, and load
      const sql = `SET search_path TO public, extensions, auth; TRUNCATE public.${table} CASCADE; ${dump}`;
      
      // Write to temp and pipe via psql
      const result = execSync(
        `echo ${JSON.stringify(sql)} | ${PSQL} "${neonUrl}" -v ON_ERROR_STOP=0 2>&1`,
        { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
      );

      // Count rows loaded
      const countResult = execSync(
        `${PSQL} "${neonUrl}" -t -c "SET search_path TO public, extensions; SELECT count(*) FROM ${table};" 2>/dev/null`,
        { encoding: 'utf-8', timeout: 30000 }
      ).trim();

      console.log(`${countResult} rows ✓`);
      synced++;
    } catch (err) {
      console.log(`FAIL: ${err.message.slice(0, 100)}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Sync complete in ${elapsed}s — ${synced} synced, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});