import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReceiptInspectorPanel } from './ReceiptInspectorPanel';
import type { ReceiptOcrResult } from './receiptOcr';

const sampleResult: ReceiptOcrResult = {
  invoiceNumber: 'INV-101',
  invoiceTotal: '450',
  invoiceDate: '2026-10-19',
  supplier: { id: 'supp-1', name: 'Fresh Foods' },
  items: [{ name: 'Rice 5kg', quantity: 1, unitPrice: 450, total: 450 }],
  confidence: 'high',
  extractionMethod: 'vision',
  rawText: 'INV-101 Fresh Foods Rice 5kg 1 x 450 = 450',
};

describe('ReceiptInspectorPanel', () => {
  it('renders empty state when no receipt URL is provided', () => {
    render(<ReceiptInspectorPanel receiptUrl={null} />);
    expect(screen.getByText('No Receipt in Inspector')).toBeTruthy();
    expect(screen.getByText('Awaiting image')).toBeTruthy();
  });

  it('renders image, zoom controls, and JEV status when receiptUrl is provided', () => {
    const onRemove = vi.fn();
    render(
      <ReceiptInspectorPanel
        receiptUrl="blob:receipt-inspector-test"
        ocrResult={sampleResult}
        onRemoveReceipt={onRemove}
      />
    );

    const img = screen.getByAltText('Receipt high resolution preview') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('blob:receipt-inspector-test');
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText(/JEV:/)).toBeTruthy();
    expect(screen.getByText(/450/)).toBeTruthy();
  });

  it('zooms in and zooms out correctly', () => {
    render(<ReceiptInspectorPanel receiptUrl="blob:receipt-inspector-test" />);
    const zoomInBtn = screen.getByLabelText('Zoom in');
    const zoomOutBtn = screen.getByLabelText('Zoom out');

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeTruthy();

    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('toggles raw OCR text drawer when button clicked', () => {
    render(
      <ReceiptInspectorPanel
        receiptUrl="blob:receipt-inspector-test"
        ocrResult={sampleResult}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /View Text/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Extracted Raw OCR Text/i)).toBeTruthy();
    expect(screen.getByText(/INV-101 Fresh Foods/i)).toBeTruthy();
  });

  it('invokes onClose and onRemoveReceipt callbacks', () => {
    const onClose = vi.fn();
    const onRemove = vi.fn();
    render(
      <ReceiptInspectorPanel
        receiptUrl="blob:receipt-inspector-test"
        onClose={onClose}
        onRemoveReceipt={onRemove}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Remove receipt'));
    expect(onRemove).toHaveBeenCalled();
  });
});
