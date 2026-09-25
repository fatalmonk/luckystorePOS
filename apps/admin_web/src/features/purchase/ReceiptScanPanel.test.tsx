import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReceiptScanPanel } from './ReceiptScanPanel';
import type { ReceiptOcrResult } from './receiptOcr';

const { scanReceiptImageMock } = vi.hoisted(() => ({
  scanReceiptImageMock: vi.fn(),
}));

vi.mock('../../lib/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'test-session-token' } }),
}));

vi.mock('./receiptOcr', async importOriginal => {
  const actual = await importOriginal<typeof import('./receiptOcr')>();
  return { ...actual, scanReceiptImage: scanReceiptImageMock };
});

const suppliers = [{ id: 'supplier-1', name: 'Test Supplier' }];
const result: ReceiptOcrResult = {
  invoiceNumber: 'INV-42',
  invoiceTotal: '120',
  invoiceDate: '2026-09-25',
  supplier: suppliers[0],
  items: [{ name: 'Cooking Oil', quantity: 2, unitPrice: 60, total: 120 }],
  warnings: ['Check extracted totals'],
  confidence: 'high',
  extractionMethod: 'vision',
  rawText: 'INV-42 Cooking Oil 2 x 60 = 120',
};

class TestURL extends URL {
  static createObjectURL = vi.fn(() => 'blob:receipt-panel-test');
  static revokeObjectURL = vi.fn();
}

describe('ReceiptScanPanel OCR flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', TestURL);
    scanReceiptImageMock.mockResolvedValue(result);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('scans an uploaded image with the session token and applies the reviewed result', async () => {
    const onApply = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} />);
    const file = new File(['synthetic receipt bytes'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');

    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file] } });

    expect(await screen.findByText('INV-42')).toBeTruthy();
    expect(screen.getByText('Cooking Oil')).toBeTruthy();
    expect(scanReceiptImageMock).toHaveBeenCalledWith(
      file,
      suppliers,
      expect.any(Function),
      'test-session-token',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(result);
  });
});
