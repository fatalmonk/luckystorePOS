import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';

const month = process.argv[2] || '2026-08';
const monthNum = month.split('-')[1];
const yearNum = month.split('-')[0];

const REPO_ROOT = path.resolve('.');
const ITEMS_CSV = path.join(REPO_ROOT, 'data/items_rows.csv');
const EXPENSES_CSV = path.join(REPO_ROOT, 'data/Accounts/Lucky Store - Accounts & Financial Records - Expenses.csv');
const OCR_JSONL = path.join(REPO_ROOT, '.codex-audits', month, 'ocr-triage.jsonl');
const OUTPUT_MD = `/Users/mac.alvi/.gemini/antigravity-ide/brain/b0650cae-a7f9-4ae4-83ec-bceb8ddd35dd/${month}_products_and_cost_prices.md`;
const OUTPUT_CSV = path.join(REPO_ROOT, '.codex-audits', month, 'identified-products-costs.csv');

// 1. Load Catalog
let catalog = [];
if (fs.existsSync(ITEMS_CSV)) {
  catalog = Papa.parse(fs.readFileSync(ITEMS_CSV, 'utf8'), { header: true }).data.filter(r => r.name);
}

// 2. Load Target Month Stock Purchases
const expensesRaw = Papa.parse(fs.readFileSync(EXPENSES_CSV, 'utf8'), { header: true }).data.filter(r => r.Date);
const stockPurchases = [];

expensesRaw.forEach((r, idx) => {
  const p = r.Date.split('/');
  if (p.length === 3 && p[1] === monthNum && p[2] === yearNum) {
    if (r['Expense Category'] === 'Stock Purchase') {
      stockPurchases.push({
        ...r,
        _sheetRow: idx + 2,
        _amt: parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0,
        _isoDate: `${yearNum}-${monthNum}-${p[0].padStart(2, '0')}`,
      });
    }
  }
});

