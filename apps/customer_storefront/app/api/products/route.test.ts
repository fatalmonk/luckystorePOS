import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  getById: vi.fn(),
  createRepository: vi.fn(() => ({ repo: { search: mocks.search, getById: mocks.getById } })),
  createAnonymousRepository: vi.fn(() => ({ repo: { search: mocks.search, getById: mocks.getById } })),
  snapshot: [{
    id: 'snapshot-product-id',
    name: 'Snapshot Product',
    price: 100,
    unit: '1 item',
    category: 'Groceries',
    brand: 'Lucky Store',
    stock: 0,
    availabilityUnknown: true,
    description: '',
  }],
}));

vi.mock('../../lib/products/index', () => ({
  createProductRepository: mocks.createRepository,
  createAnonymousStorefrontProductRepository: mocks.createAnonymousRepository,
  createProductId: vi.fn((id: string) => id),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/products/getHomePageData', () => ({ CATALOG_SNAPSHOT_PRODUCTS: mocks.snapshot }));
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

  it('returns explicitly degraded browse-only products when live search rejects', async () => {
    mocks.search.mockRejectedValueOnce(new Error('catalog unavailable'));

    const response = await GET(new NextRequest('https://store.test/api/products'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ degraded: true, catalogSnapshotFallback: true });
    expect(body.products[0]).toMatchObject({ stock: 0, availabilityUnknown: true });
  });

  it('returns a degraded snapshot product when its live lookup rejects', async () => {
    mocks.getById.mockRejectedValueOnce(new Error('catalog unavailable'));

    const response = await GET(new NextRequest('https://store.test/api/products?id=snapshot-product-id'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      degraded: true,
      catalogSnapshotFallback: true,
      stock: 0,
      availabilityUnknown: true,
    });
  });

  it('keeps unknown product IDs unavailable when the live lookup rejects', async () => {
    mocks.getById.mockRejectedValueOnce(new Error('catalog unavailable'));

    const response = await GET(new NextRequest('https://store.test/api/products?id=not-in-snapshot'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'catalog unavailable' });
  });

  it('bypasses the shared product cache for explicit fresh ID lookups', async () => {
    mocks.getById.mockResolvedValueOnce({
      id: 'live-product-id', name: 'Live Product', price: 125, stock: 4,
    });

    const response = await GET(new NextRequest('https://store.test/api/products?id=live-product-id&fresh=1'));

    expect(response.status).toBe(200);
    expect(mocks.createAnonymousRepository).toHaveBeenCalledWith({ enableCache: false });
  });
});
