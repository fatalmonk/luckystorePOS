import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCachedCategoriesOrThrow } = vi.hoisted(() => ({
  getCachedCategoriesOrThrow: vi.fn(),
}));

vi.mock('../../lib/products/getCachedCategories', () => ({
  getCachedCategoriesOrThrow,
}));

import { GET } from './route';

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached categories', async () => {
    getCachedCategoriesOrThrow.mockResolvedValue([{ id: 'cat-1', name: 'Tea & Coffee' }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      categories: [{ id: 'cat-1', name: 'Tea & Coffee' }],
    });
  });

  it('keeps the existing error response when the catalogue read fails', async () => {
    getCachedCategoriesOrThrow.mockRejectedValue(new Error('catalogue unavailable'));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'catalogue unavailable' });
  });
});
