import { describe, expect, it } from 'vitest';
import { parseReceiptFilename, scanReceiptImage, validateOcrResult, type ReceiptOcrResult } from './receiptOcr';

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
    expect(validated.warnings![0]).toMatch(/Extracted lines total \(100.00\) - discount \+ tax differs from invoice total \(300.00\)/);
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
    expect(result.warnings).toContain('Sum of extracted line totals (1224.00) differs from invoice total (3672.00).');
    expect(result.warnings).toContain('Sum of extracted line totals (1224.00) differs from extracted subtotal (3672.00).');
    expect(result.items[0].total).toBe(1224);
  });
});


import { vi } from 'vitest';
import { scanReceiptImage } from './receiptOcr';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({ data: { text: 'tesseract ok' } }),
    terminate: vi.fn().mockResolvedValue(undefined)
  })
}));
import * as tesseract from 'tesseract.js';


// Mock Vite env vars
vi.stubGlobal('import', { meta: { env: { BASE_URL: '/', VITE_SUPABASE_URL: 'http://test' } } });

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

  it('keeps filename business supplier, reference, and total authoritative over document extraction', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {
        invoiceNumber: '7463', invoiceDate: '2026-08-31', invoiceTotal: 3672, supplierName: 'Smart Corporation',
        items: [{ name: 'Atta', quantity: 24, unitPrice: 51, total: 1224 }],
      } }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const suppliers = [{ id: 'pusti-id', name: 'Pusti' }];
    const file = new File(['receipt'], 'LS749-31-08-26-Pusti-3672BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });

    const result = await scanReceiptImage(file, suppliers, undefined, 'token');
    expect(result).toMatchObject({ invoiceNumber: 'LS749', invoiceTotal: '3672', supplier: suppliers[0] });
    expect(result.items[0].name).toBe('Atta');
  });

  it('preserves unmatched filename supplier text over a matched document issuer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {
        invoiceNumber: '7463', invoiceDate: '2026-08-31', invoiceTotal: 3672, supplierName: 'Smart Corporation',
        confidence: 'high', items: [],
      } }),
    }));
    const suppliers = [{ id: 'smart-id', name: 'Smart Corporation' }];
    const file = new File(['receipt'], 'LS749-31-08-26-Pusti-3672BDT.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('receipt').buffer });
    const result = await scanReceiptImage(file, suppliers, undefined, 'token');
    expect(result.supplier).toEqual({ id: '', name: 'Pusti' });
    expect(result.invoiceNumber).toBe('LS749');
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
  });
});
