import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('keeps flagged scan values editable while clearly requiring review before posting', async () => {
    const flaggedResult = {
      ...result,
      reviewRequired: true,
      reviewReason: '',
    };
    scanReceiptImageMock.mockResolvedValueOnce(flaggedResult);
    const onApply = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} />);
    const file = new File(['synthetic receipt bytes'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(fileInput!, { target: { files: [file] } });

    expect(await screen.findByText('Manual review required')).toBeTruthy();
    expect(screen.getByText('Verify all extracted values against the receipt before posting. Applying this scan only fills the editable form.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(flaggedResult);
  });

  it('applies the vision-selected total when the filename disagrees', async () => {
    const selectedResult: ReceiptOcrResult = {
      ...result,
      invoiceTotal: '120',
      fieldSources: { invoiceTotal: 'vision' },
      fieldConflicts: { invoiceTotal: { filenameValue: '200', visionValue: '120', selectedSource: 'vision' } },
    };
    scanReceiptImageMock.mockResolvedValueOnce(selectedResult);
    const onApply = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput!, { target: { files: [new File(['receipt'], 'INV42-25-09-2026-Test Supplier-200BDT.jpg', { type: 'image/jpeg' })] } });

    expect(await screen.findByText(/৳ 120/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(selectedResult);
  });

  it('starts a scan identity for pasted filename metadata', () => {
    const onApply = vi.fn();
    const onScanStart = vi.fn();
    render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} onScanStart={onScanStart} />);
    const title = screen.getByPlaceholderText(/Or paste receipt title/);
    fireEvent.change(title, { target: { value: 'INV42-25-09-2026-Test Supplier-200BDT' } });
    expect(onScanStart).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ invoiceTotal: '200', extractionMethod: 'filename' }));
  });

  it('does not let an older image scan replace pasted filename metadata', async () => {
    let finishScan!: (value: ReceiptOcrResult) => void;
    scanReceiptImageMock.mockReturnValueOnce(new Promise<ReceiptOcrResult>(resolve => { finishScan = resolve; }));
    const onApply = vi.fn();
    const onScanStart = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} onScanStart={onScanStart} />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput!, { target: { files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })] } });
    expect(scanReceiptImageMock).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/Or paste receipt title/), {
      target: { value: 'INV42-25-09-2026-Test Supplier-200BDT' },
    });
    await act(async () => { finishScan(result); });
    expect(screen.getByRole('button', { name: 'Upload Receipt' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ invoiceTotal: '200', extractionMethod: 'filename', items: [] }));
  });

  it('keeps completed OCR items and review warnings when filename metadata is edited', async () => {
    const flaggedResult: ReceiptOcrResult = {
      ...result,
      reviewRequired: true,
      reviewReason: 'Verify the handwritten amount.',
      fieldSources: { items: 'vision', invoiceTotal: 'vision' },
    };
    scanReceiptImageMock.mockResolvedValueOnce(flaggedResult);
    const onApply = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput!, { target: { files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText('Cooking Oil')).toBeTruthy();
    expect(screen.getByText('Manual review required')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Or paste receipt title/), {
      target: { value: 'INV42-25-09-2026-Test Supplier-200BDT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      invoiceTotal: '200',
      items: flaggedResult.items,
      reviewRequired: true,
      reviewReason: 'Verify the handwritten amount. Filename total (200) differs from vision-read total (120); the form uses the filename value. Verify both against the receipt.',
      fieldSources: expect.objectContaining({ items: 'vision', invoiceTotal: 'filename' }),
    }));
  });

  it('recomputes the filename-versus-vision total conflict after editing the filename', async () => {
    const conflictedResult: ReceiptOcrResult = {
      ...result,
      invoiceTotal: '100',
      reviewRequired: true,
      reviewReason: 'Filename total (100) differs from vision-read total (120); the form uses the vision-read value. Verify both against the receipt.',
      fieldSources: { invoiceTotal: 'vision' },
      fieldConflicts: {
        invoiceTotal: { filenameValue: '100', visionValue: '120', selectedSource: 'vision' },
      },
    };
    scanReceiptImageMock.mockResolvedValueOnce(conflictedResult);
    const onApply = vi.fn();
    const { container } = render(<ReceiptScanPanel suppliers={suppliers} onApply={onApply} />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput!, { target: { files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText(/Filename total \(100\)/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Or paste receipt title/), {
      target: { value: 'INV42-25-09-2026-Test Supplier-200BDT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      invoiceTotal: '200',
      reviewReason: 'Filename total (200) differs from vision-read total (120); the form uses the filename value. Verify both against the receipt.',
      fieldConflicts: { invoiceTotal: { filenameValue: '200', visionValue: '120', selectedSource: 'filename' } },
    }));
  });
});
