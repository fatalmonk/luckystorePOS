#!/usr/bin/env node

/**
 * Deterministic Test Storefront Seeder for CI
 *
 * Executes the canonical SQL fixture file (supabase/seed/storefront_test_fixtures.sql)
 * directly against the dedicated test Supabase project (grxxenvdhfwzafzyykgo).
 *
 * Execution Priority:
 * 1. Supabase Management API (via SUPABASE_ACCESS_TOKEN) -> raw SQL execution
 * 2. Direct Postgres connection (via DATABASE_URL or TEST_DATABASE_URL) -> raw SQL execution
 * 3. Table-level service_role upserts derived from canonical SQL definition
 *
 * Safety enforcement:
 * - Hard-fails immediately if targeted against production (hvmyxyccfnkrbxqbhlnm).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_REF = 'hvmyxyccfnkrbxqbhlnm';
const APPROVED_TEST_REF = 'grxxenvdhfwzafzyykgo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';

const fixturePath = path.resolve(__dirname, '../../supabase/seed/storefront_test_fixtures.sql');

if (!fs.existsSync(fixturePath)) {
  console.error(`FATAL: Canonical fixture file not found at ${fixturePath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(fixturePath, 'utf8');

// Safety verification
let projectRef = '';
try {
  if (supabaseUrl) {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } else if (databaseUrl) {
    projectRef = (databaseUrl.match(/postgres\.([a-z0-9]+):/) || [])[1] || '';
  }
} catch {
  console.error(`Invalid Supabase URL: ${supabaseUrl}`);
  process.exit(1);
}

if (projectRef === PRODUCTION_REF) {
  console.error('FATAL: Refusing to seed against production Supabase (hvmyxyccfnkrbxqbhlnm)!');
  process.exit(1);
}

if (projectRef && projectRef !== APPROVED_TEST_REF) {
  console.warn(`Warning: Target project ref is ${projectRef} (Approved: ${APPROVED_TEST_REF})`);
}

async function runViaManagementApi(token, ref, sql) {
  console.log(`[Seed] Executing ${fixturePath} via Supabase Management API (project: ${ref})...`);
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Management API query failed (${response.status}): ${errorText}`);
  }

  console.log('[Seed] ✓ Canonical SQL fixtures applied successfully via Management API.');
}

async function runViaPostgres(connectionString, sql) {
  console.log('[Seed] Executing canonical SQL fixtures via Postgres connection...');
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[Seed] ✓ Canonical SQL fixtures applied successfully via Postgres.');
  } finally {
    await client.end();
  }
}

async function runViaServiceRoleClient(url, key) {
  console.log('[Seed] Applying fixtures via Supabase service_role PostgREST client...');
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

  // 0. Clean mutable test orders & idempotency keys
  await supabase.from('orders').delete().eq('store_id', STORE_ID).in('customer_name', ['Isolated Test Order', 'Confirmation Test', 'Local Test']);
  await supabase.from('idempotency_keys').delete().eq('tenant_id', TENANT_ID);

  // 1. Tenant
  const { error: tErr } = await supabase.from('tenants').upsert({ id: TENANT_ID, name: 'Lucky Store Test Tenant' });
  if (tErr) throw tErr;

  // 2. Store
  const { error: sErr } = await supabase.from('stores').upsert({ id: STORE_ID, tenant_id: TENANT_ID, name: 'Lucky Store Chattogram Main' });
  if (sErr) throw sErr;

  // 3. Categories
  const categories = [
    { id: 'c0000000-0000-0000-0000-000000000001', store_id: STORE_ID, name: 'Rice & Grains', slug: 'rice-and-grain', emoji: '🍚', active: true, display_order: 1 },
    { id: 'c0000000-0000-0000-0000-000000000002', store_id: STORE_ID, name: 'Dairy & Eggs', slug: 'dairy-and-eggs', emoji: '🥛', active: true, display_order: 2 },
    { id: 'c0000000-0000-0000-0000-000000000003', store_id: STORE_ID, name: 'Snacks', slug: 'snacks', emoji: '🍿', active: true, display_order: 3 },
    { id: 'c0000000-0000-0000-0000-000000000004', store_id: STORE_ID, name: 'Cleaning Supplies', slug: 'cleaning-supplies', emoji: '🧼', active: true, display_order: 4 },
    { id: 'c0000000-0000-0000-0000-000000000005', store_id: STORE_ID, name: 'Cooking Essentials', slug: 'cooking-essentials', emoji: '🌾', active: true, display_order: 5 },
    { id: 'c0000000-0000-0000-0000-000000000006', store_id: STORE_ID, name: 'Beverages', slug: 'beverages', emoji: '🧃', active: true, display_order: 6 },
    { id: 'c0000000-0000-0000-0000-000000000007', store_id: STORE_ID, name: 'Personal Care', slug: 'personal-care', emoji: '🧺', active: true, display_order: 7 },
  ];
  const { error: cErr } = await supabase.from('categories').upsert(categories, { onConflict: 'id' });
  if (cErr) throw cErr;

  // 4. Products
  const products = [
    { id: 'a0740000-0000-0000-0000-000000000001', tenant_id: TENANT_ID, name: 'Miniket Rice Premium', brand: 'Lucky Store', price: 85, mrp: 95, cost: 70, category_id: 'c0000000-0000-0000-0000-000000000001', sku: 'RICE-MIN-01', barcode: '894110000001', active: true, is_active: true, image_url: '/banners/promo_welcome_v2_400.webp', description: 'Freshly polished premium Miniket rice sourced from trusted local mills in Dinajpur.' },
    { id: 'a0740000-0000-0000-0000-000000000002', tenant_id: TENANT_ID, name: 'Aarong Dairy Pure Liquid Milk', brand: 'Aarong Dairy', price: 90, mrp: 90, cost: 75, category_id: 'c0000000-0000-0000-0000-000000000002', sku: 'MILK-AAR-01', barcode: '894110000002', active: true, is_active: true, image_url: '/banners/promo_dairy_400.webp', description: 'Pasteurized 100% pure whole cows milk from Aarong Dairy.' },
    { id: 'a0740000-0000-0000-0000-000000000003', tenant_id: TENANT_ID, name: 'Fresh Farm Eggs Layer (12 pcs)', brand: 'Lucky Store', price: 145, mrp: 155, cost: 120, category_id: 'c0000000-0000-0000-0000-000000000002', sku: 'EGG-LAY-12', barcode: '894110000003', active: true, is_active: true, image_url: '/banners/promo_dairy_400.webp', description: 'Fresh farm brown layer eggs carefully graded and packed.' },
    { id: 'a0740000-0000-0000-0000-000000000004', tenant_id: TENANT_ID, name: 'Bombay Sweets Potato Crackers', brand: 'Bombay Sweets', price: 25, mrp: 25, cost: 18, category_id: 'c0000000-0000-0000-0000-000000000003', sku: 'SNK-POT-01', barcode: '894110000004', active: true, is_active: true, image_url: '/banners/promo_snacks_400.webp', description: 'Classic crispy potato chips with authentic local spice seasoning.' },
    { id: 'a0740000-0000-0000-0000-000000000005', tenant_id: TENANT_ID, name: 'Vim Dishwashing Liquid 500ml', brand: 'Vim', price: 130, mrp: 140, cost: 100, category_id: 'c0000000-0000-0000-0000-000000000004', sku: 'CLN-VIM-01', barcode: '894110000005', active: true, is_active: true, image_url: '/banners/promo_cleaning_supply_400.webp', description: 'Concentrated dishwash gel with lemon grease-cutting power.' },
    { id: 'a0740000-0000-0000-0000-000000000006', tenant_id: TENANT_ID, name: 'Pran Mustard Oil 500ml', brand: 'Pran', price: 180, mrp: 195, cost: 150, category_id: 'c0000000-0000-0000-0000-000000000005', sku: 'OIL-PRAN-500', barcode: '894110000006', active: true, is_active: true, image_url: '/banners/promo_cooking_400.webp', description: 'Pure grade-1 pungent mustard oil for traditional cooking.' },
    { id: 'a0740000-0000-0000-0000-000000000099', tenant_id: TENANT_ID, name: 'Auth test rice', brand: 'Lucky Store', price: 100, mrp: 100, cost: 80, category_id: 'c0000000-0000-0000-0000-000000000001', sku: 'AUTH-TEST-01', barcode: '894110000099', active: true, is_active: true, image_url: '/banners/promo_welcome_v2_400.webp', description: 'Deterministic test product for auth boundary and checkout test verification.' },
    { id: 'a0740000-0000-0000-0000-000000000007', tenant_id: TENANT_ID, name: 'Radhuni Turmeric Powder 200g', brand: 'Radhuni', price: 95, mrp: 95, cost: 75, category_id: 'c0000000-0000-0000-0000-000000000005', sku: 'RAD-TUR-200', barcode: '894110000007', active: true, is_active: true, image_url: '/banners/promo_cooking_400.webp', description: 'Finely milled pure turmeric powder for cooking.' },
  ];
  const { error: iErr } = await supabase.from('items').upsert(products, { onConflict: 'id' });
  if (iErr) throw iErr;

  // 5. Stock levels
  const stockLevels = products.map((p) => ({
    store_id: STORE_ID,
    item_id: p.id,
    qty: p.id === 'a0740000-0000-0000-0000-000000000007' ? 0 : 50,
  }));
  const { error: slErr } = await supabase.from('stock_levels').upsert(stockLevels, { onConflict: 'store_id,item_id' });
  if (slErr) throw slErr;

  console.log('[Seed] ✓ Fixtures applied via service_role PostgREST client.');
}

async function main() {
  if (accessToken && projectRef) {
    try {
      await runViaManagementApi(accessToken, projectRef, sqlContent);
      return;
    } catch (err) {
      console.warn(`[Seed] Management API failed: ${err.message}. Falling back...`);
    }
  }

  if (databaseUrl) {
    try {
      await runViaPostgres(databaseUrl, sqlContent);
      return;
    } catch (err) {
      console.warn(`[Seed] Postgres connection failed: ${err.message}. Falling back...`);
    }
  }

  if (supabaseUrl && serviceKey) {
    await runViaServiceRoleClient(supabaseUrl, serviceKey);
    return;
  }

  throw new Error('No valid database execution method available. Provide SUPABASE_ACCESS_TOKEN, TEST_DATABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.');
}

main().catch((err) => {
  console.error('[Seed] FATAL:', err.message);
  process.exit(1);
});