function matchCatalog(name) {
  const norm = name.trim().toLowerCase();
  if (!norm) return null;

  let best = null;
  let bestScore = 0;

  for (const item of catalog) {
    const cNorm = (item.name || '').trim().toLowerCase();
    if (cNorm === norm) return { item, score: 1.0 };

    const t1 = new Set(norm.split(/[\s_/-]+/).filter(x => x.length >= 2));
    const t2 = new Set(cNorm.split(/[\s_/-]+/).filter(x => x.length >= 2));
    if (t1.size === 0 || t2.size === 0) continue;

    let inter = 0;
    t1.forEach(t => { if (t2.has(t)) inter++; });
    const union = new Set([...t1, ...t2]).size;
    let score = inter / union;

    if (cNorm.includes(norm) || norm.includes(cNorm)) {
      score = Math.max(score, 0.65);
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (bestScore >= 0.5) {
    return { item: best, score: bestScore };
  }
  return null;
}

// Helper 1: Stricter OCR Name Sanitization
function isValidOcrProductName(str) {
  if (!str || typeof str !== 'string') return false;
  // strip surrounding quotes, punctuation, brackets, dashes
  let s = str.trim().replace(/^[\"'(\[\{%—=\-_:\s]+|[\"')\]\}%—=\-_:\s]+$/g, '');
  if (s.length < 4) return false;

  // At least 4 alphabetic characters (Latin or Bengali)
  const alphaMatches = s.match(/[a-zA-Z\u0980-\u09FF]/g) || [];
  if (alphaMatches.length < 4) return false;

  // Reject em-dash sequences, equal signs, or repeated dashes
  if (/[—=]/.test(str) || /--/.test(str)) return false;

  // Reject if contains symbols: brackets, curly braces, pipes, slashes, percent, equal, em-dash, tilde, at, hash
  if (/[\[\]{}|\\\/%=—~*@#$^]/.test(s)) return false;

  // Reject consecutive punctuation or symbols like "..", "--", "::"
  if (/[^a-zA-Z0-9\u0980-\u09FF\s]{2,}/.test(s)) return false;

  // No more than 20% punctuation/symbols
  const punctMatches = s.match(/[^a-zA-Z0-9\u0980-\u09FF\s]/g) || [];
  if (punctMatches.length / s.length > 0.20) return false;

  // Reject tokens matching isolated single letters like "a b c"
  if (/^([a-zA-Z]\s+){2,}/i.test(s) || /(\s+[a-zA-Z]\b){2,}/i.test(s)) return false;

  // Reject if short words (<=2 chars) form >= 50% of all words
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const tinyWords = words.filter(w => w.length <= 2);
    if (tinyWords.length / words.length >= 0.5) return false;
  }

  // Reject administrative / invoice header tokens
  if (/^(invoice|bill|memo|receipt|sl|no|date|time|qty|rate|amount|disc|vat|subtotal|total|taka|bdt|category|product|unit)$/i.test(s)) return false;

  return true;
}

// Helper 2: Mathematical Validation Gate & Permutations
function resolveTableMath(nums) {
  if (!nums || nums.length < 2) return null;

  // If 2 numbers: [qty, total] or [rate, total]
  if (nums.length === 2) {
    const [n1, n2] = nums;
    if (n1 > 0 && n2 >= n1) {
      const qty = (n1 <= 100 && Number.isInteger(n1)) ? n1 : 1;
      const unitCost = qty > 1 ? n2 / qty : n1;
      return { qty, unitCost: parseFloat(unitCost.toFixed(2)), lineTotal: n2 };
    }
    return null;
  }

  // 3 or more numbers: try permutations to satisfy |qty * unitCost - lineTotal| <= 2.0 BDT
  const last = nums[nums.length - 1];

  for (let i = 0; i < nums.length - 1; i++) {
    for (let j = 0; j < nums.length - 1; j++) {
      if (i === j) continue;
      const nA = nums[i];
      const nB = nums[j];
      if (Math.abs(nA * nB - last) <= 2.0 && nA > 0 && nB > 0) {
        const qty = (Number.isInteger(nA) || nA < nB) ? nA : nB;
        const unitCost = qty === nA ? nB : nA;
        return { qty, unitCost: parseFloat(unitCost.toFixed(2)), lineTotal: last };
      }
    }
  }

  // Check discount column: (qty * rate) - discount ≈ lineTotal
  if (nums.length >= 4) {
    for (let i = 0; i < nums.length - 2; i++) {
      for (let j = 0; j < nums.length - 2; j++) {
        if (i === j) continue;
        const nA = nums[i];
        const nB = nums[j];
        for (let k = 0; k < nums.length - 1; k++) {
          if (k === i || k === j) continue;
          const disc = nums[k];
          if (Math.abs((nA * nB - disc) - last) <= 2.0 && nA > 0 && nB > 0) {
            const qty = (Number.isInteger(nA) || nA < nB) ? nA : nB;
            const unitCost = qty === nA ? nB : nA;
            return { qty, unitCost: parseFloat(unitCost.toFixed(2)), lineTotal: last };
          }
        }
      }
    }
  }

  return null;
}

const identifiedProducts = [];

stockPurchases.forEach(sp => {
  const desc = (sp['Item description'] || '').trim();
  const vendor = (sp['Vendor'] || 'Unknown').trim();
  const inv = sp['Invoice No.'];
  const total = sp._amt;
  const date = sp.Date;

  // Helper 3: Ledger Context Enrichment
  // If rawName matches shorthand measurements (/^[0-9]+(L|kg|pc|p)$/i), synthesize product name as ${vendor} ${rawName} before catalog matching
  const isShorthandMeasurement = /^[0-9]+(?:\.[0-9]+)?\s*(l|ltr|litre|kg|pc|pcs|p|gm)\b/i.test(desc);

  const mBulk = desc.match(/^(\d+(?:\.\d+)?)\s*(p|pc|pcs|l|ltr|litre|kg|ton)\b/i) || 
                desc.match(/\b(\d+(?:\.\d+)?)\s*(p|pc|pcs|l|ltr|litre|kg|ton)\b/i);

  if (mBulk) {
    const qty = parseFloat(mBulk[1]);
    const unit = mBulk[2].toUpperCase();
    let unitCost = total / qty;
    let remainder = desc.replace(mBulk[0], '').replace(/^[-,\s]+|[-,\s]+$/g, '');
    let productName = '';
    if (isShorthandMeasurement || !remainder || remainder.length < 2) {
      productName = `${vendor} ${desc}`;
    } else {
      productName = `${vendor} - ${remainder}`;
    }

    const catMatch = matchCatalog(productName) || matchCatalog(`${vendor} ${desc}`) || matchCatalog(vendor);

    identifiedProducts.push({
      source: 'Ledger Description',
      invoice: inv,
      date,
      vendor,
      rawName: desc,
      productName,
      quantity: qty,
      unit,
      unitCost: parseFloat(unitCost.toFixed(2)),
      lineTotal: total,
      matchedCatalog: catMatch ? catMatch.item.name : null,
      catalogSku: catMatch ? catMatch.item.sku : null,
      catalogCost: catMatch ? parseFloat(catMatch.item.cost) : null,
      catalogPrice: catMatch ? parseFloat(catMatch.item.price) : null,
      confidence: 'high',
      notes: `Direct calculation: ${total} BDT / ${qty} ${unit}`,
    });
  } else if (desc && desc.length > 2 && !desc.toLowerCase().includes('and others') && !desc.toLowerCase().includes('misc')) {
    const productName = isShorthandMeasurement ? `${vendor} ${desc}` : `${vendor} - ${desc}`;
    const catMatch = matchCatalog(productName) || matchCatalog(desc) || matchCatalog(`${vendor} ${desc}`);
    identifiedProducts.push({
      source: 'Ledger Description',
      invoice: inv,
      date,
      vendor,
      rawName: desc,
      productName,
      quantity: 1,
      unit: 'LOT/UNIT',
      unitCost: total,
      lineTotal: total,
      matchedCatalog: catMatch ? catMatch.item.name : null,
      catalogSku: catMatch ? catMatch.item.sku : null,
      catalogCost: catMatch ? parseFloat(catMatch.item.cost) : null,
      catalogPrice: catMatch ? parseFloat(catMatch.item.price) : null,
      confidence: 'medium',
      notes: `Category purchase: ${desc}`,
    });
  }
});

// Process OCR Triage Stream with Strict Sanitization & Math Gate
if (fs.existsSync(OCR_JSONL)) {
  const ocrLines = fs.readFileSync(OCR_JSONL, 'utf8').split('\n').filter(Boolean);
  
  ocrLines.forEach(l => {
    try {
      const rec = JSON.parse(l);
      const text = rec.text || rec.extracted_text || '';
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

      lines.forEach(line => {
        if (/total|subtotal|vat|cash|memo|date|buyer|signature|phone|tel|luckystore|lucky store/i.test(line)) return;

        let rawName = null, qty = 0, unitPrice = 0, lineTotal = 0;

        // 1. Pipe-delimited table line (e.g. New Zealand Dairy, Polar, Smart Corp)
        if (line.includes('|')) {
          const parts = line.split('|').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const namePart = parts.find(p => isValidOcrProductName(p));
            const nums = parts.map(p => parseFloat(p.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n) && n > 0 && n < 50000);
            if (namePart && nums.length >= 2) {
              const mathResolved = resolveTableMath(nums);
              if (mathResolved) {
                rawName = namePart;
                qty = mathResolved.qty;
                unitPrice = mathResolved.unitCost;
                lineTotal = mathResolved.lineTotal;
              }
            }
          }
        }

        // 2. Standard space/tab delimited pattern
        if (!rawName) {
          const match = line.match(/^([0-9]{1,4}[.\s-])?\s*([a-zA-Z\u0980-\u09FF\s.'()/ -]+?)\s+([0-9]{1,4})\s+([0-9]{1,5}(?:\.[0-9]{1,2})?)(?:\s+([0-9]{1,6}(?:\.[0-9]{1,2})?))?/);
          if (match) {
            const candName = match[2].trim().replace(/^[.\s-]+|[.\s-]+$/g, '');
            if (isValidOcrProductName(candName)) {
              const q = parseInt(match[3], 10);
              const u = parseFloat(match[4]);
              const t = match[5] ? parseFloat(match[5]) : q * u;
              if (Math.abs(q * u - t) <= 2.0 && u > 0 && u < 10000) {
                rawName = candName;
                qty = q;
                unitPrice = u;
                lineTotal = t;
              }
            }
          }
        }

        if (rawName && isValidOcrProductName(rawName) && unitPrice > 0 && unitPrice < 10000 && Math.abs(qty * unitPrice - lineTotal) <= 2.0) {
          const catMatch = matchCatalog(rawName);
          identifiedProducts.push({
            source: `Receipt OCR (${rec.filename})`,
            invoice: 'OCR-Scan',
            date: rec.filename.match(/2026-\d{2}-\d{2}/) ? rec.filename.match(/2026-\d{2}-\d{2}/)[0] : month,
            vendor: 'Scanned Receipt',
            rawName,
            productName: rawName,
            quantity: qty || 1,
            unit: 'PC',
            unitCost: unitPrice,
            lineTotal: lineTotal || unitPrice,
            matchedCatalog: catMatch ? catMatch.item.name : null,
            catalogSku: catMatch ? catMatch.item.sku : null,
            catalogCost: catMatch ? parseFloat(catMatch.item.cost) : null,
            catalogPrice: catMatch ? parseFloat(catMatch.item.price) : null,
            confidence: catMatch ? 'high' : 'medium',
            notes: `Extracted from ${rec.filename}`,
          });
        }
      });
    } catch {}
  });
}

const reportLines = [];
reportLines.push(`# Lucky Store — ${month} Products & Cost Prices Identification`);
reportLines.push('');
reportLines.push('**Extraction Date:** 2026-10-12  ');
reportLines.push(`**Catalog Source:** \`data/items_rows.csv\` (${catalog.length} products)  `);
reportLines.push(`**Ledger Stock Purchases:** ${stockPurchases.length} invoices  `);
reportLines.push(`**Receipt Scans Triaged:** ${fs.existsSync(OCR_JSONL) ? fs.readFileSync(OCR_JSONL, 'utf8').split('\n').filter(Boolean).length : 0} files  `);
reportLines.push('');
reportLines.push('## 1. Summary of Identified Products');
reportLines.push('');
reportLines.push(`- **Total Product Lines Identified:** ${identifiedProducts.length} items`);
const catalogMatchedCount = identifiedProducts.filter(p => p.matchedCatalog).length;
reportLines.push(`- **Catalog Matched Products:** ${catalogMatchedCount} items`);
reportLines.push(`- **New/Uncataloged Candidates:** ${identifiedProducts.length - catalogMatchedCount} items`);
reportLines.push('');

reportLines.push('## 2. Identified Products & Unit Cost Prices (Sample Top 40)');
reportLines.push('');
reportLines.push('| Invoice / Source | Date | Supplier | Product / Line Item | Qty | Unit Cost (BDT) | Catalog Cost | Retail Price | Status |');
reportLines.push('|---|---|---|---|---|---|---|---|---|');

identifiedProducts.slice(0, 40).forEach(p => {
  const catCostFmt = p.catalogCost ? `${p.catalogCost.toFixed(2)} BDT` : '—';
  const catPriceFmt = p.catalogPrice ? `${p.catalogPrice.toFixed(2)} BDT` : '—';
  const status = p.matchedCatalog ? `Matched (\`${p.catalogSku}\`)` : 'New Candidate';
  reportLines.push(`| **${p.invoice}** | ${p.date} | ${p.vendor} | **${p.productName}** | ${p.quantity} ${p.unit} | **${p.unitCost.toFixed(2)} BDT** | ${catCostFmt} | ${catPriceFmt} | ${status} |`);
});
reportLines.push('');

fs.writeFileSync(OUTPUT_MD, reportLines.join('\n'), 'utf8');
console.log(`Saved report to ${OUTPUT_MD}`);

const csvData = Papa.unparse(identifiedProducts);
fs.writeFileSync(OUTPUT_CSV, csvData, 'utf8');
console.log(`Saved structured CSV to ${OUTPUT_CSV}`);
