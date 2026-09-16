#!/usr/bin/env node

/**
 * Storefront CI Preflight Check
 *
 * Verifies that the dedicated test Supabase environment (grxxenvdhfwzafzyykgo)
 * is ready for E2E testing before Playwright executes.
 *
 * Checks:
 * 1. Hard-blocks against production (hvmyxyccfnkrbxqbhlnm).
 * 2. Verifies table readability for categories, items, stock_levels.
 * 3. Verifies search_items_pos RPC exists and returns catalog items with positive stock.
 * 4. Verifies create_order_with_stock_idempotent RPC signature exists.
 */

import { createClient } from '@supabase/supabase-js';

const PRODUCTION_REF = 'hvmyxyccfnkrbxqbhlnm';
const APPROVED_TEST_REF = 'grxxenvdhfwzafzyykgo';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !anonKey) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

let projectRef = '';
try {
  projectRef = new URL(supabaseUrl).hostname.split('.')[0];
} catch {
  console.error(`FATAL: Invalid Supabase URL: ${supabaseUrl}`);
  process.exit(1);
}

if (!new URL(supabaseUrl).hostname.endsWith('.supabase.co')) {
  console.error('FATAL: Supabase URL must use a *.supabase.co hostname.');
  process.exit(1);
}

if (projectRef === PRODUCTION_REF) {
  console.error('FATAL: Aborting preflight. Targeting production Supabase (hvmyxyccfnkrbxqbhlnm) is forbidden!');
  process.exit(1);
}

if (projectRef !== APPROVED_TEST_REF) {
  console.error(`[Preflight] FATAL: Target ref is ${projectRef || 'unknown'}; only ${APPROVED_TEST_REF} is approved.`);
  process.exit(1);
}

const client = createClient(supabaseUrl, anonKey);
const adminClient = serviceKey ? createClient(supabaseUrl, serviceKey) : client;

async function runPreflight() {
  console.log(`[Preflight] Running schema & connectivity checks against ${projectRef}...`);

  // 1. Categories
  const { data: catData, error: catErr } = await client
    .from('categories')
    .select('id, name, slug, active')
    .eq('active', true);
  if (catErr) throw new Error(`Categories table check failed: ${catErr.message}`);
  if (!catData || catData.length === 0) {
    throw new Error('Categories table returned 0 active categories. Has the test database been seeded?');
  }
  console.log(`✓ Categories accessible (${catData.length} active categories found)`);

  // 2. Items & Stock Levels
  const { data: itemData, error: itemErr } = await adminClient
    .from('items')
    .select('id, name, price, is_active')
    .eq('is_active', true)
    .limit(10);
  if (itemErr) throw new Error(`Items table check failed: ${itemErr.message}`);
  if (!itemData || itemData.length === 0) {
    throw new Error('Items table returned 0 active items. Has the test database been seeded?');
  }
  console.log(`✓ Items table accessible (${itemData.length} items sampled)`);

  // 3. search_items_pos RPC
  const { data: searchData, error: searchErr } = await client.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: '',
    p_category_id: null,
    p_limit: 10,
    p_offset: 0,
  });
  if (searchErr) throw new Error(`search_items_pos RPC check failed: ${searchErr.message}`);
  const items = searchData ?? [];
  if (items.length === 0 || !items.some((item) => Number(item.qty_on_hand) > 0)) {
    throw new Error(`search_items_pos returned no sellable stock for store ${STORE_ID}. Check stock_levels association.`);
  }
  console.log(`✓ search_items_pos RPC verified (${items.length} items returned for store)`);

  // 4. Probe the order RPC with an invalid store so existence is tested without
  // inserting an order or touching stock/idempotency state.
  const { error: orderRpcErr } = await client.rpc('create_order_with_stock_idempotent', {
    p_order_number: 'INVALID-PROBE',
    p_tenant_id: '00000000-0000-0000-0000-000000000001',
    p_store_id: '00000000-0000-0000-0000-000000000000',
    p_customer_name: 'Probe',
    p_customer_phone: '01700000000',
    p_customer_address: 'Probe address',
    p_items: [],
    p_subtotal: 0,
    p_delivery_fee: 0,
    p_total: 0,
    p_payment_method: 'cod',
    p_notes: null,
    p_delivery_slot: null,
    p_idempotency_key: null,
  });

  if (orderRpcErr) {
    // If error is schema/format validation (e.g. 'Invalid checkout details' or 'Cart is empty' or 'function does not exist')
    if (
      orderRpcErr.message.includes('does not exist') ||
      orderRpcErr.code === '42883' ||
      orderRpcErr.code === 'PGRST202'
    ) {
      throw new Error(`create_order_with_stock_idempotent RPC missing: ${orderRpcErr.message}`);
    }
    console.log(`✓ create_order_with_stock_idempotent RPC signature verified (Validation trigger: ${orderRpcErr.message})`);
  } else {
    console.log('✓ create_order_with_stock_idempotent RPC signature verified');
  }

  console.log('[Preflight] All schema and RPC preflight checks passed.');
}

runPreflight().catch((err) => {
  console.error('[Preflight] FAILED:', err.message);
  process.exit(1);
});
