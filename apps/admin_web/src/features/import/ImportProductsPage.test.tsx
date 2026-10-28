import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), notify: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-session-token' } }, error: null }) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) })),
  },
}));
vi.mock('../../lib/AuthContext', () => ({ useAuth: () => ({ storeId: 'store-1' }) }));
vi.mock('@/components', () => ({ useNotify: () => ({ notify: mocks.notify }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn(() => ''),
    parse: vi.fn((_file: File, config: { complete: (result: unknown) => void }) => config.complete({
      data: [{
        'Product Name': 'Synthetic Image Pipeline Test Item',
        Brand: 'Ispahani',
        'Sales Price (৳)': '',
        'Purchase Price (৳)': '',
        'MRP (৳)': 109.25,
        'Item Code (SKU)': 'CODX-IMG-PILOT-20261029',
        Barcode: '',
        'Image URL': '',
        Category: '',
        Active: false,
      }],
      errors: [],
    })),
  },
}));

import { ImportProductsPage } from './ImportProductsPage';

const imageBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

function response(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => data };
}

async function loadSampleAndContinue() {
  render(<ImportProductsPage />);
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [new File(['csv'], 'products.csv', { type: 'text/csv' })] } });
  await screen.findByText('1 Records');
  fireEvent.click(screen.getByRole('button', { name: /Verify & Continue/i }));
  await screen.findByText('Ready to Preview');
}

