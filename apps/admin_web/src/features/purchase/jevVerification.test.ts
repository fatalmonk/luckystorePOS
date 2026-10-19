import { describe, expect, it } from 'vitest';
import { performClientDeterministicReconciliation } from './jevVerification';
import type { ReceiptOcrResult } from './receiptOcr';

describe('client-side JEV deterministic reconciliation', () => {
  it('passes matched invoice with valid line items and raw text', () => {
    const ocr: ReceiptOcrResult = {
      supplier: { id: 'sup-1', name: 'Pran Foods' },
      invoiceNumber: 'INV-100',
      invoiceDate: '2026-10-18',
      invoiceTotal: 1000,
      items: [
        { name: 'Pran Juice', quantity: 10, unitPrice: 100, total: 1000 },
      ],
      rawText: 'Pran Foods Invoice INV-100 Pran Juice 10 x 100 = 1000',
    };

    const res = performClientDeterministicReconciliation(ocr);
    expect(res.recommendation).toBe('PASS');
    expect(res.totalsMatch).toBe(true);
    expect(res.difference).toBe(0);
  });

  it('recommends REVIEW if raw text or source image is missing/unverified', () => {
    const ocr: ReceiptOcrResult = {
      supplier: { id: 'sup-1', name: 'Pran Foods' },
      invoiceNumber: 'INV-100',
      invoiceDate: '2026-10-18',
      invoiceTotal: 1000,
      items: [
        { name: 'Pran Juice', quantity: 10, unitPrice: 100, total: 1000 },
      ],
      rawText: undefined,
    };

    const res = performClientDeterministicReconciliation(ocr);
    expect(res.recommendation).toBe('REVIEW');
    expect(res.sourceImageVerified).toBe(false);
  });

  it('fails if line items sum differs from invoice total by > BDT 0.05', () => {
    const ocr: ReceiptOcrResult = {
      supplier: { id: 'sup-1', name: 'Square Consumer' },
      invoiceNumber: 'INV-200',
      invoiceTotal: 1000,
      items: [
        { name: 'Radhuni Spices', quantity: 5, unitPrice: 100, total: 500 },
      ],
      rawText: 'Some raw text',
    };

    const res = performClientDeterministicReconciliation(ocr);
    expect(res.recommendation).toBe('FAIL');
    expect(res.totalsMatch).toBe(false);
    expect(res.difference).toBe(500);
  });

  it('fails if an item has invalid line arithmetic', () => {
    const ocr: ReceiptOcrResult = {
      supplier: { id: 'sup-1', name: 'Akij Foods' },
      invoiceNumber: 'INV-300',
      invoiceTotal: 600,
      items: [
        // 5 * 100 = 500, but claims 600
        { name: 'Mojo', quantity: 5, unitPrice: 100, total: 600 },
      ],
      rawText: 'Some raw text',
    };

    const res = performClientDeterministicReconciliation(ocr);
    expect(res.recommendation).toBe('FAIL');
    expect(res.contradictions.length).toBeGreaterThan(0);
  });
});
