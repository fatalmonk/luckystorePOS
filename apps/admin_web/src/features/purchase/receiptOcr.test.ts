import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractCandidateSpans,
  getReceiptVisionEndpoint,
  parseReceiptFilename,
  reconcileOcrItemCandidates,
  scanReceiptImage,
  scoreProductMatch,
  selectBestFieldSpan,
  validateOcrResult,
  type ReceiptOcrResult,
} from './receiptOcr';

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

  it('keeps filename supplier text unresolved when it matches multiple suppliers', () => {
    const matches = [
      { id: 'pusti-one', name: 'Pusti Distribution' },
      { id: 'pusti-two', name: 'Pusti Trading' },
    ];
    expect(parseReceiptFilename('LS749-31-08-26-Pusti-3672BDT.jpg', matches).supplier)
      .toEqual({ id: '', name: 'Pusti' });
  });

  it('correctly parses space-separated, slash-separated, hyphen-separated, and dot-separated dates', () => {
    const jawadSuppliers = [{ id: 'jawad-1', name: 'JawadTrading' }];

    // Space-separated date (Google Drive upload regression case)
    expect(parseReceiptFilename('LS578-01 08 26-JawadTrading-3462BDT.jpg', jawadSuppliers)).toEqual({
      invoiceNumber: 'LS578',
      invoiceDate: '2026-08-01',
      supplier: jawadSuppliers[0],
      invoiceTotal: '3462',
    });

    // Slash-separated date
    expect(parseReceiptFilename('LS578-01/08/26-JawadTrading-3462BDT.jpg', jawadSuppliers)).toEqual({
      invoiceNumber: 'LS578',
      invoiceDate: '2026-08-01',
      supplier: jawadSuppliers[0],
      invoiceTotal: '3462',
    });

    // Hyphen-separated date
    expect(parseReceiptFilename('LS578-01-08-26-JawadTrading-3462BDT.jpg', jawadSuppliers)).toEqual({
      invoiceNumber: 'LS578',
      invoiceDate: '2026-08-01',
      supplier: jawadSuppliers[0],
      invoiceTotal: '3462',
    });

    // Dot-separated date
    expect(parseReceiptFilename('LS578-01.08.26-JawadTrading-3462BDT.jpg', jawadSuppliers)).toEqual({
      invoiceNumber: 'LS578',
      invoiceDate: '2026-08-01',
      supplier: jawadSuppliers[0],
      invoiceTotal: '3462',
    });
  });
});

