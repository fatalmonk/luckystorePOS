import fs from 'node:fs';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import Papa from 'papaparse';

const REPO_ROOT = path.resolve('.');
const RECEIPTS_DIR = path.join(REPO_ROOT, 'data/may-2026-reciepts');
const ITEMS_CSV = path.join(REPO_ROOT, 'data/items_rows.csv');
const OUTPUT_MD = '/Users/mac.alvi/.gemini/antigravity-ide/brain/3c738613-177d-4081-a78d-6fdd46eb2517/receipt_scan_dryrun.md';

const TARGET_INVOICES = [
  'LS127', 'LS128', 'LS129', 'LS130', 'LS132',
  'LS133', 'LS134', 'LS135', 'LS136', 'LS137',
  'LS138', 'LS140', 'LS141', 'LS142', 'LS143',
  'LS144', 'LS146'
];

// Load existing catalog items
let catalogItems = [];
if (fs.existsSync(ITEMS_CSV)) {
  const parsed = Papa.parse(fs.readFileSync(ITEMS_CSV, 'utf8'), { header: true });
  catalogItems = parsed.data.filter(r => r.name);
}

function parseFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const parts = base.split('-');
  const invoiceNumber = parts[0] || null;
  const rawDate = parts[1] || '';
  const vendor = parts[2] || 'Unknown';
  let totalBdt = null;
  if (parts[3]) {
    const m = parts[3].match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m) totalBdt = parseFloat(m[1]);
  }

  // Format date to YYYY-MM-DD
  let formattedDate = rawDate;
  const dParts = rawDate.split(/[_/.-]/);
  if (dParts.length === 3) {
    const day = dParts[0].padStart(2, '0');
    const month = dParts[1].padStart(2, '0');
    const year = dParts[2].length === 2 ? `20${dParts[2]}` : dParts[2];
    formattedDate = `${year}-${month}-${day}`;
  }

  return { invoiceNumber, date: formattedDate, vendor, totalBdt };
}

