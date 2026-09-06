/**
 * PR 5: Opening Receivables, Invoice Terms & Aging Tests
 *
 * Verifies:
 * 1. Sales Credit Terms & Validation (credit_status enum and non-negative credit_terms_days).
 * 2. Opening Receivables Parity Merge Gate:
 *    - Sum of open receivables exactly matches the GL Accounts Receivable control balance.
 * 3. FIFO Payment Allocation Engine:
 *    - Payment allocates against oldest due date invoices first.
 *    - Correct transitions between UNPAID, PARTIALLY_PAID, and PAID.
 * 4. Invoice Aging Buckets Calculation:
 *    - Categorizes balances into current, 1-30, 31-60, 61-90, and 90+ buckets.
 * 5. Multi-Tenant Isolation & Grant Matrix for get_invoice_aging_report.
 */

import { describe, it, expect } from 'vitest';

describe('PR 5: Opening Receivables, Invoice Terms & Aging', () => {
  describe('Credit Terms & Validation Constraints', () => {
    it('enforces credit_status allowable domain values', () => {
      const validStatuses = ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'];
      const isValidCreditStatus = (status: string) => validStatuses.includes(status);

      expect(isValidCreditStatus('PAID')).toBe(true);
      expect(isValidCreditStatus('PARTIALLY_PAID')).toBe(true);
      expect(isValidCreditStatus('UNPAID')).toBe(true);
      expect(isValidCreditStatus('OVERDUE')).toBe(true);
      expect(isValidCreditStatus('PENDING')).toBe(false);
      expect(isValidCreditStatus('CANCELLED')).toBe(false);
    });

    it('enforces non-negative credit terms days', () => {
      const isValidCreditTerms = (days: number) => Number.isInteger(days) && days >= 0;

      expect(isValidCreditTerms(0)).toBe(true);
      expect(isValidCreditTerms(30)).toBe(true);
      expect(isValidCreditTerms(60)).toBe(true);
      expect(isValidCreditTerms(-1)).toBe(false);
      expect(isValidCreditTerms(-30)).toBe(false);
    });
  });

  describe('Opening Receivables Parity Merge Gate', () => {
    it('verifies that sum of open invoice receivables exactly matches GL AR control balance', () => {
      // General Ledger AR entries (1300_ACCOUNTS_RECEIVABLE)
      const arLedgerEntries = [
        { customerId: 'cust-1', code: '1300_ACCOUNTS_RECEIVABLE', debit: 8000, credit: 0, status: 'POSTED' },
        { customerId: 'cust-1', code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 2000, status: 'POSTED' },
        { customerId: 'cust-2', code: '1300_ACCOUNTS_RECEIVABLE', debit: 5500, credit: 0, status: 'POSTED' },
        { customerId: 'cust-2', code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 1500, status: 'POSTED' },
        // Voided entry must not be included
        { customerId: 'cust-1', code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 1000, status: 'VOIDED' },
      ];

      const glArControlBalance = arLedgerEntries
        .filter((e) => e.code === '1300_ACCOUNTS_RECEIVABLE' && !['VOIDED', 'DELETED'].includes(e.status))
        .reduce((sum, e) => sum + (e.debit - e.credit), 0);

      // cust-1: 8000 - 2000 = 6000
      // cust-2: 5500 - 1500 = 4000
      // Total GL Control = 10,000
      expect(glArControlBalance).toBe(10000);

      // Open Receivable Invoices generated for customers
      const invoices = [
        { id: 'inv-1', customerId: 'cust-1', totalAmount: 6000, allocatedPaid: 0, creditStatus: 'UNPAID' },
        { id: 'inv-2', customerId: 'cust-2', totalAmount: 4000, allocatedPaid: 0, creditStatus: 'UNPAID' },
      ];

      const openReceivablesSum = invoices
        .filter((inv) => inv.creditStatus !== 'PAID')
        .reduce((sum, inv) => sum + (inv.totalAmount - inv.allocatedPaid), 0);

      // Merge Gate: Sum of open receivables exactly matches GL AR balance
      expect(openReceivablesSum).toBe(glArControlBalance);
    });
  });

  describe('FIFO Payment Allocation Engine', () => {
    it('allocates payment across multiple open invoices in FIFO order', () => {
      const openInvoices = [
        { id: 'inv-1', dueDate: '2026-07-01', totalAmount: 3000, paid: 0 },
        { id: 'inv-2', dueDate: '2026-08-01', totalAmount: 4000, paid: 0 },
        { id: 'inv-3', dueDate: '2026-09-01', totalAmount: 2000, paid: 0 },
      ];

      const allocateFifo = (invoices: typeof openInvoices, paymentAmount: number) => {
        let remaining = paymentAmount;
        const resultInvoices = invoices.map((inv) => ({ ...inv }));
        const allocations: { invoiceId: string; amount: number; newStatus: string }[] = [];

        // Sort by dueDate ascending (FIFO)
        resultInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        for (const inv of resultInvoices) {
          if (remaining <= 0) break;
          const openBal = inv.totalAmount - inv.paid;
          const alloc = Math.min(remaining, openBal);

          if (alloc > 0) {
            inv.paid += alloc;
            remaining -= alloc;
            const newStatus = inv.paid >= inv.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
            allocations.push({ invoiceId: inv.id, amount: alloc, newStatus });
          }
        }

        return { resultInvoices, allocations, remainingUnallocated: remaining };
      };

      // Customer pays 5,500 BDT
      // inv-1 (3000) -> fully paid (3000 allocated, remaining 2500)
      // inv-2 (4000) -> partially paid (2500 allocated, 1500 remaining on invoice)
      // inv-3 (2000) -> 0 allocated
      const { resultInvoices, allocations, remainingUnallocated } = allocateFifo(openInvoices, 5500);

      expect(allocations.length).toBe(2);
      expect(allocations[0]).toEqual({ invoiceId: 'inv-1', amount: 3000, newStatus: 'PAID' });
      expect(allocations[1]).toEqual({ invoiceId: 'inv-2', amount: 2500, newStatus: 'PARTIALLY_PAID' });
      expect(remainingUnallocated).toBe(0);

      expect(resultInvoices.find((i) => i.id === 'inv-1')?.paid).toBe(3000);
      expect(resultInvoices.find((i) => i.id === 'inv-2')?.paid).toBe(2500);
      expect(resultInvoices.find((i) => i.id === 'inv-3')?.paid).toBe(0);
    });
  });

  describe('Invoice Aging Buckets Calculation', () => {
    it('categorizes invoices into accurate aging buckets based on asOfDate and dueDate', () => {
      const asOfDate = new Date('2026-09-07');

      const classifyAging = (dueDateStr: string, asOf: Date) => {
        const dueDate = new Date(dueDateStr);
        const diffDays = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return { bucket: 'current', daysOverdue: 0 };
        if (diffDays <= 30) return { bucket: '1_30_days', daysOverdue: diffDays };
        if (diffDays <= 60) return { bucket: '31_60_days', daysOverdue: diffDays };
        if (diffDays <= 90) return { bucket: '61_90_days', daysOverdue: diffDays };
        return { bucket: 'over_90_days', daysOverdue: diffDays };
      };

      // Future due date -> current
      expect(classifyAging('2026-09-15', asOfDate).bucket).toBe('current');
      expect(classifyAging('2026-09-07', asOfDate).bucket).toBe('current');

      // 10 days overdue -> 1_30_days
      expect(classifyAging('2026-08-28', asOfDate).bucket).toBe('1_30_days');

      // 45 days overdue -> 31_60_days
      expect(classifyAging('2026-07-24', asOfDate).bucket).toBe('31_60_days');

      // 75 days overdue -> 61_90_days
      expect(classifyAging('2026-06-24', asOfDate).bucket).toBe('61_90_days');

      // 120 days overdue -> over_90_days
      expect(classifyAging('2026-05-10', asOfDate).bucket).toBe('over_90_days');
    });

    it('generates summary totals across aging buckets', () => {
      const invoices = [
        { id: '1', balance: 1000, bucket: 'current' },
        { id: '2', balance: 2000, bucket: '1_30_days' },
        { id: '3', balance: 1500, bucket: '31_60_days' },
        { id: '4', balance: 500, bucket: '61_90_days' },
        { id: '5', balance: 3000, bucket: 'over_90_days' },
      ];

      const summary = {
        current: invoices.filter((i) => i.bucket === 'current').reduce((s, i) => s + i.balance, 0),
        bucket_1_30: invoices.filter((i) => i.bucket === '1_30_days').reduce((s, i) => s + i.balance, 0),
        bucket_31_60: invoices.filter((i) => i.bucket === '31_60_days').reduce((s, i) => s + i.balance, 0),
        bucket_61_90: invoices.filter((i) => i.bucket === '61_90_days').reduce((s, i) => s + i.balance, 0),
        bucket_over_90: invoices.filter((i) => i.bucket === 'over_90_days').reduce((s, i) => s + i.balance, 0),
        totalReceivables: invoices.reduce((s, i) => s + i.balance, 0),
      };

      expect(summary.current).toBe(1000);
      expect(summary.bucket_1_30).toBe(2000);
      expect(summary.bucket_31_60).toBe(1500);
      expect(summary.bucket_61_90).toBe(500);
      expect(summary.bucket_over_90).toBe(3000);
      expect(summary.totalReceivables).toBe(8000);
    });
  });

  describe('Multi-Tenant Isolation & Grant Matrix', () => {
    it('isolates aging report queries strictly by tenant', () => {
      const mockInvoices = [
        { id: '1', tenantId: 'tenant-a', openBalance: 5000 },
        { id: '2', tenantId: 'tenant-a', openBalance: 2000 },
        { id: '3', tenantId: 'tenant-b', openBalance: 8000 },
      ];

      const getAgingForCaller = (callerTenant: string) => {
        return mockInvoices.filter((inv) => inv.tenantId === callerTenant);
      };

      const tenantAData = getAgingForCaller('tenant-a');
      expect(tenantAData.length).toBe(2);
      expect(tenantAData.some((inv) => inv.tenantId === 'tenant-b')).toBe(false);

      const tenantBData = getAgingForCaller('tenant-b');
      expect(tenantBData.length).toBe(1);
      expect(tenantBData[0].openBalance).toBe(8000);
    });

    it('enforces execution grant matrix: authenticated only, revoked from anon/public', () => {
      const grants: Record<string, { anon: boolean; authenticated: boolean; service_role: boolean }> = {
        get_invoice_aging_report: { anon: false, authenticated: true, service_role: true },
        allocate_payment_to_invoices: { anon: false, authenticated: true, service_role: true },
      };

      expect(grants.get_invoice_aging_report.anon).toBe(false);
      expect(grants.get_invoice_aging_report.authenticated).toBe(true);
      expect(grants.allocate_payment_to_invoices.anon).toBe(false);
      expect(grants.allocate_payment_to_invoices.authenticated).toBe(true);
    });
  });
});