describe('extract-receipt-vision system prompt contract', () => {
  it('contains mandatory instructions for pre-printed Bengali catalog forms and line-item extraction semantics', () => {
    const edgeFunctionPath = path.resolve(__dirname, '../../../../../supabase/functions/extract-receipt-vision/index.ts');
    const sourceCode = fs.readFileSync(edgeFunctionPath, 'utf-8');

    expect(sourceCode).toContain('For pre-printed product/catalog forms (invoices with pre-printed product lists):');
    expect(sourceCode).toContain('Include a product row in items ONLY when there is credible transaction-specific evidence on that row');
    expect(sourceCode).toContain('A pre-printed product name, package specification, or other static catalog content alone MUST NOT cause the row to be returned as a purchased item');

    expect(sourceCode).toContain('"পণ্যের নাম" specifies the product name/description.');
    expect(sourceCode).toContain('"পরিমাণ" specifies the pre-printed package or product specification (map to packSize or unit as appropriate); NEVER map "পরিমাণ" to purchased quantity on this form.');
    expect(sourceCode).toContain('"সংখ্যা" specifies the purchased quantity (quantity).');
    expect(sourceCode).toContain('"দর" specifies the unit price/rate (unitPrice).');
    expect(sourceCode).toContain('"টাকা" specifies the line total (total).');
    expect(sourceCode).toContain('Map "Order Qty" / "Order Quantity" to purchased quantity');
    expect(sourceCode).toContain('Numbers embedded in the printed product description or pack specification');
    expect(sourceCode).toContain('Preserve signs in transaction cells. A negative rate or amount');

    expect(sourceCode).toContain('Exclude clearly crossed-out, struck-through, voided, or cancelled transaction entries.');
    expect(sourceCode).toContain('Do not invent missing transaction values.');
    expect(sourceCode).toContain('For ordinary receipts (non-catalog receipts without a pre-printed product list), associate printed or handwritten quantity, unit price, and total with their respective product lines as normal.');

    // JSON Schema property descriptions and qualification checks
    expect(sourceCode).toContain('"isPurchased"');
    expect(sourceCode).toContain('NEVER use printed pack specification \'পরিমাণ\' or any numeric package value as quantity');
    expect(sourceCode).toContain('a matching multiplication is not evidence the amount was read');
    expect(sourceCode).toContain('return null unless a clearly labeled transaction-specific grand total is visibly present');
    expect(sourceCode).not.toContain('Catalog extraction reconciliation mismatch');
    expect(sourceCode).toContain('item.isPurchased === false');

    // Two-stage detection contract
    expect(sourceCode).toContain('catalog_row_detection');
    expect(sourceCode).toContain('catalog_order_form');
    expect(sourceCode).toContain('hasHandwrittenQuantity');
    expect(sourceCode).toContain('hasHandwrittenAmount');
  });

  it('correctly filters static catalog rows while preserving purchased items and ordinary receipt items', () => {
    const mockItems = [
      // Purchased catalog item 1 (valid purchased count + line total)
      { name: 'Item 1', quantity: 2, unitPrice: 128, total: 256, packSize: '50 kg', unit: null, isPurchased: true, confidence: 'high' },
      // Purchased catalog item 2 (valid purchased count + line total)
      { name: 'Item 2', quantity: 5, unitPrice: 189, total: 945, packSize: '25 kg', unit: null, isPurchased: true, confidence: 'high' },
      // Static catalog row (unpurchased, isPurchased = false)
      { name: '১০ পিছ পরোটা', quantity: null, unitPrice: null, total: null, packSize: '20 pcs', unit: null, isPurchased: false, confidence: 'low' },
      // Static catalog row (wrongly populated quantity without transaction values)
      { name: 'ফ্যামিলি পরোটা', quantity: null, unitPrice: null, total: null, packSize: '20', unit: null, isPurchased: false, confidence: 'low' },
      // Ordinary non-catalog receipt item (valid item)
      { name: 'Ordinary Receipt Item', quantity: 1, unitPrice: 100, total: 100, packSize: null, unit: 'pcs', isPurchased: true, confidence: 'high' },
    ];

    // Mirror Edge Function post-extraction filter contract
    const filtered = mockItems.filter((item: any) => {
      if (item.isPurchased === false) return false;
      const hasTransactionData = item.quantity != null || item.unitPrice != null || item.total != null;
      return hasTransactionData;
    });

    expect(filtered.length).toBe(3);
    expect(filtered.map(i => i.name)).toEqual(['Item 1', 'Item 2', 'Ordinary Receipt Item']);
    expect(filtered.find(i => i.name === '১০ পিছ পরোটা')).toBeUndefined();
    expect(filtered.find(i => i.name === 'ফ্যামিলি পরোটা')).toBeUndefined();
  });
});

