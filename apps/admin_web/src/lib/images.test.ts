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

  it('defers R2 receipt deletion to server-side retention cleanup', async () => {
    await deleteReceiptImage('tenant/receipt.webp');

    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith(['tenant/receipt.webp']);
  });

  it('still attempts Supabase cleanup while R2 retention is enabled', async () => {
    await deleteReceiptImage('tenant/stale.webp');

    expect(mocks.remove).toHaveBeenCalledWith(['tenant/stale.webp']);
  });
});
