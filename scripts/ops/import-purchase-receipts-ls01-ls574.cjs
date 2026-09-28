#!/usr/bin/env node
/*
 * Bulk import purchase receipts (LS01 to LS574) into `public.purchase_receipts`.
 * Source: Lucky Store Expenses spreadsheet (Expense Category = "Stock Purchase")
 * Target: supabase.public.purchase_receipts (tenant: 00000000-0000-0000-0000-000000000001)
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const repoRoot = path.resolve(__dirname, '../..');
const adminEnv = path.join(repoRoot, 'apps', 'admin_web', '.env.local');
dotenv.config({ path: adminEnv });

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE URL or SERVICE_ROLE_KEY in', adminEnv);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Custom CSV parser handling quotes
  function parseLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur);
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ? values[idx].trim() : '';
    });
    records.push(obj);
  }
  return records;
}

(async () => {
  // 1. Fetch suppliers mapping (name -> id)
  const supplierMap = new Map();
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('parties')
      .select('id, name')
      .eq('tenant_id', TENANT_ID)
      .eq('type', 'supplier')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch suppliers:', error.message);
      process.exit(1);
    }
    (data || []).forEach(r => supplierMap.set(String(r.name).trim().toLowerCase(), r.id));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Loaded ${supplierMap.size} suppliers from DB.`);

  // Supplier alias mapping
  const aliasMap = new Map([
    ['pran', 'pran agro limited'],
    ['pran-rfl', 'pran agro limited'],
    ['perfetti bangladesh', 'perfetti'],
    ['q & q trading ltd', 'q&q trading ltd'],
    ['haque food industries', 'hoque food industries limited'],
    ['haque food industries ', 'hoque food industries limited'],
    ['noboshopno trading', 'naba shopno trading'],
    ['m/s jiisan enterprise - tang/cadbury', 'm/s jisan enterprise - tang/cadbury'],
    ['maggi masala', 'maggi'],
    ['olympic', 'olympic industries'],
  ]);

  // 2. Fetch existing invoice numbers to prevent duplicate inserts
  const existingInvoices = new Set();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('purchase_receipts')
      .select('invoice_number')
      .eq('tenant_id', TENANT_ID)
      .not('invoice_number', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch existing purchase receipts:', error.message);
      process.exit(1);
    }
    (data || []).forEach(r => existingInvoices.add(r.invoice_number));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Loaded ${existingInvoices.size} existing invoice numbers from DB.`);

  // 3. Read and parse CSV
  const csvPath = process.argv[2];
  if (!csvPath) { console.error('Missing CSV path argument'); process.exit(1); }
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);

  const recordsToInsert = [];
  for (const r of rows) {
    if ((r['Expense Category'] || '').trim() !== 'Stock Purchase') continue;
    const inv = (r['Invoice No.'] || '').trim();
    const match = inv.match(/^LS\s*0*(\d+)$/i);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 574) continue;

    if (existingInvoices.has(inv)) {
      console.log(`Skipping existing invoice ${inv}`);
      continue;
    }

    const vendor = (r['Vendor'] || '').trim();
    let vKey = vendor.toLowerCase();
    if (aliasMap.has(vKey)) {
      vKey = aliasMap.get(vKey);
    }
    const supplierId = supplierMap.get(vKey) || null;

    const amtStr = (r['Amount'] || '').replace(/,/g, '').trim();
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0) {
      console.error(`Invalid or non-positive amount for invoice ${inv}: "${amtStr}"`);
      process.exit(1);
    }

    const dStr = (r['Date'] || '').trim();
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dStr)) {
      console.error(`Invalid date format for invoice ${inv}: "${dStr}". Expected DD/MM/YYYY.`);
      process.exit(1);
    }
    let createdAt = '2026-03-01T00:00:00.000Z';
    if (dStr) {
      const parts = dStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        createdAt = `${year}-${month}-${day}T00:00:00.000Z`;
      }
    }

    const payType = (r['Payment type'] || '').trim();
    const desc = (r['Item description'] || '').trim();
    const notesParts = [];
    if (payType) notesParts.push(`Payment: ${payType}`);
    if (desc) notesParts.push(`Desc: ${desc}`);
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : null;

    recordsToInsert.push({
      tenant_id: TENANT_ID,
      store_id: STORE_ID,
      supplier_id: supplierId,
      invoice_number: inv,
      invoice_total: amt,
      amount_paid: amt,
      status: 'posted',
      notes: notes,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  console.log(`Prepared ${recordsToInsert.length} purchase receipts to insert.`);

  if (recordsToInsert.length === 0) {
    console.log('No new purchase receipts to insert.');
    return;
  }

  // 4. Batch insert
  let inserted = 0;
  for (const batch of chunk(recordsToInsert, 100)) {
    const { data: insertedRows, error } = await supabase
      .from('purchase_receipts')
      .insert(batch)
      .select('id, invoice_number');

    if (error) {
      console.error('Batch insert error:', error.message);
      process.exit(1);
    } else {
      const count = insertedRows?.length ?? 0;
      inserted += count;
      console.log(`  Inserted batch of ${count} receipts`);
    }
  }

  console.log(`✓ Bulk import completed. Successfully inserted ${inserted} purchase receipts.`);
})().catch(err => {
  console.error('Unexpected error:', err?.message ?? err);
  process.exit(1);
});