describe('validateOcrResult', () => {
  it('adds a warning when item quantity * unitPrice does not equal total', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'INV001',
      invoiceTotal: '100',
      supplier: null,
      items: [
        { name: 'Test 1', quantity: 2, unitPrice: 20, total: 50 },
      ],
    };

    const validated = validateOcrResult(result);
    // 2 * 20 = 40, expected 50
    expect(validated.items[0].warnings?.length).toBeGreaterThan(0);
    expect(validated.items[0].warnings![0]).toMatch(/Quantity × unit price \(40\.00\) differs from extracted total \(50\.00\)/);
  });

  it('adds an invoice-level warning when subtotal - discount + tax differs from invoice total', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'INV002',
      invoiceTotal: '300.00',
      subtotal: 100, // Explicit wrong subtotal
      discount: 0,
      vat: 0,
      supplier: null,
      items: [
        { name: 'Item', quantity: 1, unitPrice: 100, total: 100 }
      ],
    };

    const validated = validateOcrResult(result);
    expect(validated.warnings?.length).toBeGreaterThan(0);
    expect(validated.warnings).toEqual(['Extracted subtotal (100.00) differs from invoice total (300.00).']);
  });

  it('emits one invoice warning when extracted line totals are compared with the invoice total', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'INV004', invoiceTotal: '3462', supplier: null,
      items: [
        { name: 'One', quantity: 10, unitPrice: 22, total: 220 },
        { name: 'Two', quantity: 10, unitPrice: 22, total: 220 },
        { name: 'Three', quantity: 10, unitPrice: 30, total: 300 },
        { name: 'Four', quantity: 10, unitPrice: 30, total: 300 },
        { name: 'Five', quantity: 10, unitPrice: 30, total: 300 },
        { name: 'Six', quantity: 10, unitPrice: 30, total: 300 },
        { name: 'Seven', quantity: 10, unitPrice: 26, total: 260 },
      ],
    };

    validateOcrResult(result);
    expect(result.warnings).toEqual([
      'Sum of extracted line totals (1900.00) differs from invoice total (3462.00).',
    ]);
  });

  it('allows items where quantities or totals are missing (null) rather than coercing to wrong math', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: null,
      invoiceTotal: null,
      supplier: null,
      items: [
        { name: 'Incomplete Item', quantity: undefined, unitPrice: 50, total: undefined },
      ],
    };

    const validated = validateOcrResult(result);
    expect(validated.items[0].warnings?.length).toBe(0);
    expect(validated.items[0].total).toBeUndefined(); // Remained undefined
  });

  it('validates the LS749 arithmetic without modifying extracted values', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'LS749', invoiceTotal: '3672', supplier: { id: '', name: 'Pusti' },
      items: [
        { name: 'Pusti Soyabean Oil', quantity: 24, unitPrice: 102, total: 2448 },
        { name: 'Atta', quantity: 24, unitPrice: 51, total: 1224 },
      ],
    };
    expect(validateOcrResult(result).warnings).toEqual([]);
    expect(result.items.map(({ quantity, unitPrice, total }) => [quantity, unitPrice, total])).toEqual([[24, 102, 2448], [24, 51, 1224]]);
  });

  it('warns when a line total is missing without manufacturing the extracted total', () => {
    const item = { name: 'Item', quantity: 2, unitPrice: 4 };
    const result: ReceiptOcrResult = { invoiceNumber: null, invoiceTotal: null, supplier: null, items: [item] };
    validateOcrResult(result);
    expect(item.total).toBeUndefined();
    expect(item.warnings?.[0]).toContain('Line total was not extracted');
  });

  it('warns when extracted line totals omit part of a separately extracted subtotal', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'LS749', invoiceTotal: '3672', subtotal: 3672, supplier: null,
      items: [{ name: 'Atta', quantity: 24, unitPrice: 51, total: 1224 }],
    };
    validateOcrResult(result);
    expect(result.warnings).not.toContain('Sum of extracted line totals (1224.00) differs from invoice total (3672.00).');
    expect(result.warnings).toContain('Sum of extracted line totals (1224.00) differs from extracted subtotal (3672.00).');
    expect(result.items[0].total).toBe(1224);
  });

  it('does not compare item totals directly with the adjusted invoice total', () => {
    const result: ReceiptOcrResult = {
      invoiceNumber: 'INV003', invoiceTotal: '95', subtotal: 100,
      discount: 10, vat: 5, supplier: null,
      items: [{ name: 'Item', quantity: 1, unitPrice: 100, total: 100 }],
    };
    expect(validateOcrResult(result).warnings).toEqual([]);
  });
});


vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({ data: { text: 'tesseract ok' } }),
    terminate: vi.fn().mockResolvedValue(undefined)
  })
}));
import * as tesseract from 'tesseract.js';


describe('scanReceiptImage Edge Function Fallback Security', () => {
  class TestURL extends URL {
    static createObjectURL = vi.fn(() => 'blob:receipt-test');
    static revokeObjectURL = vi.fn();
  }
  class TestImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onerror?.());
    }
  }
  vi.stubGlobal('URL', TestURL);
  vi.stubGlobal('Image', TestImage);
  const dummySuppliers = [{ id: 'sup1', name: 'TestSupplier' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a URL-backed PNG using the downloaded blob MIME type', async () => {
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    Object.defineProperty(pngBlob, 'arrayBuffer', { value: async () => new TextEncoder().encode('png').buffer });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'image/png' }, blob: async () => pngBlob })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { items: [] } }) });
    vi.stubGlobal('fetch', fetchSpy);

    await scanReceiptImage('https://images.example.test/receipt.png', [], undefined, 'token');

    expect(JSON.parse(fetchSpy.mock.calls[1][1].body).mimeType).toBe('image/png');
  });

  it('rejects an HTTP Supabase endpoint', () => {
    expect(() => getReceiptVisionEndpoint('http://test.supabase.co')).toThrow('requires an HTTPS URL');
  });

  it('rejects an invalid Supabase endpoint configuration', () => {
    expect(() => getReceiptVisionEndpoint(undefined)).toThrow('valid HTTPS URL');
  });

  const runWithMockFetch = async (status: number, ok: boolean, errorText = '') => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok,
      status,
      text: async () => errorText,
      json: async () => ({})
    });
    vi.stubGlobal('fetch', fetchSpy);

    // We mock tesseract worker recognition
    const createWorkerSpy = tesseract.createWorker as any;

    // Mock image blob
    const file = new File(['dummy content'], 'LS69-16-04-26-TestSupplier-9534BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('dummy content').buffer,
    });

    try {
      await scanReceiptImage(file, dummySuppliers, undefined, 'fake-token');
    } catch (e: any) {
      return { error: e, createWorkerSpy };
    }
    return { error: null, createWorkerSpy };
  };

  it('throws and does NOT fallback to Tesseract for 401 Unauthorized', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(401, false);
    expect(error).toBeDefined();
    expect(error.message).toContain('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('throws and does NOT fallback to Tesseract for 403 Forbidden', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(403, false);
    expect(error).toBeDefined();
    expect(error.message).toContain('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('throws and does NOT fallback to Tesseract for 413 Payload Too Large', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(413, false);
    expect(error).toBeDefined();
    expect(error.message).toContain('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('throws and does NOT fallback to Tesseract for 415 Invalid MIME', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(415, false, 'Invalid MIME');
    expect(error).toBeDefined();
    expect(error.message).toContain('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('does not use Tesseract when the authenticated session token is missing', async () => {
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const createWorkerSpy = tesseract.createWorker as any;
    await expect(scanReceiptImage(file, dummySuppliers)).rejects.toThrow('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('does not fall back when the provider reports invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'Vision provider authentication failed.', code: 'PROVIDER_AUTH_FAILED' }),
    }));
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });
    const createWorkerSpy = tesseract.createWorker as any;
    await expect(scanReceiptImage(file, dummySuppliers, undefined, 'token')).rejects.toThrow('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('does not fallback when the provider is unconfigured', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(501, false, 'provider unavailable');
    expect(error?.message).toContain('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('does not disguise exhausted provider credits as a successful Tesseract scan', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Vision provider credits are exhausted.', code: 'PROVIDER_CREDITS_EXHAUSTED' }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const file = new File(['receipt'], 'LS749-01-09-26-Pusti-3672BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });
    const createWorkerSpy = tesseract.createWorker as any;

    await expect(scanReceiptImage(file, [], undefined, 'token')).rejects.toThrow('NO_FALLBACK');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('treats provider rate limiting as a retryable visible error rather than Tesseract fallback', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Vision provider rate limit reached.', code: 'PROVIDER_RATE_LIMIT' }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });
    const createWorkerSpy = tesseract.createWorker as any;

    await expect(scanReceiptImage(file, [], undefined, 'token')).rejects.toThrow('rate limited');
    expect(createWorkerSpy).not.toHaveBeenCalled();
  });

  it('uses vision totals when present and flags material filename conflicts', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {
        invoiceNumber: '7463', invoiceDate: '2026-08-31', invoiceTotal: 9862, supplierName: 'Smart Corporation',
        reviewRequired: true,
        reviewReason: 'Catalog extraction reconciliation mismatch: line sum (1900) differs materially from invoice total (9862). Receipt text needs manual security review.',
        items: [{ name: 'Atta', quantity: 24, unitPrice: 51, total: 1224 }],
      } }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const suppliers = [{ id: 'pusti-id', name: 'Pusti' }];
    const file = new File(['receipt'], 'LS749-31-08-26-Pusti-3672BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });

    const result = await scanReceiptImage(file, suppliers, undefined, 'token');
    expect(result).toMatchObject({ invoiceNumber: 'LS749', invoiceTotal: '9862', supplier: suppliers[0] });
    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReason).toContain('Filename total (3672) differs from vision-read total (9862); the form uses the vision-read value');
    expect(result.reviewReason).not.toContain('Catalog extraction reconciliation mismatch');
    expect(result.reviewReason).toContain('Receipt text needs manual security review.');
    expect(result.fieldConflicts?.invoiceTotal).toEqual({
      filenameValue: '3672',
      visionValue: '9862',
      selectedSource: 'vision',
    });
    expect(result.fieldSources).toEqual({
      supplier: 'filename',
      invoiceNumber: 'filename',
      invoiceDate: 'vision',
      invoiceTotal: 'vision',
      items: 'vision',
    });
    expect(result.items[0].name).toBe('Atta');
  });

  it('preserves unmatched filename supplier text over a matched document issuer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {
        invoiceNumber: '7463', invoiceDate: '2026-08-31', invoiceTotal: 3672.12, supplierName: 'Smart Corporation',
        confidence: 'high', items: [],
      } }),
    }));
    const suppliers = [{ id: 'smart-id', name: 'Smart Corporation' }];
    const file = new File(['receipt'], 'LS749-31-08-26-Pusti-3672BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });
    const result = await scanReceiptImage(file, suppliers, undefined, 'token');
    expect(result.supplier).toEqual({ id: '', name: 'Pusti' });
    expect(result.invoiceNumber).toBe('LS749');
    expect(result.invoiceTotal).toBe('3672.12');
    expect(result.fieldConflicts?.invoiceTotal).toBeUndefined();
    expect(result.reviewReason).toBeUndefined();
  });

  it('falls back to Tesseract for 5xx Server Error', async () => {
    const { error, createWorkerSpy } = await runWithMockFetch(500, false);
    expect(error).toBeNull();
    expect(createWorkerSpy).toHaveBeenCalledOnce();
  });

  it('falls back to Tesseract for timeout/network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const createWorkerSpy = tesseract.createWorker as any;

    const file = new File(['dummy content'], 'LS69-16-04-26-TestSupplier-9534BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('dummy content').buffer,
    });
    const result = await scanReceiptImage(file, dummySuppliers, undefined, 'fake-token');

    expect(createWorkerSpy).toHaveBeenCalledOnce();
    expect(result.extractionMethod).toBe('tesseract');
  });

  it('normalizes a successful authenticated Vision response into reviewed receipt data', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          invoiceNumber: 'INV-42',
          invoiceDate: '2026-09-25',
          invoiceTotal: 120,
          supplierName: 'TestSupplier',
          confidence: 'high',
          items: [{ name: 'Cooking Oil', quantity: 2, unitPrice: 60, total: 120 }],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const file = new File(['synthetic receipt bytes'], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('synthetic receipt bytes').buffer,
    });

    const result = await scanReceiptImage(file, dummySuppliers, undefined, 'test-token');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
    expect(result).toMatchObject({
      invoiceNumber: 'INV-42',
      invoiceDate: '2026-09-25',
      invoiceTotal: '120',
      supplier: dummySuppliers[0],
      confidence: 'high',
      extractionMethod: 'vision',
      items: [{ name: 'Cooking Oil', quantity: 2, unitPrice: 60, total: 120 }],
    });
    expect(result.fieldSources).toEqual({
      supplier: 'vision',
      invoiceNumber: 'vision',
      invoiceDate: 'vision',
      invoiceTotal: 'vision',
      items: 'vision',
    });
  });
});

