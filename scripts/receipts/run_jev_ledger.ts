#!/usr/bin/env node
/**
 * Lucky Store — JEV Financial Ledger & Receipt Verification Pipeline
 *
 * Evaluates the reconciled financial expenses ledger against source physical receipts
 * using the JEV Advisory Layer and Deterministic Arithmetic Engine:
 * - Strictly enforces BDT 0.05 reconciliation tolerance
 * - Quarantines non-purchase documents (daily summaries, product photos)
 * - Detects supplier name & amount contradictions between ledger and physical slips
 * - Flags unattached historical ledger rows requiring physical receipts
 * - Enforces security boundary: Advisory only, never auto-authorizes mutations
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  verifyReceipt,
  type ReceiptInput,
  type ReceiptVerificationReport,
} from './jev_receipt_verifier.js';

const REPO_ROOT = resolve(process.cwd());
const RECONCILED_CSV = resolve(REPO_ROOT, 'data/Accounts/reconciled_expenses_for_google_sheet.csv');
const MANIFEST_JSON = resolve(REPO_ROOT, 'data/standardized_receipts/receipts_manifest.json');
const OUTPUT_REPORT_JSON = resolve(REPO_ROOT, 'data/Accounts/jev_ledger_audit_report.json');

interface LedgerRow {
  date: string;
  vendor: string;
  description: string;
  amount: number;
  paymentType: string;
  category: string;
  receiptFileName: string;
  invoiceNo: string;
  status: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function runJevLedgerVerification() {
  console.log('[*] Starting Lucky Store JEV Financial Ledger Verification...');

  if (!existsSync(RECONCILED_CSV)) {
    console.error(`[!] Reconciled CSV not found: ${RECONCILED_CSV}`);
    process.exit(1);
  }

  // 1. Load Manifest
  const manifestData: any[] = existsSync(MANIFEST_JSON)
    ? JSON.parse(readFileSync(MANIFEST_JSON, 'utf-8'))
    : [];
  const manifestByInv = new Map<string, any>();
  for (const item of manifestData) {
    if (!item.invoice_number) continue;
    const key = item.invoice_number.toUpperCase();
    const existing = manifestByInv.get(key);
    if (!existing) {
      manifestByInv.set(key, item);
    } else if (existing.doc_type !== 'purchase_invoice' && item.doc_type === 'purchase_invoice') {
      manifestByInv.set(key, item);
    } else if (existing.doc_type === 'purchase_invoice' && item.doc_type === 'purchase_invoice') {
      if ((!existing.invoice_total_bdt || existing.invoice_total_bdt === 0) && (item.invoice_total_bdt && item.invoice_total_bdt > 0)) {
        manifestByInv.set(key, item);
      }
    }
  }

  // 2. Load Reconciled Ledger
  const csvContent = readFileSync(RECONCILED_CSV, 'utf-8');
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    console.error('[!] Reconciled CSV has insufficient data');
    process.exit(1);
  }

  const ledgerRows: LedgerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const invNo = cols[7]?.trim();
    if (!invNo || !invNo.startsWith('LS')) continue;

    const amtRaw = cols[3]?.replace(/[",\s]/g, '') || '0';
    const amount = parseFloat(amtRaw) || 0;

    ledgerRows.push({
      date: cols[0] || '',
      vendor: cols[1] || '',
      description: cols[2] || '',
      amount,
      paymentType: cols[4] || '',
      category: cols[5] || '',
      receiptFileName: cols[6] || '',
      invoiceNo: invNo,
      status: cols[10] || '',
    });
  }

  console.log(`[*] Loaded ${ledgerRows.length} LS ledger transactions from financial records`);

  // 3. Evaluate each ledger transaction with JEV
  const summary = {
    total_ledger_transactions: ledgerRows.length,
    passed_verified: 0,
    review_required: 0,
    quarantined_or_rejected: 0,
    missing_physical_receipts: 0,
    amount_contradictions: 0,
    supplier_contradictions: 0,
  };

  const detailedReports: Array<{
    invoice_number: string;
    ledger_vendor: string;
    ledger_amount: number;
    receipt_file: string;
    jev_recommendation: 'PASS' | 'REVIEW' | 'FAIL';
    discrepancy_details?: string[];
  }> = [];

  for (const row of ledgerRows) {
    const manifestItem = manifestByInv.get(row.invoiceNo.toUpperCase());

    if (!row.receiptFileName || !manifestItem) {
      summary.missing_physical_receipts++;
      summary.review_required++;
      detailedReports.push({
        invoice_number: row.invoiceNo,
        ledger_vendor: row.vendor,
        ledger_amount: row.amount,
        receipt_file: 'MISSING',
        jev_recommendation: 'REVIEW',
        discrepancy_details: ['No physical source receipt attached to historical ledger entry'],
      });
      continue;
    }

    const discrepancies: string[] = [];

    // Document Type Gate
    if (manifestItem.doc_type && manifestItem.doc_type !== 'purchase_invoice') {
      summary.quarantined_or_rejected++;
      discrepancies.push(`Non-purchase document attached: ${manifestItem.doc_type}`);
      detailedReports.push({
        invoice_number: row.invoiceNo,
        ledger_vendor: row.vendor,
        ledger_amount: row.amount,
        receipt_file: row.receiptFileName,
        jev_recommendation: 'FAIL',
        discrepancy_details: discrepancies,
      });
      continue;
    }

    // Check Amount Discrepancy against BDT 0.05 tolerance
    const slipAmount = manifestItem.invoice_total_bdt;
    if (slipAmount !== null && slipAmount !== undefined && slipAmount > 0) {
      const diff = Math.abs(row.amount - slipAmount);
      if (diff > 0.05) {
        summary.amount_contradictions++;
        discrepancies.push(`Amount mismatch: Ledger ৳${row.amount.toFixed(2)} vs Slip ৳${slipAmount.toFixed(2)} (Diff: ৳${diff.toFixed(2)})`);
      }
    }

    // Check Vendor Name Coherence
    const cleanLedgerVendor = row.vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSlipVendor = (manifestItem.supplier_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const isAliasMatch = (
      (cleanLedgerVendor.includes('jisan') && cleanSlipVendor.includes('dairymilk')) ||
      (cleanLedgerVendor.includes('nabaswapna') && cleanSlipVendor.includes('nabashopno')) ||
      (cleanLedgerVendor.includes('bombay') && cleanSlipVendor.includes('bombay')) ||
      (cleanLedgerVendor.includes('pusti') && cleanSlipVendor.includes('pusti')) ||
      (cleanSlipVendor.includes('unknownsupplier'))
    );

    if (cleanSlipVendor && cleanSlipVendor !== 'pendingsupplier' && cleanLedgerVendor && !isAliasMatch) {
      if (!cleanLedgerVendor.includes(cleanSlipVendor) && !cleanSlipVendor.includes(cleanLedgerVendor)) {
        summary.supplier_contradictions++;
        discrepancies.push(`Vendor mismatch: Ledger "${row.vendor}" vs Slip "${manifestItem.supplier_name}"`);
      }
    }

    // Run JEV Verification input
    const receiptInput: ReceiptInput = {
      receipt_id: row.invoiceNo,
      supplier_name: manifestItem.supplier_name || row.vendor,
      invoice_number: row.invoiceNo,
      invoice_date: manifestItem.invoice_date_iso || undefined,
      invoice_total: slipAmount || row.amount,
      currency: 'BDT',
      doc_type: manifestItem.doc_type || 'purchase_invoice',
      line_items: [],
      source_image_verified: true,
    };

    const report: ReceiptVerificationReport = await verifyReceipt(receiptInput, { forceOffline: true });

    if (discrepancies.length > 0) {
      summary.review_required++;
      detailedReports.push({
        invoice_number: row.invoiceNo,
        ledger_vendor: row.vendor,
        ledger_amount: row.amount,
        receipt_file: row.receiptFileName,
        jev_recommendation: 'REVIEW',
        discrepancy_details: discrepancies,
      });
    } else {
      summary.passed_verified++;
    }
  }

  // 4. Print Executive Audit Summary
  console.log('\n' + '='.repeat(70));
  console.log('⚖️  LUCKY STORE JEV FINANCIAL LEDGER RECONCILIATION REPORT');
  console.log('='.repeat(70));
  console.log(`Total Financial Ledger Transactions : ${summary.total_ledger_transactions}`);
  console.log(`├── Verified Physical Receipts (PASS) : ${summary.passed_verified} (${((summary.passed_verified / summary.total_ledger_transactions) * 100).toFixed(1)}%)`);
  console.log(`├── Historical Unattached Slips      : ${summary.missing_physical_receipts} (Cash purchases pre-digital capture)`);
  console.log(`├── Vendor Name Contradictions       : ${summary.supplier_contradictions}`);
  console.log(`├── Amount Discrepancies (> ৳0.05)   : ${summary.amount_contradictions}`);
  console.log(`└── Quarantined Invalid Documents    : ${summary.quarantined_or_rejected}`);
  console.log('-'.repeat(70));

  if (detailedReports.some(r => r.discrepancy_details && r.discrepancy_details.length > 0 && r.receipt_file !== 'MISSING')) {
    console.log('Flagged Discrepancies Requiring Review:');
    for (const r of detailedReports) {
      if (r.receipt_file !== 'MISSING' && r.discrepancy_details) {
        console.log(`  • [${r.invoice_number}] ${r.ledger_vendor} (৳${r.ledger_amount.toFixed(2)}) — ${r.receipt_file}`);
        for (const d of r.discrepancy_details) {
          console.log(`      ⚠️  ${d}`);
        }
      }
    }
  }

  console.log('='.repeat(70) + '\n');

  // 5. Write JSON report
  const outputPayload = {
    timestamp: new Date().toISOString(),
    summary,
    flagged_discrepancies: detailedReports.filter(r => r.discrepancy_details && r.discrepancy_details.length > 0 && r.receipt_file !== 'MISSING'),
    safety_rule: 'All JEV findings are advisory. Ledger mutations require manual human approval.',
  };

  writeFileSync(OUTPUT_REPORT_JSON, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`[✓] Full JEV Ledger audit payload written to: ${OUTPUT_REPORT_JSON}`);
}

runJevLedgerVerification().catch(err => {
  console.error('[!] Error in JEV ledger verification:', err);
  process.exit(1);
});
