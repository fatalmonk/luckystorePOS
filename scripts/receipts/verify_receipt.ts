#!/usr/bin/env node
/**
 * CLI Runner for Lucky Store JEV Receipt Verification
 *
 * Usage:
 *   npx tsx scripts/receipts/verify_receipt.ts <path-to-receipt.json>
 *   npx tsx scripts/receipts/verify_receipt.ts --json <path-to-receipt.json>
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  verifyReceipt,
  formatReportHumanReadable,
  type ReceiptInput,
} from './jev_receipt_verifier.js';

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const filePathArg = args.find(a => !a.startsWith('--'));

  if (!filePathArg) {
    console.error('Usage: npx tsx scripts/receipts/verify_receipt.ts [--json] <path-to-receipt.json>');
    process.exit(1);
  }

  const resolvedPath = resolve(process.cwd(), filePathArg);
  if (!existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const rawContent = readFileSync(resolvedPath, 'utf-8');
    const receiptData = JSON.parse(rawContent) as ReceiptInput;

    const report = await verifyReceipt(receiptData);

    if (jsonMode) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReportHumanReadable(report));
    }

    // Exit code 0 if PASS or REVIEW (advisory review allowed), 2 if FAIL
    if (report.advisory_recommendation === 'FAIL') {
      process.exit(2);
    }
  } catch (err: any) {
    console.error(`Error verifying receipt: ${err?.message || err}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