describe('TypeSafe AI Receipt & Product Candidate Primitives', () => {
  it('extractCandidateSpans extracts totals, dates, and invoice numbers from raw text', () => {
    const rawText = `
      Savoy Distributors
      Challan No: INV-9988
      Date: 2026-09-28
      Item 1: 5 x 100 = 500
      Grand Total: ৳ 500.00
    `;
    const spans = extractCandidateSpans(rawText);

    expect(spans.totals.length).toBeGreaterThan(0);
    expect(spans.totals[0].value).toBe(500);
    expect(spans.totals[0].confidence).toBe('high');

    expect(spans.dates.length).toBeGreaterThan(0);
    expect(spans.dates[0].value).toBe('2026-09-28');

    expect(spans.invoiceNumbers.length).toBeGreaterThan(0);
    expect(spans.invoiceNumbers[0].value).toBe('INV-9988');
  });

  it('selectBestFieldSpan picks top candidate or returns noneFits when under threshold', () => {
    const candidateSpans = extractCandidateSpans('Grand Total: ৳ 1250.00').totals;
    const selected = selectBestFieldSpan(candidateSpans, 0.5);

    expect(selected.noneFits).toBe(false);
    expect(selected.selected?.value).toBe(1250);

    const emptySelection = selectBestFieldSpan([], 0.5);
    expect(emptySelection.noneFits).toBe(true);
    expect(emptySelection.selected).toBeNull();
  });

  it('scoreProductMatch performs exact SKU/barcode/name matching and fuzzy matching', () => {
    const candidateItem = { id: 'p1', name: 'Fresh Milk 1L', barcode: '890123456789', sku: 'MILK-01' };

    // Exact Barcode
    expect(scoreProductMatch('890123456789', candidateItem)).toMatchObject({
      score: 1.0,
      confidence: 'high',
      isExact: true,
      noneFits: false,
    });

    // Exact Name
    expect(scoreProductMatch('Fresh Milk 1L', candidateItem)).toMatchObject({
      score: 0.95,
      confidence: 'high',
      isExact: true,
      noneFits: false,
    });

    // Partial/Fuzzy match
    const fuzzy = scoreProductMatch('Fresh Milk', candidateItem);
    expect(fuzzy.score).toBeGreaterThan(0.4);
    expect(fuzzy.noneFits).toBe(false);

    // Completely unrelated
    const unrelated = scoreProductMatch('Savoy Chocolate Ice Cream', candidateItem);
    expect(unrelated.noneFits).toBe(true);
  });

  it('reconcileOcrItemCandidates ranks candidates and handles fallback noneFits', () => {
    const catalog = [
      { id: 'p1', name: 'Aarong Liquid Milk 1L' },
      { id: 'p2', name: 'Pran Milk 500ml' },
    ];

    const matched = reconcileOcrItemCandidates('Aarong Milk 1L', catalog);
    expect(matched.topMatch?.id).toBe('p1');
    expect(matched.noneFits).toBe(false);

    const unmatched = reconcileOcrItemCandidates('Toyota Car Engine Oil', catalog);
    expect(unmatched.topMatch).toBeNull();
    expect(unmatched.noneFits).toBe(true);
  });
});
