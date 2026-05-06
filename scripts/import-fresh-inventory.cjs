#!/usr/bin/env node
/**
 * Wipe old products/inventory and import fresh data from CSV.
 * Keeps all tables, schema, and structure intact.
 *
 * Usage: node scripts/import-fresh-inventory.js
 * (Must be run from monorepo root with admin_web/node_modules available)
 */

const fs = require('fs');
const path = require('path');

// ── CSV Parser (built-in, handles quoted fields) ────────────────────
function parseCSV(text) {
  const lines = [];
  let i = 0;
  const n = text.length;

  function parseField() {
    if (i >= n) return '';
    if (text[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let field = '';
      while (i < n) {
        if (text[i] === '"') {
          if (i + 1 < n && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += text[i];
          i++;
        }
      }
      return field;
    } else {
      // Unquoted field
      let field = '';
      while (i < n && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        field += text[i];
        i++;
      }
      return field.trim();
    }
  }

  function parseLine() {
    const fields = [];
    while (i < n) {
      const field = parseField();
      fields.push(field);
      if (i >= n) break;
      if (text[i] === ',') {
        i++; // skip comma
      } else if (text[i] === '\n' || text[i] === '\r') {
        while (i < n && (text[i] === '\n' || text[i] === '\r')) i++;
        break;
      }
    }
    return fields;
  }

  while (i < n) {
    const line = parseLine();
    if (line.length > 0 && line.some(f => f !== '')) {
      lines.push(line);
    }
  }

  if (lines.length === 0) return [];
  const headers = lines[0];
  return lines.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });
    return obj;
  });
}

// ── Supabase client ────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY env var');
  process.exit(1);
}

// Resolve supabase-js from admin_web
const modulePath = path.resolve(__dirname, '../apps/admin_web/node_modules/@supabase/supabase-js');
const { createClient } = require(modulePath);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CSV_PATH = process.argv[2] || path.resolve(__dirname, '../data/inventory/Lucky Store Inventory with images - LS-inventory-01.csv');

// ── Helpers ──────────────────────────────────────────────────────────
async function getStoreAndTenant() {
  const { data: stores, error } = await supabase.from('stores').select('id, tenant_id').limit(1);
  if (error || !stores?.length) throw new Error('No store found: ' + (error?.message || 'empty'));
  return { storeId: stores[0].id, tenantId: stores[0].tenant_id };
}

async function deleteAll(table) {
  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    if (error.message.includes('not found') || error.code === '42P01') {
      console.log(`  ${table}: skipped (table not found)`);
    } else {
      console.warn(`  ${table}: ${error.message}`);
    }
  } else {
    console.log(`  ${table}: deleted`);
  }
}

async function deleteByStore(table, storeCol = 'store_id') {
  const { data: storeData, error: storeErr } = await supabase.from('stores').select('id').limit(1);
  if (storeErr || !storeData?.length) return;
  const storeId = storeData[0].id;
  const { error } = await supabase.from(table).delete().eq(storeCol, storeId);
  if (error) {
    if (error.code === '42P01') console.log(`  ${table}: skipped (not found)`);
    else console.warn(`  ${table}: ${error.message}`);
  } else {
    console.log(`  ${table}: deleted`);
  }
}

async function deleteByFK(table, fkCol, parentTable, parentStoreCol = 'store_id') {
  const { data: storeData } = await supabase.from('stores').select('id').limit(1);
  if (!storeData?.length) return;
  const storeId = storeData[0].id;

  const { data: parents, error: pErr } = await supabase.from(parentTable).select('id').eq(parentStoreCol, storeId);
  if (pErr || !parents?.length) { console.log(`  ${table}: nothing to delete`); return; }

  const ids = parents.map(r => r.id);
  const { error } = await supabase.from(table).delete().in(fkCol, ids);
  if (error) console.warn(`  ${table}: ${error.message}`);
  else console.log(`  ${table}: deleted`);
}

async function wipeData() {
  console.log('Wiping old data (respecting FK order)...');

  // 1. Sales chain (RESTRICT on items)
  await deleteByFK('sale_payments', 'sale_id', 'sales');
  await deleteByFK('sale_items', 'sale_id', 'sales');
  await deleteByStore('sales');

  // 2. Purchase chain (RESTRICT on items/inventory_items)
  await deleteByFK('purchase_receipt_items', 'receipt_id', 'purchase_receipts');
  await deleteByStore('purchase_receipts');
  await deleteByFK('purchase_order_items', 'po_id', 'purchase_orders');
  await deleteByStore('purchase_orders');

  // 3. Stock transfers (RESTRICT on items)
  await deleteByFK('stock_transfer_items', 'transfer_id', 'stock_transfers', 'from_store_id');
  await deleteByStore('stock_transfers', 'from_store_id');

  // 4. Stock audit tables (CASCADE on items but wipe explicitly)
  await deleteByStore('stock_ledger');
  await deleteByStore('stock_movements');
  await deleteByStore('stock_levels');
  await deleteByStore('stock_alert_thresholds');
  await deleteByStore('item_batches');

  // 5. Ledger entries
  await deleteByStore('ledger_entries');
  await deleteByStore('ledger_batches');

  // 6. POS sessions
  await deleteByStore('pos_sessions');

  // 7. Now safe to delete items (CASCADE cleans remaining children)
  await deleteAll('items');
  await deleteAll('inventory_items');
  await deleteAll('categories');

  console.log('Wipe complete.\n');
}

