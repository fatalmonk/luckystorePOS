/**
 * Lucky Store JEV Receipt Verification Test Suite
 *
 * Covers:
 * 1. Positive tests (synthetic sample receipt TEST-001, fully verified receipts)
 * 2. Deterministic arithmetic (quantity * unit_price, BDT 0.05 tolerance bounds)
 * 3. Negative tests (math mismatches, invalid quantities, negative prices, missing fields)
 * 4. Adversarial tests (AI hallucinated items, supplier mismatches, non-BDT currency)
 * 5. Duplicate invoice detection
 * 6. Tenant isolation and posting boundary protection
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  verifyReceipt,
  executeDeterministicReconciliation,
  preventUnauthorizedPosting,
  SecurityAuthorizationViolationError,
  type ReceiptInput,
} from '../../scripts/receipts/jev_receipt_verifier.js';

describe('Lucky Store JEV Receipt Verification Suite', () => {
  const sampleReceiptPath = resolve(__dirname, 'sample-receipt.json');
  const sampleReceiptData = JSON.parse(readFileSync(sampleReceiptPath, 'utf-8')) as ReceiptInput;

  // 1. Positive Verification & Sample Receipt Baseline
  describe('Baseline Sample Receipt (TEST-001)', () => {
    it('matches exact expected results for sample-receipt.json', async () => {
      const report = await verifyReceipt(sampleReceiptData, { forceOffline: true });

      // Expected:
      // * Calculated total: ৳1,250
      // * Invoice total: ৳1,250
      // * Difference: ৳0
      // * Arithmetic reconciliation: Pass
      // * Source verification: Not completed
      // * Posting authorization: Not granted
      expect(report.calculated_total).toBe(1250.0);
      expect(report.extracted_total).toBe(1250.0);
      expect(report.reconciliation_difference).toBe(0.0);
      expect(report.deterministic.arithmetic_status).toBe('PASS');
      expect(report.source_verification_status).toBe('NOT_COMPLETED');
      expect(report.safety.posting_authorized).toBe(false);
      expect(report.safety.inventory_mutation_authorized).toBe(false);
      expect(report.safety.advisory_only).toBe(true);
      expect(report.advisory_recommendation).toBe('REVIEW');
    });

    it('recommends PASS when source image is verified and all fields match', async () => {
      const verifiedReceipt: ReceiptInput = {
        ...sampleReceiptData,
        source_image_verified: true,
      };

      const report = await verifyReceipt(verifiedReceipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('PASS');
      expect(report.source_verification_status).toBe('VERIFIED');
      expect(report.safety.posting_authorized).toBe(false); // Never granted automatically
    });
  });

  // 2. Deterministic Arithmetic & Tolerance Bounds
  describe('Deterministic Reconciliation & BDT 0.05 Tolerance', () => {
    it('accepts invoice difference within 0.05 BDT tolerance', () => {
      const receipt: ReceiptInput = {
        receipt_id: 'TOL-01',
        supplier_name: 'Pran Foods',
        invoice_number: 'INV-TOL-1',
        invoice_total: 1000.04, // 0.04 BDT diff from line item total 1000.00
        line_items: [{ name: 'Pran Juice', quantity: 10, unit_price: 100.0, line_total: 1000.0 }],
      };

      const res = executeDeterministicReconciliation(receipt);
      expect(res.totals_match).toBe(true);
      expect(res.arithmetic_status).toBe('PASS');
      expect(res.reconciliation_difference).toBe(0.04);
    });

    it('rejects invoice difference exceeding 0.05 BDT tolerance', () => {
      const receipt: ReceiptInput = {
        receipt_id: 'TOL-02',
        supplier_name: 'Pran Foods',
        invoice_number: 'INV-TOL-2',
        invoice_total: 1000.06, // 0.06 BDT diff > 0.05
        line_items: [{ name: 'Pran Juice', quantity: 10, unit_price: 100.0, line_total: 1000.0 }],
      };

      const res = executeDeterministicReconciliation(receipt);
      expect(res.totals_match).toBe(false);
      expect(res.arithmetic_status).toBe('FAIL');
      expect(res.reconciliation_difference).toBe(0.06);
    });

    it('detects line item quantity * unit_price arithmetic mismatch', () => {
      const receipt: ReceiptInput = {
        receipt_id: 'MATH-01',
        supplier_name: 'Square Consumer',
        invoice_number: 'INV-SQ-01',
        invoice_total: 500.0,
        line_items: [
          // 5 * 100 should be 500, but line_total claims 450
          { name: 'Radhuni Spices', quantity: 5, unit_price: 100.0, line_total: 450.0 },
        ],
      };

      const res = executeDeterministicReconciliation(receipt);
      expect(res.line_items_valid).toBe(false);
      expect(res.totals_match).toBe(false);
      expect(res.errors.some(e => e.includes('arithmetic mismatch'))).toBe(true);
    });

    it('rejects invalid non-positive quantities and negative prices', () => {
      const receipt: ReceiptInput = {
        receipt_id: 'INV-NEG-01',
        supplier_name: 'Akij Foods',
        invoice_number: 'INV-AK-01',
        invoice_total: 100.0,
        line_items: [
          { name: 'Mojo 500ml', quantity: -2, unit_price: 50.0 },
          { name: 'Lemu 250ml', quantity: 2, unit_price: -25.0 },
        ],
      };

      const res = executeDeterministicReconciliation(receipt);
      expect(res.line_items_valid).toBe(false);
      expect(res.totals_match).toBe(false);
      expect(res.errors.some(e => e.includes('invalid non-positive quantity'))).toBe(true);
      expect(res.errors.some(e => e.includes('invalid negative unit price'))).toBe(true);
    });
  });

  // 3. Missing Metadata & Malformed Documents
  describe('Metadata Validation & Quarantining', () => {
    it('flags missing supplier name and invoice number', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'MISSING-01',
        supplier_name: '   ',
        invoice_number: '',
        invoice_total: 500.0,
        line_items: [{ name: 'Item A', quantity: 5, unit_price: 100.0 }],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.missing_fields).toContain('supplier_name');
      expect(report.missing_fields).toContain('invoice_number');
    });

    it('flags missing line items as FAIL', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'NO-ITEMS-01',
        supplier_name: 'Supplier X',
        invoice_number: 'INV-999',
        invoice_total: 100.0,
        line_items: [],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.missing_fields).toContain('line_items');
    });

    it('rejects non-purchase documents such as delivery challans', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'CHALLAN-01',
        doc_type: 'delivery_challan',
        supplier_name: 'Unilever Bangladesh',
        invoice_number: 'CH-100',
        invoice_total: 2000.0,
        line_items: [{ name: 'Wheel Powder', quantity: 20, unit_price: 100.0 }],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.contradictions.some(c => c.includes('delivery_challan'))).toBe(true);
    });
  });

  // 4. Adversarial Scenarios & AI Hallucinations
  describe('Adversarial Detection & Source Grounding', () => {
    it('detects AI-hallucinated products missing from raw OCR text', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'HALLUC-01',
        supplier_name: 'Pran Beverages',
        invoice_number: 'INV-RAW-01',
        invoice_total: 1000.0,
        ocr_raw_text: 'PRAN BEVERAGES INVOICE INV-RAW-01\nPRAN FROOTO 250ML QTY 20 TOTAL 1000',
        line_items: [
          // Frooto is in OCR text, but iPhone Case was hallucinated by LLM
          { name: 'Pran Frooto 250ml', quantity: 10, unit_price: 50.0, line_total: 500.0 },
          { name: 'Luxury Diamond iPhone Case', quantity: 1, unit_price: 500.0, line_total: 500.0 },
        ],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.jev_evidence.grounded_in_source).toBe(false);
      expect(
        report.jev_evidence.hallucinations_detected.some(h => h.includes('Luxury Diamond iPhone Case'))
      ).toBe(true);
    });

    it('flags extracted supplier contradicting raw OCR text', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'SUPPLIER-CONTRADICT-01',
        supplier_name: 'Random Bogus Company',
        invoice_number: 'INV-1234',
        invoice_total: 300.0,
        ocr_raw_text: 'BASHUNDHARA PAPER MILLS INVOICE 1234\nTissue Box 3 pcs 300',
        line_items: [{ name: 'Tissue Box', quantity: 3, unit_price: 100.0, line_total: 300.0 }],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.contradictions.some(c => c.includes('Random Bogus Company'))).toBe(true);
    });

    it('flags non-BDT currency as contradiction', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'CURR-01',
        supplier_name: 'Global Export Ltd',
        invoice_number: 'EXP-101',
        currency: 'USD',
        invoice_total: 100.0,
        line_items: [{ name: 'Sample Item', quantity: 1, unit_price: 100.0 }],
      };

      const report = await verifyReceipt(receipt, { forceOffline: true });
      expect(report.advisory_recommendation).toBe('FAIL');
      expect(report.contradictions.some(c => c.includes('USD'))).toBe(true);
    });
  });

  // 5. Duplicate Invoices
  describe('Duplicate Invoice Risk', () => {
    it('flags potential duplicate invoice warning for known invoice numbers', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'DUP-01',
        supplier_name: 'Square Consumer',
        invoice_number: 'INV-EXISTING-99',
        invoice_total: 600.0,
        source_image_verified: true,
        line_items: [{ name: 'Radhuni Salt', quantity: 6, unit_price: 100.0 }],
      };

      const report = await verifyReceipt(receipt, {
        knownInvoicesForSupplier: ['INV-EXISTING-99', 'INV-OLD-01'],
        forceOffline: true,
      });

      expect(report.advisory_recommendation).toBe('REVIEW');
      expect(report.jev_evidence.duplicate_invoice_risk).toBe(true);
      expect(report.jev_evidence.field_warnings.some(w => w.includes('existing registered invoice'))).toBe(
        true
      );
    });
  });

  // 6. Tenant Isolation & Financial Boundary Security
  describe('Tenant Boundary & Anti-Posting Security Invariants', () => {
    it('strictly enforces multi-tenant boundary isolation', async () => {
      const receipt: ReceiptInput = {
        receipt_id: 'TENANT-01',
        tenant_id: 'tenant-branch-gulshan',
        supplier_name: 'Supplier A',
        invoice_number: 'INV-10',
        invoice_total: 100.0,
        line_items: [{ name: 'Item', quantity: 1, unit_price: 100.0 }],
      };

      await expect(
        verifyReceipt(receipt, {
          callerTenantId: 'tenant-branch-dhanmondi', // Cross-tenant attempt
          forceOffline: true,
        })
      ).rejects.toThrow(SecurityAuthorizationViolationError);
    });

    it('strictly prevents automated posting from advisory layer', () => {
      expect(() => {
        preventUnauthorizedPosting({ role: 'automated_agent', isAutomated: true });
      }).toThrow(SecurityAuthorizationViolationError);
    });

    it('guarantees safety invariant flags are immutable on all outputs', async () => {
      const reports = await Promise.all([
        verifyReceipt(sampleReceiptData, { forceOffline: true }),
        verifyReceipt({ ...sampleReceiptData, source_image_verified: true }, { forceOffline: true }),
        verifyReceipt({ receipt_id: 'FAIL', line_items: [] }, { forceOffline: true }),
      ]);

      for (const rep of reports) {
        expect(rep.safety.advisory_only).toBe(true);
        expect(rep.safety.posting_authorized).toBe(false);
        expect(rep.safety.inventory_mutation_authorized).toBe(false);
      }
    });
  });
});
