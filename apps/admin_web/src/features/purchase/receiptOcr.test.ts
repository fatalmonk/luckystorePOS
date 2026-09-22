import { describe, expect, it } from 'vitest';
import { parseReceiptFilename } from './receiptOcr';

describe('parseReceiptFilename', () => {
  const suppliers = [{ id: 'supplier-1', name: 'Savoy Distributors' }];

  it('extracts invoice, date, supplier, and total from the supported filename format', () => {
    expect(parseReceiptFilename('LS69-16-04-26-Savoy Distributors-9534BDT.jpg', suppliers)).toEqual({
      invoiceNumber: 'LS69',
      invoiceDate: '2026-04-16',
      supplier: suppliers[0],
      invoiceTotal: '9534',
    });
  });

  it('decodes URI-encoded names and matches a known supplier case-insensitively', () => {
    const result = parseReceiptFilename('INV_2026.04.16_Savoy%20Distributors_1200tk.png', suppliers);

    expect(result.invoiceNumber).toBe('INV');
    expect(result.invoiceDate).toBe('2026-04-16');
    expect(result.supplier).toEqual(suppliers[0]);
    expect(result.invoiceTotal).toBe('1200');
  });

  it('returns nulls when no supported metadata can be identified', () => {
    expect(parseReceiptFilename('receipt-photo.png', suppliers)).toEqual({
      invoiceNumber: null,
      invoiceDate: null,
      supplier: null,
      invoiceTotal: null,
    });
  });

  it('falls back safely for malformed percent escapes and generic image names', () => {
    expect(parseReceiptFilename('receipt-100%.png', suppliers)).toEqual({
      invoiceNumber: null,
      invoiceDate: null,
      supplier: null,
      invoiceTotal: null,
    });
    expect(parseReceiptFilename('image.png', suppliers)).toEqual({
      invoiceNumber: null,
      invoiceDate: null,
      supplier: null,
      invoiceTotal: null,
    });
  });
});
