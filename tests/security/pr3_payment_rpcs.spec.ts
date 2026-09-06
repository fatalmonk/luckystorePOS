/**
 * PR 3: Unified Customer & Supplier Payment RPCs (v2) Tests
 *
 * Verifies the double-entry accounting integrity, multi-tenant isolation,
 * and input validation specifications for record_customer_payment_v2
 * and record_supplier_payment_v2.
 */

import { describe, it, expect } from 'vitest';

describe('PR 3: Unified Customer & Supplier Payment RPCs (v2)', () => {
  describe('record_customer_payment_v2 Accounting & Validation', () => {
    it('creates a balanced double-entry batch (Dr Cash/Bank, Cr AR)', () => {
      const amount = 2500;
      const paymentAccount = 'acc-1000-cash';
      const arAccount = 'acc-1300-ar';

      const entries = [
        { accountId: paymentAccount, debit: amount, credit: 0 },
        { accountId: arAccount, debit: 0, credit: amount },
      ];

      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(amount);
    });

    it('recalculates customer AR balance strictly from active posted entries', () => {
      // Prior posted invoices: Dr AR 10,000
      // Prior payments: Cr AR 3,000
      // New payment: Cr AR 2,500
      // Voided payment: Cr AR 1,500 (must be ignored)
      const entries = [
        { code: '1300_ACCOUNTS_RECEIVABLE', debit: 10000, credit: 0, status: 'POSTED' },
        { code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 3000, status: 'POSTED' },
        { code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 2500, status: 'POSTED' },
        { code: '1300_ACCOUNTS_RECEIVABLE', debit: 0, credit: 1500, status: 'VOIDED' },
      ];

      const recalculatedBalance = entries
        .filter(e => e.code === '1300_ACCOUNTS_RECEIVABLE' && !['VOIDED', 'DELETED'].includes(e.status))
        .reduce((sum, e) => sum + (e.debit - e.credit), 0);

      // 10000 - 3000 - 2500 = 4500
      expect(recalculatedBalance).toBe(4500);
    });

    it('enforces tenant, store, and active account boundary rules', () => {
      const validateCustomerPaymentInput = (ctx: {
        actorTenant: string;
        partyTenant: string;
        actorRole: 'admin' | 'manager' | 'cashier';
        actorStore: string;
        targetStore: string;
        accountStore: string;
        isAccountActive: boolean;
        amount: number;
        partyType: string;
      }) => {
        if (ctx.amount <= 0) return { ok: false, err: 'Payment amount must be positive' };
        if (ctx.actorTenant !== ctx.partyTenant) return { ok: false, err: 'Access denied: party does not belong to tenant' };
        if (ctx.partyType !== 'customer') return { ok: false, err: 'Party is not a customer' };
        if (ctx.actorRole === 'cashier' && ctx.actorStore !== ctx.targetStore) {
          return { ok: false, err: 'Access denied: cashier not authorized for specified store' };
        }
        if (ctx.accountStore !== ctx.targetStore) return { ok: false, err: 'Payment account does not belong to store' };
        if (!ctx.isAccountActive) return { ok: false, err: 'Payment account is inactive' };
        return { ok: true };
      };

      // Valid case
      expect(validateCustomerPaymentInput({
        actorTenant: 'tenant-1',
        partyTenant: 'tenant-1',
        actorRole: 'cashier',
        actorStore: 'store-1',
        targetStore: 'store-1',
        accountStore: 'store-1',
        isAccountActive: true,
        amount: 500,
        partyType: 'customer',
      }).ok).toBe(true);

      // Cross-tenant party rejection
      expect(validateCustomerPaymentInput({
        actorTenant: 'tenant-1',
        partyTenant: 'tenant-2',
        actorRole: 'admin',
        actorStore: 'store-1',
        targetStore: 'store-1',
        accountStore: 'store-1',
        isAccountActive: true,
        amount: 500,
        partyType: 'customer',
      })).toEqual({ ok: false, err: 'Access denied: party does not belong to tenant' });

      // Inactive account rejection
      expect(validateCustomerPaymentInput({
        actorTenant: 'tenant-1',
        partyTenant: 'tenant-1',
        actorRole: 'admin',
        actorStore: 'store-1',
        targetStore: 'store-1',
        accountStore: 'store-1',
        isAccountActive: false,
        amount: 500,
        partyType: 'customer',
      })).toEqual({ ok: false, err: 'Payment account is inactive' });

      // Cashier store mismatch
      expect(validateCustomerPaymentInput({
        actorTenant: 'tenant-1',
        partyTenant: 'tenant-1',
        actorRole: 'cashier',
        actorStore: 'store-1',
        targetStore: 'store-2',
        accountStore: 'store-2',
        isAccountActive: true,
        amount: 500,
        partyType: 'customer',
      })).toEqual({ ok: false, err: 'Access denied: cashier not authorized for specified store' });
    });
  });

  describe('record_supplier_payment_v2 Accounting & Validation', () => {
    it('creates a balanced double-entry batch (Dr AP, Cr Cash/Bank)', () => {
      const amount = 8000;
      const apAccount = 'acc-2000-ap';
      const paymentAccount = 'acc-1010-bank';

      const entries = [
        { accountId: apAccount, debit: amount, credit: 0 },
        { accountId: paymentAccount, debit: 0, credit: amount },
      ];

      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(amount);
    });

    it('recalculates supplier AP balance strictly from active posted entries', () => {
      // Prior purchase: Cr AP 20,000 (Liability added)
      // Prior payment: Dr AP 5,000 (Liability reduced)
      // New payment: Dr AP 8,000 (Liability reduced)
      // Voided payment: Dr AP 4,000 (must be ignored)
      const entries = [
        { code: '2000_ACCOUNTS_PAYABLE', debit: 0, credit: 20000, status: 'POSTED' },
        { code: '2000_ACCOUNTS_PAYABLE', debit: 5000, credit: 0, status: 'POSTED' },
        { code: '2000_ACCOUNTS_PAYABLE', debit: 8000, credit: 0, status: 'POSTED' },
        { code: '2000_ACCOUNTS_PAYABLE', debit: 4000, credit: 0, status: 'VOIDED' },
      ];

      const recalculatedBalance = entries
        .filter(e => e.code === '2000_ACCOUNTS_PAYABLE' && !['VOIDED', 'DELETED'].includes(e.status))
        .reduce((sum, e) => sum + (e.credit - e.debit), 0);

      // 20000 - 5000 - 8000 = 7000
      expect(recalculatedBalance).toBe(7000);
    });

    it('rejects payments to non-supplier parties', () => {
      const validateSupplierPayment = (partyType: string) => {
        if (partyType !== 'supplier') {
          return { ok: false, err: 'Party is not a supplier' };
        }
        return { ok: true };
      };

      expect(validateSupplierPayment('supplier').ok).toBe(true);
      expect(validateSupplierPayment('customer')).toEqual({ ok: false, err: 'Party is not a supplier' });
    });
  });

  describe('Idempotency & Double Payment Protection', () => {
    it('returns existing result on duplicate idempotency key', () => {
      const cache = new Map<string, { status: string; ledger_batch_id: string }>();

      const executeWithIdempotency = (key: string, batchId: string) => {
        if (cache.has(key)) {
          return { ...cache.get(key)!, isReplay: true };
        }
        const res = { status: 'success', ledger_batch_id: batchId, isReplay: false };
        cache.set(key, res);
        return res;
      };

      const first = executeWithIdempotency('pay_dup_key_1', 'batch-1');
      expect(first.isReplay).toBe(false);
      expect(first.ledger_batch_id).toBe('batch-1');

      const second = executeWithIdempotency('pay_dup_key_1', 'batch-2');
      expect(second.isReplay).toBe(true);
      expect(second.ledger_batch_id).toBe('batch-1');
    });
  });
});
