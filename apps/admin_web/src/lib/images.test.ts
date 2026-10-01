import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteFromR2: vi.fn(),
  isR2Configured: vi.fn(() => true),
  remove: vi.fn(async () => ({ error: null })),
}));

vi.mock('./r2', () => ({
  deleteFromR2: mocks.deleteFromR2,
  isR2Configured: mocks.isR2Configured,
  uploadToR2: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        remove: mocks.remove,
      })),
    },
  },
}));

import { deleteReceiptImage } from './images';

describe('deleteReceiptImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isR2Configured.mockReturnValue(true);
    mocks.deleteFromR2.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue({ error: null });
  });

  it('deletes an R2 receipt through the Vite-aware R2 client', async () => {
    await deleteReceiptImage('tenant/receipt.webp');

    expect(mocks.deleteFromR2).toHaveBeenCalledWith('tenant/receipt.webp');
    expect(mocks.remove).toHaveBeenCalledWith(['tenant/receipt.webp']);
  });

  it('still attempts Supabase cleanup when R2 deletion fails', async () => {
    mocks.deleteFromR2.mockRejectedValueOnce(new Error('R2 unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await deleteReceiptImage('tenant/stale.webp');

    expect(mocks.remove).toHaveBeenCalledWith(['tenant/stale.webp']);
    warn.mockRestore();
  });
});