describe('ImportProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
  });

  it('previews a WebP attachment without uploading or applying until the exact preview is approved', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response({
        batch_id: 'image-pilot-1',
        preview_hash: 'preview-hash-1',
        counts: { create: 1, update: 0, unchanged: 0, ambiguous: 0, invalid: 0 },
        rows: [{ source_row: 2, outcome: 'create', field_diffs: {}, warnings: ['Image attachment validated in memory; preview does not upload image bytes'], errors: [] }],
      }))
      .mockResolvedValueOnce(response({
        batch_id: 'image-pilot-1',
        preview_hash: 'preview-hash-1',
        counts: { create: 1, update: 0, unchanged: 0, ambiguous: 0, invalid: 0 },
        rows: [{ source_row: 2, outcome: 'create', field_diffs: {}, warnings: [], errors: [] }],
      }));

    await loadSampleAndContinue();
    const image = new File([imageBytes], 'synthetic-test.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('WebP image for row 1'), { target: { files: [image] } });
    fireEvent.click(screen.getByRole('button', { name: /Review Batch/i }));

    await screen.findByText('Batch ID: image-pilot-1');
    expect(screen.getByText(/Target: Supabase project/)).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const previewRequest = mocks.fetch.mock.calls[0][1] as RequestInit;
    const previewForm = previewRequest.body as FormData;
    expect(previewForm.get('operation')).toBe('preview');
    expect(previewForm.get('approved_preview_hash')).toBeNull();
    expect(previewForm.get('image_2')).toBeInstanceOf(File);
    expect((previewForm.get('image_2') as File).name).toBe('synthetic-test.webp');
    const batch = JSON.parse(String(previewForm.get('batch')));
    expect(batch.rows[0]).toMatchObject({
      source_row: 2,
      product: { sku: 'CODX-IMG-PILOT-20261029', name: 'Synthetic Image Pipeline Test Item', brand: 'Ispahani', mrp: 109.25, is_active: false },
      stock: { mode: 'none' },
    });
    expect(batch.rows[0].product).not.toHaveProperty('price');
    expect(batch.rows[0].product).not.toHaveProperty('cost');
    expect(screen.getByRole('button', { name: /Apply Reviewed Batch/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed this exact preview/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apply Reviewed Batch/i }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    const applyForm = mocks.fetch.mock.calls[1][1].body as FormData;
    expect(applyForm.get('operation')).toBe('apply');
    expect(applyForm.get('approved_preview_hash')).toBe('preview-hash-1');
    expect(applyForm.get('idempotency_key')).toBeTruthy();
    expect(applyForm.get('image_2')).toBeInstanceOf(File);
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining('Successfully processed 1'), 'success');
  });

  it('does not offer Apply when the server preview contains invalid or ambiguous rows', async () => {
    mocks.fetch.mockResolvedValueOnce(response({
      batch_id: 'image-pilot-invalid',
      preview_hash: 'preview-hash-invalid',
      counts: { create: 0, update: 0, unchanged: 0, ambiguous: 1, invalid: 0 },
      rows: [{ source_row: 2, outcome: 'ambiguous', field_diffs: {}, warnings: [], errors: ['Duplicate SKU'] }],
    }));

    await loadSampleAndContinue();
    fireEvent.click(screen.getByRole('button', { name: /Review Batch/i }));

    await screen.findByText('Batch ID: image-pilot-invalid');
    expect(screen.getByRole('button', { name: /Apply Reviewed Batch/i })).toBeDisabled();
    expect(screen.getByText('Duplicate SKU')).toBeInTheDocument();
  });

  it('discards the prior preview and approval when returning to adjust data', async () => {
    const preview = (batchId: string) => response({
      batch_id: batchId,
      preview_hash: `${batchId}-hash`,
      counts: { create: 1, update: 0, unchanged: 0, ambiguous: 0, invalid: 0 },
      rows: [{ source_row: 2, outcome: 'create', field_diffs: {}, warnings: [], errors: [] }],
    });
    mocks.fetch.mockResolvedValueOnce(preview('first-preview')).mockResolvedValueOnce(preview('fresh-preview'));

    await loadSampleAndContinue();
    const image = new File([imageBytes], 'synthetic-test.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('WebP image for row 1'), { target: { files: [image] } });
    fireEvent.click(screen.getByRole('button', { name: /Review Batch/i }));
    await screen.findByText('Batch ID: first-preview');
    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed this exact preview/i }));

    fireEvent.click(screen.getByRole('button', { name: /Adjust Data/i }));
    await screen.findByRole('button', { name: /Verify & Continue/i });
    expect(screen.queryByRole('checkbox', { name: /I reviewed this exact preview/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue/i }));
    await screen.findByRole('button', { name: /Review Batch/i });
    fireEvent.click(screen.getByRole('button', { name: /Review Batch/i }));
    await screen.findByText('Batch ID: fresh-preview');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /Apply Reviewed Batch/i })).toBeDisabled();
  });

  it('shows row-level server errors and clears them when reopening the data review', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response({
        batch_id: 'image-pilot-error',
        preview_hash: 'preview-hash-error',
        counts: { create: 1, update: 0, unchanged: 0, ambiguous: 0, invalid: 0 },
        rows: [{ source_row: 2, outcome: 'create', field_diffs: {}, warnings: [], errors: [] }],
      }))
      .mockResolvedValueOnce(response({
        batch_id: 'image-pilot-error',
        preview_hash: 'preview-hash-error',
        counts: { create: 0, update: 0, unchanged: 0, ambiguous: 0, invalid: 1 },
        rows: [{ source_row: 2, outcome: 'invalid', field_diffs: {}, warnings: [], errors: ['IMAGE_VERSION_CONFLICT'] }],
      }));

    await loadSampleAndContinue();
    const image = new File([imageBytes], 'synthetic-test.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('WebP image for row 1'), { target: { files: [image] } });
    fireEvent.click(screen.getByRole('button', { name: /Review Batch/i }));
    await screen.findByText('Batch ID: image-pilot-error');
    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed this exact preview/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apply Reviewed Batch/i }));

    await screen.findByText(/row 2: IMAGE_VERSION_CONFLICT/);
    fireEvent.click(screen.getByRole('button', { name: /Adjust Data/i }));
    await waitFor(() => expect(screen.queryByText(/row 2: IMAGE_VERSION_CONFLICT/)).not.toBeInTheDocument());
  });
});