function matchProduct(name, catalog) {
  const normName = name.trim().toLowerCase();
  if (!normName) return { match: null, isNew: true, score: 0 };

  let best = null;
  let bestScore = 0;

  for (const item of catalog) {
    const candNorm = item.name.trim().toLowerCase();
    if (candNorm === normName) {
      return { match: item, isNew: false, score: 1.0 };
    }

    // Jaccard similarity
    const t1 = new Set(normName.split(/[\s_/-]+/).filter(x => x.length >= 2));
    const t2 = new Set(candNorm.split(/[\s_/-]+/).filter(x => x.length >= 2));
    if (t1.size === 0 || t2.size === 0) continue;

    let inter = 0;
    t1.forEach(t => { if (t2.has(t)) inter++; });
    const union = new Set([...t1, ...t2]).size;
    let score = inter / union;

    if (candNorm.includes(normName) || normName.includes(candNorm)) {
      score = Math.max(score, 0.7);
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (bestScore >= 0.5) {
    return { match: best, isNew: false, score: bestScore };
  }
  return { match: null, isNew: true, score: bestScore };
}

function extractItemsFromOcr(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];

  for (const line of lines) {
    // Filter header / footer noise
    if (/total|subtotal|vat|challan|cash|memo|date|buyer|signature|phone|tel/i.test(line)) continue;

    // Regex for: [Index]? [Name] [Qty] [Price] [Total]?
    const match = line.match(/^([0-9]{1,2}[.\s-])?\s*([a-zA-Z\u0980-\u09FF\s.'()/ -]+?)\s+([0-9]{1,4})\s+([0-9]{1,5}(?:\.[0-9]{1,2})?)(?:\s+([0-9]{1,6}(?:\.[0-9]{1,2})?))?/);
    if (match) {
      const name = match[2].trim().replace(/^[.\s-]+|[.\s-]+$/g, '');
      const qty = parseInt(match[3], 10);
      const unitPrice = parseFloat(match[4]);
      const total = match[5] ? parseFloat(match[5]) : (unitPrice && qty ? qty * unitPrice : 0);

      if (name.length >= 3 && /[a-zA-Z\u0980-\u09FF]/.test(name) && qty > 0) {
        items.push({ name, quantity: qty, unitPrice, total });
      }
    }
  }
  return items;
}

async function main() {
  console.log(`Starting Dry-Run Scan for ${TARGET_INVOICES.length} receipts...`);
  const worker = await createWorker(['eng', 'ben']);

  const allReceipts = fs.readdirSync(RECEIPTS_DIR)
    .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));

  const results = [];
  let totalReceiptsBdt = 0;
  let totalItemsExtracted = 0;

  for (const inv of TARGET_INVOICES) {
    // Find matching image file
    const file = allReceipts.find(f => f.startsWith(inv + '-'));
    if (!file) {
      console.warn(`File for ${inv} not found`);
      continue;
    }

    const filePath = path.join(RECEIPTS_DIR, file);
    const meta = parseFilename(file);
    totalReceiptsBdt += (meta.totalBdt || 0);

    console.log(`Scanning [${inv}] ${file}...`);
    let ocrText = '';
    try {
      const { data } = await worker.recognize(filePath);
      ocrText = data.text;
    } catch (e) {
      console.error(`OCR failed on ${file}:`, e.message);
    }

    const items = extractItemsFromOcr(ocrText);
    totalItemsExtracted += items.length;

    const analyzedItems = items.map(it => {
      const matchRes = matchProduct(it.name, catalogItems);
      return {
        ...it,
        catalogMatch: matchRes.match ? matchRes.match.name : null,
        catalogSku: matchRes.match ? matchRes.match.sku : null,
        isNewProduct: matchRes.isNew,
        matchScore: Math.round(matchRes.score * 100)
      };
    });

    const itemsSum = items.reduce((sum, it) => sum + (it.total || 0), 0);
    const variance = meta.totalBdt ? Math.abs(meta.totalBdt - itemsSum) : 0;

    results.push({
      file,
      invoiceNumber: meta.invoiceNumber,
      date: meta.date,
      vendor: meta.vendor,
      invoiceTotal: meta.totalBdt,
      itemsSum,
      variance,
      items: analyzedItems,
      rawOcrSnippet: ocrText.slice(0, 150).replace(/\n/g, ' ')
    });
  }

  await worker.terminate();

  // Generate Markdown Report
  let md = `# Lucky Store — May 2026 Receipt Scan & Inventory Dry-Run Report\n\n`;
  md += `**Execution Mode:** Dry-run extraction (No DB mutations applied)\n`;
  md += `**Target Environment:** Test Project (\`grxxenvdhfwzafzyykgo\`)\n`;
  md += `**Receipts Analyzed:** ${results.length} invoices\n`;
  md += `**Total Invoiced Amount:** ${totalReceiptsBdt.toFixed(2)} BDT\n`;
  md += `**Total Line Items Extracted:** ${totalItemsExtracted}\n\n`;

  md += `## 1. Invoice Summary & Reconciliation\n\n`;
  md += `| Invoice | Date | Vendor | Invoice Total (BDT) | Extracted Items Sum | Items Count | Status |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    const status = r.items.length === 0 ? '⚠️ No items parsed (review image)' : (r.variance <= 1.0 ? '✅ Reconciled' : '⚠️ Total Variance');
    md += `| ${r.invoiceNumber} | ${r.date} | ${r.vendor} | ${r.invoiceTotal?.toFixed(2) || '0.00'} | ${r.itemsSum.toFixed(2)} | ${r.items.length} | ${status} |\n`;
  }

  md += `\n## 2. Extracted Line Items & Inventory Matching\n\n`;

  for (const r of results) {
    md += `### ${r.invoiceNumber} — ${r.vendor} (${r.date}) — Total: ${r.invoiceTotal || 0} BDT\n`;
    md += `*File: \`${r.file}\`*\n\n`;
    if (r.items.length === 0) {
      md += `*No structured line items parsed by regex. OCR snippet:*\n> ${r.rawOcrSnippet || 'Empty'}\n\n`;
      continue;
    }

    md += `| Item Description | Qty | Unit Price | Total | Catalog Match / SKU | Status |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const it of r.items) {
      const matchLabel = it.catalogSku ? `${it.catalogMatch} (\`${it.catalogSku}\`)` : '—';
      const statusLabel = it.isNewProduct ? '🆕 New Item to Create' : `✅ Matched (${it.matchScore}%)`;
      md += `| ${it.name} | ${it.quantity} | ${it.unitPrice || '—'} | ${it.total} | ${matchLabel} | ${statusLabel} |\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(OUTPUT_MD, md);
  console.log(`Dry-run complete. Report written to ${OUTPUT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