async function importData(storeId, tenantId, rows) {
  const batchSize = 50;

  // ── 1. Categories ────────────────────────────────────────────────
  const categoryNames = [...new Set(rows.map(r => r['Category']).filter(Boolean))];
  console.log(`Creating ${categoryNames.length} categories...`);

  const categoryMap = {};
  for (const name of categoryNames) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, category: name }])
      .select('id')
      .single();
    if (error) {
      const { data: existing } = await supabase.from('categories').select('id').eq('name', name).single();
      if (existing) categoryMap[name] = existing.id;
      else console.warn(`  Category "${name}": ${error.message}`);
    } else {
      categoryMap[name] = data.id;
    }
  }
  console.log(`Categories created: ${Object.keys(categoryMap).length}`);

  // ── 2. Items ──────────────────────────────────────────────────────
  console.log(`Inserting ${rows.length} items...`);
  const items = rows.map(row => ({
    name: row['Item Name'],
    category_id: categoryMap[row['Category']] || null,
    brand: row['Brand'] || null,
    cost: parseFloat(row['Purchase Price']) || 0,
    mrp: parseFloat(row['MRP']) || null,
    price: parseFloat(row['Sales Price']) || 0,
    sku: row['Item Code/SKU/Barcode'] || null,
    barcode: row['Item Code/SKU/Barcode'] || null,
    short_code: row['Item Code/SKU/Barcode'] || null,
    description: row['Description'] || null,
    image_url: row['Image URL'] || null,
    active: true,
  }));

  const itemIdMap = {};
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { data, error } = await supabase.from('items').insert(batch).select('id, name');
    if (error) {
      console.error(`  Batch ${Math.floor(i / batchSize)} error: ${error.message}`);
      for (let j = 0; j < batch.length; j++) {
        const { data: d, error: e } = await supabase.from('items').insert([batch[j]]).select('id');
        if (e) console.error(`    Row ${i + j} "${batch[j].name}": ${e.message}`);
        else if (d?.[0]) itemIdMap[i + j] = d[0].id;
      }
    } else {
      data.forEach((d, j) => { itemIdMap[i + j] = d.id; });
    }
  }
  console.log(`Items inserted: ${Object.keys(itemIdMap).length}`);

  // ── 3. Inventory items (for profit control) ──────────────────────
  console.log('Inserting inventory_items...');
  const invItems = rows.map(row => ({
    tenant_id: tenantId,
    name: row['Item Name'],
    sku: row['Item Code/SKU/Barcode'] || null,
    barcode: row['Item Code/SKU/Barcode'] || null,
  }));
  for (let i = 0; i < invItems.length; i += batchSize) {
    const batch = invItems.slice(i, i + batchSize);
    const { error } = await supabase.from('inventory_items').insert(batch);
    if (error) console.warn(`  inventory_items batch: ${error.message}`);
  }

  // ── 4. Stock levels ───────────────────────────────────────────────
  console.log('Creating stock levels...');
  const stockLevels = [];
  for (let i = 0; i < rows.length; i++) {
    const itemId = itemIdMap[i];
    if (!itemId) continue;
    stockLevels.push({
      store_id: storeId,
      item_id: itemId,
      qty: parseInt(rows[i]['Opening Stock']) || 0,
      low_stock_threshold: parseInt(rows[i]['Low Stock']) || 5,
      version: 1,
    });
  }

  for (let i = 0; i < stockLevels.length; i += batchSize) {
    const batch = stockLevels.slice(i, i + batchSize);
    const { error } = await supabase.from('stock_levels').insert(batch);
    if (error) {
      console.warn(`  stock_levels batch error: ${error.message}`);
      for (const sl of batch) {
        const { error: e } = await supabase.from('stock_levels').insert([sl]);
        if (e) console.warn(`    ${sl.item_id}: ${e.message}`);
      }
    }
  }
  console.log(`Stock levels created: ${stockLevels.length}`);

  // ── 5. Stock movements (audit trail) ──────────────────────────────
  console.log('Recording stock movements...');
  const movements = stockLevels.map(sl => ({
    store_id: storeId,
    item_id: sl.item_id,
    delta: sl.qty,
    reason: 'import',
    meta: JSON.stringify({ source: 'initial_inventory_import', new_qty: sl.qty }),
  }));

  for (let i = 0; i < movements.length; i += batchSize) {
    const batch = movements.slice(i, i + batchSize);
    const { error } = await supabase.from('stock_movements').insert(batch);
    if (error) console.warn(`  stock_movements batch: ${error.message}`);
  }
  console.log(`Stock movements recorded: ${movements.length}`);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Lucky Store Fresh Inventory Import ===\n');

  const { storeId, tenantId } = await getStoreAndTenant();
  console.log(`Store: ${storeId}`);
  console.log(`Tenant: ${tenantId}\n`);

  await wipeData();

  console.log(`Reading CSV: ${CSV_PATH}`);
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(raw);
  console.log(`CSV rows: ${rows.length}\n`);

  await importData(storeId, tenantId, rows);

  console.log('\n=== Import complete ===');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});