import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  getById: vi.fn(),
}));

vi.mock('../../lib/products/index', () => ({
  createProductRepository: vi.fn(() => ({ repo: { search: mocks.search, getById: mocks.getById } })),
  createProductId: vi.fn((id: string) => id),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/products/slugify', () => ({
  toProductSlug: vi.fn((name: string, id: string) => `${name.toLowerCase()}--${id.replace(/-/g, '').slice(0, 8)}`),
}));

import { GET } from './route';

describe('GET /api/products pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockResolvedValue({ products: [], hasMore: false });
  });

  it('forwards the exact requested offset instead of rounding to a page boundary', async () => {
    const response = await GET(new NextRequest('https://store.test/api/products?limit=100&offset=250'));

    expect(response.status).toBe(200);
    expect(mocks.search).toHaveBeenCalledWith({ query: undefined, page: 2, limit: 100, offset: 250 });
    await expect(response.json()).resolves.toMatchObject({ offset: 250, limit: 100, hasMore: false });
  });

  it.each(['-1', '1.5', '100001', 'not-a-number'])(
    'rejects invalid offset %s before querying the catalogue',
    async (offset) => {
      const response = await GET(new NextRequest(`https://store.test/api/products?offset=${offset}`));

      expect(response.status).toBe(400);
      expect(mocks.search).not.toHaveBeenCalled();
    },
  );

  it.each(['0', '1.5', 'not-a-number'])(
    'rejects invalid limit %s before querying the catalogue',
    async (limit) => {
      const response = await GET(new NextRequest(`https://store.test/api/products?limit=${limit}`));

      expect(response.status).toBe(400);
      expect(mocks.search).not.toHaveBeenCalled();
    },
  );

  it('caps oversized page limits at the existing maximum', async () => {
    const response = await GET(new NextRequest('https://store.test/api/products?limit=500&offset=200'));

    expect(response.status).toBe(200);
    expect(mocks.search).toHaveBeenCalledWith({ query: undefined, page: 2, limit: 100, offset: 200 });
    await expect(response.json()).resolves.toMatchObject({ offset: 200, limit: 100 });
  });
});
